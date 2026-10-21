import { test } from "node:test";
import assert from "node:assert/strict";
import { metricStats } from "../src/metrics";

test("thống kê cộng theo ngày, không lấy ngày thiếu làm zero hoặc mẫu số trung bình", () => {
  const rows = [
    { kind: "water", value: 250, measured_at: "2026-10-20T16:00:00Z" },
    { kind: "water", value: 500, measured_at: "2026-10-20T17:30:00Z" },
    { kind: "water", value: 250, measured_at: "2026-10-20T18:00:00Z" },
  ];
  const r = metricStats(
    rows,
    "water",
    "Asia/Ho_Chi_Minh",
    "2026-10-19",
    "2026-10-21",
  );
  assert.deepEqual(
    r.days.map((d) => d.value),
    [null, 250, 750],
  );
  assert.equal(r.summary.total, 1000);
  assert.equal(r.summary.average, 500);
  assert.equal(r.summary.recordedDays, 2);
  assert.equal(r.summary.recordCount, 3);
});
test("huyết áp giữ cặp tâm thu/tâm trương cuối ngày, không tính tổng số đo", () => {
  const rows = [
    {
      kind: "blood_pressure",
      value: 118,
      secondary: 78,
      measured_at: "2026-10-20T08:00:00Z",
    },
    {
      kind: "blood_pressure",
      value: 122,
      secondary: 82,
      measured_at: "2026-10-20T12:00:00Z",
    },
  ];
  const r = metricStats(
    rows,
    "blood_pressure",
    "Asia/Ho_Chi_Minh",
    "2026-10-20",
    "2026-10-21",
  );
  assert.equal(r.days[0].value, 122);
  assert.equal(r.days[0].secondary, 82);
  assert.equal(r.days[1].value, null);
  assert.equal(r.summary.latestSecondary, 82);
  assert.equal(r.summary.total, null);
  assert.equal(r.summary.average, 122);
});
test("thống kê trống và ngày DST không tạo số liệu giả", () => {
  const r = metricStats(
    [],
    "sleep",
    "America/New_York",
    "2026-03-07",
    "2026-03-09",
  );
  assert.equal(r.days.length, 3);
  assert.ok(r.days.every((d) => d.value === null));
  assert.equal(r.summary.average, null);
  assert.equal(r.summary.total, null);
  assert.equal(r.summary.latestAt, null);
});
