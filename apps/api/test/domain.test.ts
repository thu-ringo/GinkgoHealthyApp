import { test } from "node:test";
import assert from "node:assert/strict";
import { entrySchema, scheduleSchema } from "../src/schemas";
import { occurrenceTimes, summarize, dayKey } from "../src/time";
import { randomUUID } from "node:crypto";
import { DevSms, TwilioSms } from "../src/sms";
const schedule = {
  id: randomUUID(),
  medicine: "Theo đơn",
  dose: "Theo hướng dẫn",
  times: ["08:00", "20:00"],
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  start_date: "2026-01-01",
  end_date: null,
  timezone: "Asia/Ho_Chi_Minh",
};
test("hai giờ uống tạo đúng hai thời điểm UTC, giữ ngày bắt đầu/kết thúc", () => {
  assert.deepEqual(
    occurrenceTimes(
      { ...schedule, start_date: "2026-10-21", end_date: "2026-10-21" },
      "2026-10-20",
      "2026-10-22",
    ),
    ["2026-10-21T01:00:00.000Z", "2026-10-21T13:00:00.000Z"],
  );
});
test("lịch chỉ lặp thứ Hai", () => {
  assert.equal(
    occurrenceTimes({ ...schedule, weekdays: [1] }, "2026-10-19", "2026-10-25")
      .length,
    2,
  );
});
test("DST: bỏ giờ không tồn tại và chỉ tạo một occurrence ở giờ lặp", () => {
  const s = { ...schedule, timezone: "America/New_York", times: ["02:30"] };
  assert.equal(occurrenceTimes(s, "2026-03-08", "2026-03-08").length, 0);
  assert.equal(
    occurrenceTimes({ ...s, times: ["01:30"] }, "2026-11-01", "2026-11-01")
      .length,
    1,
  );
});
test("tổng ngày theo timezone, ngày thiếu là null, chỉ số dùng số cuối", () => {
  const rows = [
    { kind: "water", value: 250, measured_at: "2026-10-20T18:00:00Z" },
    { kind: "water", value: 500, measured_at: "2026-10-21T02:00:00Z" },
    { kind: "weight", value: 60, measured_at: "2026-10-21T01:00:00Z" },
    { kind: "weight", value: 61, measured_at: "2026-10-21T02:00:00Z" },
  ];
  const result = summarize(
    rows,
    "Asia/Ho_Chi_Minh",
    "2026-10-20",
    "2026-10-22",
  );
  assert.equal(result[0].water, null);
  assert.equal(result[1].water, 750);
  assert.equal(result[1].weight, 61);
  assert.equal(result[2].weight, null);
  assert.equal(
    dayKey("2026-10-20T18:00:00Z", "Asia/Ho_Chi_Minh"),
    "2026-10-21",
  );
});
test("schema từ chối đơn vị sai và giờ thuốc trùng", () => {
  assert.equal(
    entrySchema.safeParse({
      id: randomUUID(),
      kind: "water",
      value: 250,
      unit: "kg",
      measured_at: new Date().toISOString(),
    }).success,
    false,
  );
  assert.equal(
    scheduleSchema.safeParse({ ...schedule, times: ["08:00", "08:00"] })
      .success,
    false,
  );
  assert.equal(
    scheduleSchema.safeParse({ ...schedule, end_date: "2025-01-01" }).success,
    false,
  );
});
test("dev SMS không chạy trong production", async () => {
  const old = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    process.env.DEV_OTP_ENABLED = "true";
    process.env.DEV_OTP_CODE = "123456";
    await assert.rejects(() => new DevSms().send());
  } finally {
    process.env = old;
  }
});
test("SMS provider lỗi/timeout không báo thành công", async () => {
  const old = { ...process.env },
    original = global.fetch;
  try {
    Object.assign(process.env, {
      TWILIO_ACCOUNT_SID: "test",
      TWILIO_AUTH_TOKEN: "test",
      TWILIO_FROM: "+10000000000",
    });
    global.fetch = async () => new Response("{}", { status: 503 });
    await assert.rejects(() => new TwilioSms().send("+84900000000", "000000"));
    global.fetch = async () => {
      throw new Error("timeout");
    };
    await assert.rejects(() => new TwilioSms().send("+84900000000", "000000"));
  } finally {
    global.fetch = original;
    process.env = old;
  }
});
