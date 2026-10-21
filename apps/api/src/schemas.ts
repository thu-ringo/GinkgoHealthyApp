import { z } from "zod";
import { DateTime, IANAZone } from "luxon";
export const phone = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Dùng số quốc tế, ví dụ +84901234567");
export const password = z
  .string()
  .min(10, "Mật khẩu cần ít nhất 10 ký tự")
  .max(128);
export const zone = z
  .string()
  .refine((v) => IANAZone.isValidZone(v), "Múi giờ IANA không hợp lệ");
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => DateTime.fromISO(v).isValid);
export const uuid = z.string().uuid();
export const authSchema = z.object({ phone, password });
export const otpRequest = z.object({
  phone,
  purpose: z.enum(["verify", "reset"]),
});
export const otpVerify = otpRequest.extend({
  code: z.string().regex(/^\d{6}$/),
});
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  timezone: zone,
  water_goal: z.number().int().min(100).max(10000),
  sleep_goal: z.number().int().min(60).max(1440),
});
const units = {
  weight: "kg",
  blood_pressure: "mmHg",
  heart_rate: "bpm",
  water: "ml",
  sleep: "min",
  mood: "level",
  note: "text",
} as const;
export const entrySchema = z
  .object({
    id: uuid,
    kind: z.enum([
      "weight",
      "blood_pressure",
      "heart_rate",
      "water",
      "sleep",
      "mood",
      "note",
    ]),
    value: z.number().finite().nullable(),
    secondary: z.number().finite().nullable().default(null),
    unit: z.string(),
    measured_at: z.iso.datetime({ offset: true }),
    source: z.literal("manual").default("manual"),
    note: z.string().max(2000).default(""),
  })
  .superRefine((v, c) => {
    if (v.unit !== units[v.kind])
      c.addIssue({
        code: "custom",
        message: "Đơn vị không khớp loại dữ liệu",
        path: ["unit"],
      });
    const ranges: Record<string, number[]> = {
      weight: [1, 500],
      blood_pressure: [20, 300],
      heart_rate: [20, 300],
      water: [1, 10000],
      sleep: [1, 1440],
      mood: [1, 5],
    };
    if (
      v.kind !== "note" &&
      (v.value === null ||
        v.value < ranges[v.kind][0] ||
        v.value > ranges[v.kind][1])
    )
      c.addIssue({
        code: "custom",
        message: "Giá trị ngoài phạm vi nhập",
        path: ["value"],
      });
    if (
      v.kind === "blood_pressure" &&
      (v.secondary === null ||
        v.secondary < 20 ||
        v.secondary > 200 ||
        v.secondary > v.value!)
    )
      c.addIssue({
        code: "custom",
        message: "Nhập huyết áp tâm trương hợp lệ",
        path: ["secondary"],
      });
    if (v.kind === "note" && !v.note.trim())
      c.addIssue({ code: "custom", message: "Nhập ghi chú", path: ["note"] });
    if (DateTime.fromISO(v.measured_at).toMillis() > Date.now() + 60000)
      c.addIssue({
        code: "custom",
        message: "Thời điểm đo không được ở tương lai",
        path: ["measured_at"],
      });
  });
export const scheduleSchema = z
  .object({
    id: uuid,
    medicine: z.string().trim().min(1).max(100),
    dose: z.string().trim().min(1).max(120),
    times: z
      .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/))
      .min(1)
      .max(8)
      .refine((v) => new Set(v).size === v.length),
    weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    start_date: date,
    end_date: date.nullable(),
    timezone: zone,
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
  });
export function parse<T>(s: z.ZodType<T>, v: unknown): T {
  return s.parse(v);
}
