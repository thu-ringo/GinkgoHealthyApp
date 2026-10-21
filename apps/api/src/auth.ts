import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  Get,
  Delete,
  Param,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { z } from "zod";
import * as argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { db, sql } from "./db";
import {
  access,
  AuthGuard,
  hash,
  limit,
  otpHash,
  randomOtp,
  token,
} from "./security";
import {
  authSchema,
  otpRequest,
  otpVerify,
  password,
  parse,
  uuid,
} from "./schemas";
import { sms } from "./sms";
import { events } from "./realtime";
export async function revoke(userId: string, sid?: string) {
  await sql(
    `UPDATE sessions SET revoked=true WHERE user_id=? ${sid ? "AND id=?" : ""}`,
    sid ? [userId, sid] : [userId],
  );
  events.disconnect(userId, sid);
}
async function verifyOtp(phone: string, purpose: string, code: string) {
  const ok = await db.transaction(async (m) => {
    const [o] = await m.query(
      "SELECT * FROM otp WHERE phone=? AND purpose=? ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
      [phone, purpose],
    );
    if (!o || o.used || o.attempts >= 5 || +new Date(o.expires_at) < Date.now())
      return false;
    await m.query("UPDATE otp SET attempts=attempts+1 WHERE id=?", [o.id]);
    if (o.hash !== otpHash(phone, purpose, code)) return false;
    await m.query("UPDATE otp SET used=true WHERE id=?", [o.id]);
    return true;
  });
  if (!ok)
    throw new BadRequestException(
      "Mã không đúng, đã hết hạn hoặc đã được sử dụng",
    );
}
@Controller("auth")
export class AuthController {
  @Post("register") async register(@Body() body: unknown, @Req() req: any) {
    const b = parse(authSchema, body);
    await limit(`register:${req.ip}`, 10, 3600);
    const p = await argon2.hash(b.password, { type: argon2.argon2id });
    try {
      await sql("INSERT INTO users(id,phone,password_hash) VALUES(?,?,?)", [
        randomUUID(),
        b.phone,
        p,
      ]);
    } catch (e: any) {
      if (e.code === "ER_DUP_ENTRY")
        throw new ConflictException("Số điện thoại đã được đăng ký");
      throw e;
    }
    return { message: "Tài khoản đã tạo. Hãy yêu cầu mã xác minh." };
  }
  @Post("otp/request") async request(@Body() body: unknown, @Req() req: any) {
    const b = parse(otpRequest, body);
    await limit(`otp-ip:${req.ip}`, 20, 3600);
    await limit(`otp-cooldown:${b.phone}`, 1, 60);
    await limit(`otp-day:${b.phone}`, 10, 86400);
    const [u] = await sql("SELECT id FROM users WHERE phone=?", [b.phone]);
    if (!u) return { message: "Nếu tài khoản tồn tại, mã sẽ được gửi." };
    const code =
      process.env.SMS_PROVIDER === "dev"
        ? process.env.DEV_OTP_CODE!
        : randomOtp();
    // Persist before provider call so a fast incoming verify never races persistence. Failed sends invalidate the challenge.
    const id = randomUUID();
    await sql("UPDATE otp SET used=true WHERE phone=? AND purpose=?", [
      b.phone,
      b.purpose,
    ]);
    await sql(
      "INSERT INTO otp(id,phone,purpose,hash,expires_at) VALUES(?,?,?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 5 MINUTE))",
      [id, b.phone, b.purpose, otpHash(b.phone, b.purpose, code)],
    );
    try {
      await sms.send(b.phone, code);
    } catch (e) {
      await sql("UPDATE otp SET used=true WHERE id=?", [id]);
      throw e;
    }
    return {
      message:
        process.env.SMS_PROVIDER === "dev"
          ? "Chế độ dev: dùng mã cấu hình trong .env, không có SMS thật."
          : "Mã đã được chuyển cho dịch vụ SMS.",
    };
  }
  @Post("otp/verify") async verify(@Body() body: unknown) {
    const b = parse(otpVerify, body);
    if (b.purpose !== "verify") throw new BadRequestException();
    await verifyOtp(b.phone, b.purpose, b.code);
    await sql("UPDATE users SET verified=true WHERE phone=?", [b.phone]);
    return { message: "Xác minh thành công. Bạn có thể đăng nhập." };
  }
  @Post("password/reset") async reset(@Body() body: unknown) {
    const b = parse(otpVerify.extend({ password }), body);
    if (b.purpose !== "reset") throw new BadRequestException();
    await verifyOtp(b.phone, "reset", b.code);
    const newHash = await argon2.hash(b.password, { type: argon2.argon2id });
    const userId = await db.transaction(async (m) => {
      const [u] = await m.query(
        "SELECT id FROM users WHERE phone=? FOR UPDATE",
        [b.phone],
      );
      if (!u) return null;
      await m.query("UPDATE users SET password_hash=? WHERE id=?", [
        newHash,
        u.id,
      ]);
      await m.query("UPDATE sessions SET revoked=true WHERE user_id=?", [u.id]);
      return u.id;
    });
    if (userId) events.disconnect(userId);
    return { message: "Đã đổi mật khẩu." };
  }
  @Post("login") async login(@Body() body: unknown, @Req() req: any) {
    const b = parse(
      authSchema.extend({
        device: z.string().min(1).max(100).default("Điện thoại"),
      }),
      body,
    );
    await limit(`login-ip:${req.ip}`, 30, 900);
    await limit(`login:${b.phone}`, 10, 900);
    const [u] = await sql("SELECT * FROM users WHERE phone=?", [b.phone]);
    if (!u || !(await argon2.verify(u.password_hash, b.password)))
      throw new UnauthorizedException("Số điện thoại hoặc mật khẩu không đúng");
    if (!u.verified)
      throw new UnauthorizedException("Hãy xác minh số điện thoại trước");
    const sid = randomUUID(),
      refresh = token();
    await db.transaction(async (m) => {
      await m.query(
        "INSERT INTO sessions(id,user_id,device,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 DAY))",
        [sid, u.id, b.device],
      );
      await m.query("INSERT INTO refresh_tokens(hash,session_id) VALUES(?,?)", [
        hash(refresh),
        sid,
      ]);
    });
    return { accessToken: access(u.id, sid), refreshToken: refresh };
  }
  @Post("refresh") async refresh(@Body() body: unknown, @Req() req: any) {
    const b = parse(
      z.object({ refreshToken: z.string().min(40).max(200) }),
      body,
    );
    await limit(`refresh:${req.ip}`, 60, 60);
    const next = token();
    const result = await db.transaction(async (m) => {
      const [r] = await m.query(
        "SELECT t.*,s.user_id,s.revoked,s.expires_at FROM refresh_tokens t JOIN sessions s ON s.id=t.session_id WHERE t.hash=? FOR UPDATE",
        [hash(b.refreshToken)],
      );
      if (!r || r.revoked || +new Date(r.expires_at) < Date.now()) return null;
      if (r.consumed) {
        await m.query("UPDATE sessions SET revoked=true WHERE id=?", [
          r.session_id,
        ]);
        return { replay: true, userId: r.user_id, sid: r.session_id };
      }
      await m.query("UPDATE refresh_tokens SET consumed=true WHERE hash=?", [
        hash(b.refreshToken),
      ]);
      await m.query("INSERT INTO refresh_tokens(hash,session_id) VALUES(?,?)", [
        hash(next),
        r.session_id,
      ]);
      return { replay: false, userId: r.user_id, sid: r.session_id };
    });
    if (!result || result.replay) {
      if (result) events.disconnect(result.userId, result.sid);
      throw new UnauthorizedException(
        "Phiên đã bị thu hồi. Hãy đăng nhập lại.",
      );
    }
    return {
      accessToken: access(result.userId, result.sid),
      refreshToken: next,
    };
  }
  @UseGuards(AuthGuard) @Post("logout") async logout(@Req() r: any) {
    await revoke(r.user.id, r.user.sid);
    return { ok: true };
  }
  @UseGuards(AuthGuard) @Post("logout-all") async all(@Req() r: any) {
    await revoke(r.user.id);
    return { ok: true };
  }
  @UseGuards(AuthGuard) @Get("sessions") async sessions(@Req() r: any) {
    const rows = await sql(
      "SELECT id,device,created_at,expires_at FROM sessions WHERE user_id=? AND revoked=false AND expires_at>UTC_TIMESTAMP(3) ORDER BY created_at DESC",
      [r.user.id],
    );
    return rows.map((s: any) => ({ ...s, current: s.id === r.user.sid }));
  }
  @UseGuards(AuthGuard) @Delete("sessions/:id") async remove(
    @Req() r: any,
    @Param("id") id: string,
  ) {
    await revoke(r.user.id, parse(uuid, id));
    return { ok: true };
  }
  @UseGuards(AuthGuard) @Post("password/change") async change(
    @Req() r: any,
    @Body() body: unknown,
  ) {
    const b = parse(z.object({ oldPassword: password, password }), body);
    const [u] = await sql("SELECT password_hash FROM users WHERE id=?", [
      r.user.id,
    ]);
    if (!(await argon2.verify(u.password_hash, b.oldPassword)))
      throw new BadRequestException("Mật khẩu hiện tại không đúng");
    const newHash = await argon2.hash(b.password, { type: argon2.argon2id });
    await db.transaction(async (m) => {
      await m.query("SELECT id FROM users WHERE id=? FOR UPDATE", [r.user.id]);
      await m.query("UPDATE users SET password_hash=? WHERE id=?", [
        newHash,
        r.user.id,
      ]);
      await m.query("UPDATE sessions SET revoked=true WHERE user_id=?", [
        r.user.id,
      ]);
    });
    events.disconnect(r.user.id);
    return { ok: true };
  }
}
