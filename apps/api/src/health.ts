import {
  Body,
  Controller,
  Get,
  Put,
  Delete,
  Req,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { z } from "zod";
import { DateTime } from "luxon";
import { db, sql } from "./db";
import { AuthGuard } from "./security";
import {
  date,
  entrySchema,
  parse,
  password,
  profileSchema,
  uuid,
} from "./schemas";
import { summarize, utcRange } from "./time";
import { events } from "./realtime";
import * as argon2 from "argon2";
import { metricKinds, metricStats, metricUnits } from "./metrics";
import { dayKey } from "./time";
export const profile = (id: string) =>
  sql(
    "SELECT id,phone,name,timezone,water_goal,sleep_goal FROM users WHERE id=?",
    [id],
  ).then((r) => r[0]);
export async function dateRange(userId: string, q: any) {
  const u = await profile(userId);
  const today = DateTime.now().setZone(u.timezone).toISODate()!;
  const from = parse(date, q.from || today),
    to = parse(date, q.to || today);
  if (
    from > to ||
    DateTime.fromISO(to).diff(DateTime.fromISO(from), "days").days > 366
  )
    throw new BadRequestException("Khoảng ngày tối đa 366 ngày");
  return { u, from, to };
}
export async function entriesFor(
  id: string,
  from: string,
  to: string,
  zone: string,
) {
  const { start, end } = utcRange(from, to, zone);
  const rows = await sql(
    "SELECT * FROM entries WHERE user_id=? AND measured_at>=? AND measured_at<? ORDER BY measured_at DESC,created_at DESC LIMIT 10001",
    [id, start, end],
  );
  if (rows.length > 10000)
    throw new BadRequestException(
      "Có quá nhiều bản ghi. Chọn khoảng ngày nhỏ hơn để xem đầy đủ.",
    );
  return rows;
}
@UseGuards(AuthGuard)
@Controller()
export class HealthController {
  @Get("me") me(@Req() r: any) {
    return profile(r.user.id);
  }
  @Put("me") async update(@Req() r: any, @Body() body: unknown) {
    const b = parse(profileSchema, body);
    await sql(
      "UPDATE users SET name=?,timezone=?,water_goal=?,sleep_goal=? WHERE id=?",
      [b.name, b.timezone, b.water_goal, b.sleep_goal, r.user.id],
    );
    events.emit(r.user.id, "profile");
    return profile(r.user.id);
  }
  @Get("entries") async list(@Req() r: any, @Query() q: any) {
    const { u, from, to } = await dateRange(r.user.id, q);
    return entriesFor(r.user.id, from, to, u.timezone);
  }
  @Put("entries/:id") async save(
    @Req() r: any,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const b = parse(entrySchema, body);
    if (parse(uuid, id) !== b.id)
      throw new BadRequestException("ID không khớp");
    const entry = await db.transaction(async (m) => {
      await m.query("SELECT id FROM users WHERE id=? FOR UPDATE", [r.user.id]);
      const [existing] = await m.query(
        "SELECT user_id FROM entries WHERE id=? FOR UPDATE",
        [b.id],
      );
      if (existing && existing.user_id !== r.user.id)
        throw new NotFoundException();
      if (existing)
        await m.query(
          "UPDATE entries SET kind=?,value=?,secondary=?,unit=?,measured_at=?,source=?,note=? WHERE id=? AND user_id=?",
          [
            b.kind,
            b.value,
            b.secondary,
            b.unit,
            new Date(b.measured_at),
            b.source,
            b.note,
            b.id,
            r.user.id,
          ],
        );
      else {
        try {
          await m.query(
            "INSERT INTO entries(id,user_id,kind,value,secondary,unit,measured_at,source,note) VALUES(?,?,?,?,?,?,?,?,?)",
            [
              b.id,
              r.user.id,
              b.kind,
              b.value,
              b.secondary,
              b.unit,
              new Date(b.measured_at),
              b.source,
              b.note,
            ],
          );
        } catch (e: any) {
          if (e.code === "ER_DUP_ENTRY") throw new NotFoundException();
          throw e;
        }
      }
      const [row] = await m.query(
        "SELECT * FROM entries WHERE id=? AND user_id=?",
        [b.id, r.user.id],
      );
      return row;
    });
    events.emit(r.user.id, "entries");
    return entry;
  }
  @Delete("entries/:id") async remove(@Req() r: any, @Param("id") id: string) {
    const result = await sql("DELETE FROM entries WHERE id=? AND user_id=?", [
      parse(uuid, id),
      r.user.id,
    ]);
    if (!result.affectedRows) throw new NotFoundException();
    events.emit(r.user.id, "entries");
    return { ok: true };
  }
  @Get("stats") async stats(@Req() r: any, @Query() q: any) {
    const { u, from, to } = await dateRange(r.user.id, q);
    return {
      timezone: u.timezone,
      days: summarize(
        await entriesFor(r.user.id, from, to, u.timezone),
        u.timezone,
        from,
        to,
      ),
    };
  }
  @Get("metrics/:kind") async metric(
    @Req() r: any,
    @Param("kind") kind: string,
    @Query() q: any,
  ) {
    const k = parse(z.enum(metricKinds), kind);
    const { u, from, to } = await dateRange(r.user.id, q);
    return {
      ...metricStats(
        await entriesFor(r.user.id, from, to, u.timezone),
        k,
        u.timezone,
        from,
        to,
      ),
      goal: k === "water" ? u.water_goal : k === "sleep" ? u.sleep_goal : null,
    };
  }
  @Get("health-data") async healthData(@Req() r: any) {
    const u = await profile(r.user.id);
    const metrics = await Promise.all(
      metricKinds.map(async (kind) => {
        const [latest] = await sql(
          "SELECT value,secondary,measured_at FROM entries WHERE user_id=? AND kind=? ORDER BY measured_at DESC,created_at DESC LIMIT 1",
          [r.user.id, kind],
        );
        if (!latest)
          return {
            kind,
            unit: metricUnits[kind],
            value: null,
            secondary: null,
            measured_at: null,
            day: null,
          };
        const day = dayKey(latest.measured_at, u.timezone);
        const value =
          kind === "water" || kind === "sleep"
            ? (await entriesFor(r.user.id, day, day, u.timezone))
                .filter((e: { kind: string }) => e.kind === kind)
                .reduce((n: number, e: { value: number }) => n + Number(e.value), 0)
            : Number(latest.value);
        return {
          kind,
          unit: metricUnits[kind],
          value,
          secondary: latest.secondary == null ? null : Number(latest.secondary),
          measured_at: new Date(latest.measured_at).toISOString(),
          day,
        };
      }),
    );
    return { timezone: u.timezone, metrics };
  }
  @Get("today") async today(@Req() r: any) {
    const u = await profile(r.user.id),
      date = DateTime.now().setZone(u.timezone).toISODate()!;
    const entries = await entriesFor(r.user.id, date, date, u.timezone);
    return {
      date,
      profile: u,
      summary: summarize(entries, u.timezone, date, date)[0],
      entryCount: entries.length,
    };
  }
  @Get("me/export") async export(@Req() r: any) {
    return db.transaction("REPEATABLE READ", async (m) => {
      const [u] = await m.query(
        "SELECT phone,name,timezone,water_goal,sleep_goal,created_at FROM users WHERE id=?",
        [r.user.id],
      );
      const get = (table: string) =>
        m.query(`SELECT * FROM ${table} WHERE user_id=?`, [r.user.id]);
      return {
        exportedAt: new Date().toISOString(),
        profile: u,
        entries: await get("entries"),
        schedules: await get("schedules"),
        occurrences: await m.query(
          "SELECT o.*,l.status,l.logged_at FROM occurrences o LEFT JOIN medication_logs l ON l.occurrence_id=o.id WHERE o.user_id=?",
          [r.user.id],
        ),
        messages: await get("messages"),
      };
    });
  }
  @Delete("me") async delete(@Req() r: any, @Body() body: unknown) {
    const b = parse(z.object({ password }), body);
    const [u] = await sql("SELECT password_hash,phone FROM users WHERE id=?", [
      r.user.id,
    ]);
    if (!(await argon2.verify(u.password_hash, b.password)))
      throw new BadRequestException("Mật khẩu không đúng");
    await db.transaction(async (m) => {
      await m.query("DELETE FROM otp WHERE phone=?", [u.phone]);
      await m.query("DELETE FROM users WHERE id=?", [r.user.id]);
    });
    events.disconnect(r.user.id);
    return { ok: true };
  }
}
