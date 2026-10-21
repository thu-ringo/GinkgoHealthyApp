import { createHash } from "node:crypto";
import * as argon2 from "argon2";
import { DateTime } from "luxon";
import { connect, db } from "./db";
import { authSchema } from "./schemas";
import { occurrenceTimes } from "./time";
export function demoId(key: string) {
  const hex = createHash("sha256")
    .update("healthycheck-demo-v1:" + key)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export async function seedDemo(
  config = {
    enabled: process.env.DEMO_SEED_ENABLED === "true",
    phone: process.env.DEMO_PHONE || "",
    password: process.env.DEMO_PASSWORD || "",
  },
) {
  if (process.env.NODE_ENV === "production" || !config.enabled)
    throw new Error(
      "Seed demo phải bật rõ ràng và không được chạy trong production",
    );
  const credentials = authSchema.parse(config),
    userId = demoId("user"),
    scheduleId = demoId("schedule"),
    zone = "Asia/Ho_Chi_Minh";
  await connect();
  const passwordHash = await argon2.hash(credentials.password, {
    type: argon2.argon2id,
  });
  return db.transaction(async (m) => {
    const [existing] = await m.query(
      "SELECT id,phone FROM users WHERE phone=? OR id=? FOR UPDATE",
      [credentials.phone, userId],
    );
    if (existing) {
      if (existing.id !== userId || existing.phone !== credentials.phone)
        throw new Error(
          "Không seed vào tài khoản đang có. Chọn số điện thoại demo riêng.",
        );
      return { created: false };
    }
    await m.query(
      "INSERT INTO users(id,phone,password_hash,verified,name,timezone) VALUES(?,?,?,true,?,?)",
      [userId, credentials.phone, passwordHash, "Tài khoản demo", zone],
    );
    const today = DateTime.now().setZone(zone).startOf("day");
    for (let i = 0; i < 7; i++) {
      const measured = today
        .minus({ days: i })
        .set({ hour: 9 })
        .toUTC()
        .toJSDate();
      // Today's sample must never be a future measurement, even when seeded before 09:00.
      const at = +measured > Date.now() ? new Date() : measured;
      for (const [kind, value, unit] of [
        ["water", 500 + i * 100, "ml"],
        ["sleep", 420 + i * 5, "min"],
        ["weight", 60 + i * 0.2, "kg"],
      ] as const) {
        await m.query(
          "INSERT INTO entries(id,user_id,kind,value,unit,measured_at,source,note) VALUES(?,?,?,?,?,?,?,?)",
          [
            demoId(`entry:${i}:${kind}`),
            userId,
            kind,
            value,
            unit,
            at,
            "manual",
            "Dữ liệu minh họa của seed demo.",
          ],
        );
      }
    }
    const schedule = {
      id: scheduleId,
      medicine: "Lịch nhắc demo",
      dose: "Dữ liệu minh họa, không dùng làm hướng dẫn điều trị",
      times: ["08:00", "20:00"],
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      start_date: today.minus({ days: 6 }).toISODate()!,
      end_date: today.plus({ days: 7 }).toISODate()!,
      timezone: zone,
    };
    await m.query(
      "INSERT INTO schedules(id,user_id,medicine,dose,times,weekdays,start_date,end_date,timezone) VALUES(?,?,?,?,?,?,?,?,?)",
      [
        scheduleId,
        userId,
        schedule.medicine,
        schedule.dose,
        JSON.stringify(schedule.times),
        JSON.stringify(schedule.weekdays),
        schedule.start_date,
        schedule.end_date,
        zone,
      ],
    );
    for (const due of occurrenceTimes(
      schedule,
      schedule.start_date,
      schedule.end_date,
    )) {
      const oid = demoId("occurrence:" + due);
      await m.query(
        "INSERT INTO occurrences(id,user_id,schedule_id,due_at,medicine,dose) VALUES(?,?,?,?,?,?)",
        [
          oid,
          userId,
          scheduleId,
          new Date(due),
          schedule.medicine,
          schedule.dose,
        ],
      );
      if (
        DateTime.fromISO(due).setZone(zone).toISODate() ===
        today.minus({ days: 1 }).toISODate()
      )
        await m.query(
          "INSERT INTO medication_logs(occurrence_id,status) VALUES(?,?)",
          [oid, "taken"],
        );
    }
    await m.query(
      "INSERT INTO messages(id,user_id,role,content,shared_health) VALUES(?,?,?,?,false)",
      [
        demoId("message:user"),
        userId,
        "user",
        "[DỮ LIỆU DEMO] Tôi muốn ghi lại thói quen hằng ngày.",
      ],
    );
    await m.query(
      "INSERT INTO messages(id,user_id,role,content,shared_health,created_at) VALUES(?,?,?,?,false,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1000 MICROSECOND))",
      [
        demoId("message:assistant"),
        userId,
        "assistant",
        "[NỘI DUNG DEMO CÓ SẴN, KHÔNG PHẢI PHẢN HỒI OPENAI THẬT] Bạn có thể ghi nước uống và giấc ngủ trong Nhật ký.",
      ],
    );
    return { created: true };
  });
}
if (require.main === module)
  seedDemo()
    .then((r) =>
      console.log(
        r.created
          ? "Đã tạo tài khoản và dữ liệu demo riêng."
          : "Seed demo đã tồn tại; không ghi đè hay tạo trùng.",
      ),
    )
    .catch((e) => {
      console.error(
        e instanceof Error ? e.message : "Không tạo được seed demo",
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      if (db.isInitialized) await db.destroy();
    });
