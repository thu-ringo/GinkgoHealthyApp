import type { MetricKind } from "./types";
import { metricPalette } from "./palette";
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
export const metricColors: Record<
  MetricKind | "note",
  { icon: string; background: string; border: string }
> = {
  water: {
    icon: metricPalette.water.deep,
    background: metricPalette.water.soft,
    border: metricPalette.water.border,
  },
  sleep: {
    icon: metricPalette.sleep.deep,
    background: metricPalette.sleep.soft,
    border: metricPalette.sleep.border,
  },
  weight: {
    icon: metricPalette.weight.deep,
    background: metricPalette.weight.soft,
    border: metricPalette.weight.border,
  },
  heart_rate: {
    icon: metricPalette.heart_rate.deep,
    background: metricPalette.heart_rate.soft,
    border: metricPalette.heart_rate.border,
  },
  blood_pressure: {
    icon: metricPalette.blood_pressure.deep,
    background: metricPalette.blood_pressure.soft,
    border: metricPalette.blood_pressure.border,
  },
  mood: {
    icon: metricPalette.mood.deep,
    background: metricPalette.mood.soft,
    border: metricPalette.mood.border,
  },
  note: { icon: "#687570", background: "#F0F2EF", border: "#D9DEDA" },
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
    return hours
      ? `${hours} giờ${rest ? ` ${rest} phút` : ""}`
      : `${rest} phút`;
  }
  const n = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(
    value,
  );
  return kind === "blood_pressure" && secondary != null
    ? `${n}/${Math.round(secondary)}`
    : n;
}
