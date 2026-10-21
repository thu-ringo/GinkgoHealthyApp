import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { HttpException } from "@nestjs/common";
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import jwt from "jsonwebtoken";
import { db, sql } from "./db";
export const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export const otpHash = (phone: string, purpose: string, code: string) =>
  createHmac("sha256", process.env.OTP_PEPPER!)
    .update(`${phone}:${purpose}:${code}`)
    .digest("hex");
export const token = () => randomBytes(48).toString("base64url");
export const randomOtp = () => String(randomInt(100000, 1000000));
export async function limit(key: string, max: number, seconds: number) {
  // Keep repeated/concurrent integration runs independent without changing production thresholds.
  if (process.env.NODE_ENV === "test" && process.env.TEST_RUN_ID)
    key = `${process.env.TEST_RUN_ID}:${key}`;
  const r = await db.transaction(async (m) => {
    await m.query(
      `INSERT INTO rate_limits(rate_key,count,expires_at) VALUES(?,1,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE count=IF(expires_at<=UTC_TIMESTAMP(3),1,count+1),expires_at=IF(expires_at<=UTC_TIMESTAMP(3),VALUES(expires_at),expires_at)`,
      [key, seconds],
    );
    const [row] = await m.query(
      "SELECT count FROM rate_limits WHERE rate_key=?",
      [key],
    );
    return row;
  });
  if (r.count > max)
    throw new HttpException("Thao tác quá nhanh. Vui lòng thử lại sau.", 429);
}
export function access(userId: string, sid: string) {
  return jwt.sign({ sub: userId, sid }, process.env.JWT_SECRET!, {
    expiresIn: "10m",
    issuer: "healthycheck",
    audience: "healthycheck-mobile",
  });
}
export async function authenticate(t: string) {
  try {
    const p = jwt.verify(t, process.env.JWT_SECRET!, {
      issuer: "healthycheck",
      audience: "healthycheck-mobile",
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
    const [s] = await sql(
      "SELECT id,user_id FROM sessions WHERE id=? AND user_id=? AND revoked=false AND expires_at>UTC_TIMESTAMP(3)",
      [p.sid, p.sub],
    );
    if (!s) throw new Error();
    return { id: s.user_id, sid: s.id, expiresAt: Number(p.exp) * 1000 };
  } catch {
    throw new UnauthorizedException("Phiên đăng nhập đã hết hạn");
  }
}
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.user = await authenticate(
      (req.headers.authorization || "").replace(/^Bearer /, ""),
    );
    await limit(`api:${req.user.id}`, 240, 60);
    return true;
  }
}
