import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { authenticate, limit } from "./security";
export const events = {
  server: null as Server | null,
  emit(userId: string, topic: string) {
    this.server?.to(`user:${userId}`).emit("changed", { topic });
  },
  disconnect(userId: string, sid?: string) {
    this.server
      ?.in(sid ? `session:${sid}` : `user:${userId}`)
      .disconnectSockets(true);
  },
};
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS || "http://localhost:8081").split(","),
  },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  afterInit() {
    events.server = this.server;
  }
  async handleConnection(socket: Socket) {
    try {
      await limit(`socket:${socket.handshake.address}`, 30, 60);
      const u = await authenticate(socket.handshake.auth?.token || "");
      if (!socket.connected) return;
      socket.data.user = u;
      await socket.join([`user:${u.id}`, `session:${u.sid}`]);
      socket.emit("ready");
      // Refetch again after authenticated room join, closing the connect/fetch/join race on reconnect.
      socket.emit("changed", { topic: "sync" });
      const timer = setTimeout(
        () => socket.disconnect(true),
        Math.max(0, u.expiresAt - Date.now()),
      );
      socket.once("disconnect", () => clearTimeout(timer));
    } catch {
      socket.disconnect(true);
    }
  }
}
