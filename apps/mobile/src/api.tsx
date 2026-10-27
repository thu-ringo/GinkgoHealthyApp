import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { QueryClient, focusManager } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { clearReminders } from "./notifications";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000, gcTime: 300000 },
    mutations: { retry: false },
  },
});
const configuredApi = process.env.EXPO_PUBLIC_API_URL?.trim();
const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
const inferredApi =
  Platform.OS === "web"
    ? "http://localhost:3000"
    : expoHost && expoHost !== "localhost" && expoHost !== "127.0.0.1"
      ? `http://${expoHost}:3000`
      : "";
export const API = configuredApi || inferredApi;
let access = "",
  refresh = "",
  socket: Socket | undefined,
  refreshing: Promise<void> | null = null,
  epoch = 0;
let expired = () => {};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public issues?: any[],
  ) {
    super(message);
  }
}
async function store() {
  if (Platform.OS !== "web")
    await SecureStore.setItemAsync(
      "healthycheck.session",
      JSON.stringify({ accessToken: access, refreshToken: refresh }),
    );
}
export async function clearSession() {
  epoch++;
  access = "";
  refresh = "";
  refreshing = null;
  socket?.disconnect();
  await queryClient.cancelQueries();
  queryClient.clear();
  await clearReminders();
  if (Platform.OS !== "web")
    await SecureStore.deleteItemAsync("healthycheck.session");
}
async function rotate() {
  if (!refresh) throw new ApiError("Hãy đăng nhập lại", 401);
  const generation = epoch;
  const r = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok)
    throw new ApiError(
      r.status === 401
        ? "Phiên đã hết hạn"
        : "Không thể làm mới phiên. Hãy thử lại khi có mạng.",
      r.status,
    );
  const t = await r.json();
  if (generation !== epoch) throw new ApiError("Phiên đã thay đổi", 401);
  access = t.accessToken;
  refresh = t.refreshToken;
  await store();
  socket?.disconnect();
  connectSocket();
}
function rotateOnce() {
  if (!refreshing) {
    const work = rotate();
    refreshing = work;
    void work
      .finally(() => {
        if (refreshing === work) refreshing = null;
      })
      .catch(() => {});
  }
  return refreshing;
}
export async function api<T = any>(
  path: string,
  options: {
    method?: string;
    body?: any;
    signal?: AbortSignal;
    public?: boolean;
  } = {},
): Promise<T> {
  if (!API)
    throw new ApiError(
      "Chưa xác định được địa chỉ API. Hãy cấu hình EXPO_PUBLIC_API_URL cho thiết bị này.",
      0,
    );
  const generation = epoch;
  const request = () =>
    fetch(`${API}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(!options.public && access
          ? { Authorization: `Bearer ${access}` }
          : {}),
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
      signal: options.signal || AbortSignal.timeout(45000),
    });
  let r: Response;
  try {
    r = await request();
    if (r.status === 401 && !options.public && refresh) {
      try {
        await rotateOnce();
      } catch (e) {
        if (generation === epoch && e instanceof ApiError && e.status === 401) {
          await clearSession();
          expired();
        }
        throw e;
      }
      r = await request();
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      "Không kết nối được máy chủ. Kiểm tra mạng và thử lại.",
      0,
    );
  }
  if (!options.public && generation !== epoch)
    throw new ApiError("Phiên đã thay đổi", 401);
  const data = await r
    .json()
    .catch(() => ({ message: "Phản hồi không hợp lệ" }));
  if (!r.ok)
    throw new ApiError(
      data.issues?.length
        ? data.issues.map((i: any) => i.message).join("\n")
        : data.message || "Có lỗi xảy ra",
      r.status,
      data.issues,
    );
  return data;
}
function connectSocket() {
  if (!API) return;
  const connectionEpoch = epoch;
  socket = io(API, {
    auth: { token: access },
    transports: ["websocket"],
    reconnection: true,
  });
  socket.on("changed", () => {
    void queryClient.invalidateQueries();
  });
  socket.on("connect", () => {
    void queryClient.invalidateQueries();
  });
  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect" && refresh) {
      void rotateOnce().catch(async (e) => {
        if (
          connectionEpoch === epoch &&
          e instanceof ApiError &&
          e.status === 401
        ) {
          await clearSession();
          expired();
        }
      });
    }
  });
}
const AuthContext = createContext({
  signedIn: false,
  ready: false,
  login: async (_: any) => {},
  logout: async () => {},
  forget: async () => {},
});
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [signedIn, setSignedIn] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    expired = () => setSignedIn(false);
    let mounted = true;
    (async () => {
      try {
        const raw =
          Platform.OS === "web"
            ? null
            : await SecureStore.getItemAsync("healthycheck.session");
        if (raw) {
          const t = JSON.parse(raw);
          access = t.accessToken;
          refresh = t.refreshToken;
          await api("/me");
          if (mounted) {
            setSignedIn(true);
            connectSocket();
          }
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await clearSession();
        else if (refresh && mounted) {
          setSignedIn(true);
          connectSocket();
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();
    const sub = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
      if (state === "active" && access) void queryClient.invalidateQueries();
    });
    return () => {
      mounted = false;
      sub.remove();
      socket?.disconnect();
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{
        signedIn,
        ready,
        login: async (t) => {
          await clearSession();
          access = t.accessToken;
          refresh = t.refreshToken;
          await store();
          setSignedIn(true);
          connectSocket();
        },
        logout: async () => {
          await api("/auth/logout", { method: "POST" });
          await clearSession();
          setSignedIn(false);
        },
        forget: async () => {
          await clearSession();
          setSignedIn(false);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
export async function changed() {
  await queryClient.invalidateQueries();
}
