import type { MetricKind } from "./types";
export const metricOrder: MetricKind[] = [
  "water",
  "sleep",
  "weight",
  "heart_rate",
  "blood_pressure",
  "mood",
];
export const metricLabels: Record<MetricKind, string> = {
  water: "Nước uống",
  sleep: "Giấc ngủ",
  weight: "Cân nặng",
  heart_rate: "Nhịp tim",
  blood_pressure: "Huyết áp",
  mood: "Tâm trạng",
};
export const metricUnits: Record<MetricKind, string> = {
  water: "ml",
  sleep: "",
  weight: "kg",
  heart_rate: "bpm",
  blood_pressure: "mmHg",
  mood: "/ 5",
};
export function metricValue(
  kind: string,
  value: number | null | undefined,
  secondary?: number | null,
): string {
  if (value == null) return "—";
  if (kind === "sleep") {
    const minutes = Math.round(value),
      hours = Math.floor(minutes / 60),
      rest = minutes % 60;
    return hours ? `${hours}g${rest ? ` ${rest}p` : ""}` : `${rest}p`;
  }
  const n = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
    value,
  );
  return kind === "blood_pressure" && secondary != null
    ? `${n}/${Math.round(secondary)}`
    : n;
}
