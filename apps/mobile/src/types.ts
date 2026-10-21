export type Profile = {
  id: string;
  phone: string;
  name: string;
  timezone: string;
  water_goal: number;
  sleep_goal: number;
};
export type Entry = {
  id: string;
  kind: string;
  value: number | null;
  secondary: number | null;
  unit: string;
  measured_at: string;
  source: string;
  note: string;
};
export type Schedule = {
  id: string;
  medicine: string;
  dose: string;
  times: string[];
  weekdays: number[];
  start_date: string;
  end_date: string | null;
  timezone: string;
  active?: boolean;
};
export type Occurrence = {
  id: string;
  medicine: string;
  dose: string;
  due_at: string;
  status: "taken" | "skipped" | null;
  cancelled: boolean;
};
export type Day = {
  date: string;
  water: number | null;
  sleep: number | null;
  weight: number | null;
  heart_rate: number | null;
  blood_pressure: number | null;
  mood: number | null;
};
export type MetricKind =
  "water" | "sleep" | "weight" | "heart_rate" | "blood_pressure" | "mood";
export type MetricStats = {
  kind: MetricKind;
  unit: string;
  from: string;
  to: string;
  timezone: string;
  goal: number | null;
  days: {
    date: string;
    value: number | null;
    secondary: number | null;
    count: number;
  }[];
  summary: {
    total: number | null;
    average: number | null;
    averageSecondary: number | null;
    min: number | null;
    max: number | null;
    latest: number | null;
    latestSecondary: number | null;
    latestAt: string | null;
    recordCount: number;
    recordedDays: number;
    periodDays: number;
  };
};
export type HealthData = {
  timezone: string;
  metrics: {
    kind: MetricKind;
    unit: string;
    value: number | null;
    secondary: number | null;
    measured_at: string | null;
    day: string | null;
  }[];
};
export const kinds: Record<string, { label: string; unit: string }> = {
  weight: { label: "Cân nặng", unit: "kg" },
  blood_pressure: { label: "Huyết áp", unit: "mmHg" },
  heart_rate: { label: "Nhịp tim", unit: "bpm" },
  water: { label: "Nước uống", unit: "ml" },
  sleep: { label: "Giấc ngủ", unit: "min" },
  mood: { label: "Tâm trạng (1–5)", unit: "level" },
  note: { label: "Ghi chú", unit: "text" },
};
