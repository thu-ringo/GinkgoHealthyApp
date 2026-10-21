import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  Req,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, sql } from "./db";
import { AuthGuard } from "./security";
import { parse, scheduleSchema, uuid } from "./schemas";
import { dateRange } from "./health";
import { occurrenceTimes, utcRange } from "./time";
import { events } from "./realtime";
export async function generate(userId: string, from: string, to: string) {
  await db.transaction(async (m) => {
    // Serialize with edits/deletion for this owner, including a first schedule insert.
    await m.query("SELECT id FROM users WHERE id=? FOR UPDATE", [userId]);
    const rows = await m.query(
      "SELECT * FROM schedules WHERE user_id=? AND active=true",
      [userId],
    );
    const localFrom = DateTime.fromISO(from).minus({ days: 1 }).toISODate()!,
      localTo = DateTime.fromISO(to).plus({ days: 1 }).toISODate()!;
    for (const s of rows)
      for (const due of occurrenceTimes(s, localFrom, localTo))
        await m.query(
          "INSERT INTO occurrences(id,user_id,schedule_id,due_at,medicine,dose) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=occurrences.id",
          [randomUUID(), userId, s.id, new Date(due), s.medicine, s.dose],
        );
  });
}
@UseGuards(AuthGuard)
@Controller()
export class MedicinesController {
  @Get("schedules") list(@Req() r: any) {
    return sql(
      "SELECT * FROM schedules WHERE user_id=? ORDER BY active DESC,medicine",
      [r.user.id],
    );
  }
  @Put("schedules/:id") async save(
    @Req() r: any,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const b = parse(scheduleSchema, body);
    if (b.id !== parse(uuid, id)) throw new BadRequestException();
    await db.transaction(async (m) => {
      await m.query("SELECT id FROM users WHERE id=? FOR UPDATE", [r.user.id]);
      const [existing] = await m.query(
        "SELECT user_id FROM schedules WHERE id=? FOR UPDATE",
        [b.id],
      );
      if (existing && existing.user_id !== r.user.id)
        throw new NotFoundException();
      const values = [
        b.medicine,
        b.dose,
        JSON.stringify(b.times),
        JSON.stringify(b.weekdays),
        b.start_date,
        b.end_date,
        b.timezone,
      ];
      if (existing)
        await m.query(
          "UPDATE schedules SET medicine=?,dose=?,times=?,weekdays=?,start_date=?,end_date=?,timezone=?,active=true,revision=revision+1 WHERE id=? AND user_id=?",
          [...values, b.id, r.user.id],
        );
      else {
        try {
          await m.query(
            "INSERT INTO schedules(id,user_id,medicine,dose,times,weekdays,start_date,end_date,timezone) VALUES(?,?,?,?,?,?,?,?,?)",
            [b.id, r.user.id, ...values],
          );
        } catch (e: any) {
          if (e.code === "ER_DUP_ENTRY") throw new NotFoundException();
          throw e;
        }
      }
      await m.query(
        "DELETE o FROM occurrences o WHERE o.schedule_id=? AND o.user_id=? AND due_at>UTC_TIMESTAMP(3) AND NOT EXISTS(SELECT 1 FROM medication_logs l WHERE l.occurrence_id=o.id)",
        [b.id, r.user.id],
      );
    });
    events.emit(r.user.id, "schedules");
    return b;
  }
  @Delete("schedules/:id") async cancel(
    @Req() r: any,
    @Param("id") id: string,
  ) {
    parse(uuid, id);
    await db.transaction(async (m) => {
      await m.query("SELECT id FROM users WHERE id=? FOR UPDATE", [r.user.id]);
      const result = await m.query(
        "UPDATE schedules SET active=false,revision=revision+1 WHERE id=? AND user_id=?",
        [id, r.user.id],
      );
      if (!result.affectedRows) throw new NotFoundException();
      await m.query(
        "UPDATE occurrences o SET cancelled=true WHERE schedule_id=? AND user_id=? AND due_at>UTC_TIMESTAMP(3) AND NOT EXISTS(SELECT 1 FROM medication_logs l WHERE l.occurrence_id=o.id)",
        [id, r.user.id],
      );
    });
    events.emit(r.user.id, "schedules");
    return { ok: true };
  }
  @Get("occurrences") async listOccurrences(@Req() r: any, @Query() q: any) {
    const uRange = await dateRange(r.user.id, q);
    let { u, from, to } = uRange;
    if (!q.to) to = DateTime.fromISO(from).plus({ days: 13 }).toISODate()!;
    if (DateTime.fromISO(to).diff(DateTime.fromISO(from), "days").days > 90)
      throw new BadRequestException("Lịch nhắc tối đa 90 ngày mỗi lần");
    // Generate only a bounded rolling horizon. Older occurrences are retained as immutable history.
    const earliest = DateTime.now()
        .setZone(u.timezone)
        .minus({ days: 1 })
        .toISODate()!,
      latest = DateTime.now()
        .setZone(u.timezone)
        .plus({ days: 30 })
        .toISODate()!;
    if (to >= earliest && from <= latest)
      await generate(
        r.user.id,
        from < earliest ? earliest : from,
        to > latest ? latest : to,
      );
    const { start, end } = utcRange(from, to, u.timezone);
    return sql(
      "SELECT o.*,l.status,l.logged_at FROM occurrences o LEFT JOIN medication_logs l ON l.occurrence_id=o.id WHERE o.user_id=? AND o.due_at>=? AND o.due_at<? ORDER BY o.due_at",
      [r.user.id, start, end],
    );
  }
  @Post("occurrences/:id/log") async log(
    @Req() r: any,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const b = parse(z.object({ status: z.enum(["taken", "skipped"]) }), body);
    parse(uuid, id);
    const result = await db.transaction(async (m) => {
      await m.query("SELECT id FROM users WHERE id=? FOR UPDATE", [r.user.id]);
      const [o] = await m.query(
        "SELECT * FROM occurrences WHERE id=? AND user_id=? FOR UPDATE",
        [id, r.user.id],
      );
      if (!o || o.cancelled)
        throw new NotFoundException("Lần nhắc không còn tồn tại");
      if (+new Date(o.due_at) > Date.now() + 60000)
        throw new BadRequestException("Chưa đến giờ của lần nhắc này");
      await m.query(
        "INSERT INTO medication_logs(occurrence_id,status) VALUES(?,?) ON DUPLICATE KEY UPDATE occurrence_id=VALUES(occurrence_id)",
        [id, b.status],
      );
      const [l] = await m.query(
        "SELECT * FROM medication_logs WHERE occurrence_id=?",
        [id],
      );
      if (l.status !== b.status)
        throw new ConflictException(
          "Lần nhắc đã được xác nhận với trạng thái khác",
        );
      return l;
    });
    events.emit(r.user.id, "occurrences");
    return result;
  }
}
