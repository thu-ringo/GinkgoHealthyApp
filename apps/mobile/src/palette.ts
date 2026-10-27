import type { MetricKind } from "./types";

export type MetricPalette = {
  deep: string;
  gradientEnd: string;
  soft: string;
  border: string;
};

export const metricPalette: Record<MetricKind, MetricPalette> = {
  water: {
    deep: "#1F6FA3",
    gradientEnd: "#3A8FC9",
    soft: "#E7F2FA",
    border: "#C4DDEE",
  },
  sleep: {
    deep: "#5B4BA8",
    gradientEnd: "#7A6AC9",
    soft: "#EFECF9",
    border: "#D6CFF0",
  },
  weight: {
    deep: "#327C59",
    gradientEnd: "#4C9B74",
    soft: "#E8F3EC",
    border: "#C6DFD0",
  },
  heart_rate: {
    deep: "#C93A52",
    gradientEnd: "#E2566B",
    soft: "#FCEBEE",
    border: "#F3C8D0",
  },
  blood_pressure: {
    deep: "#B85A1E",
    gradientEnd: "#D4772F",
    soft: "#FCEFE3",
    border: "#F1D2B6",
  },
  mood: {
    deep: "#946D00",
    gradientEnd: "#B58A0A",
    soft: "#FBF4DC",
    border: "#EBDDA8",
  },
};

export const remindTone = {
  deep: "#0E7C86",
  soft: "#E1F3F4",
  border: "#B9E0E3",
} as const;

export const scheduleTone = {
  deep: "#4650C8",
  soft: "#E9EBFB",
  border: "#C8CCF2",
} as const;

export const status = {
  taken: { fg: "#1E7F4F", bg: "#E3F4EA" },
  skipped: { fg: "#C62F3E", bg: "#FCE8EA" },
  due: { fg: "#D9731A", bg: "#FFF1E0" },
  upcoming: { fg: "#2F7FB0", bg: "#E7F2FA" },
  cancelled: { fg: "#4B5754", bg: "#EEF0EE" },
} as const;

export function partOfDay(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + minute;
  if (totalMinutes < 5 * 60)
    return {
      label: time === "00:00" ? "Nửa đêm" : "Đêm",
      icon: "cloudy-night" as const,
      fg: "#5B4BA8",
      bg: "#EFECF9",
    };
  if (totalMinutes < 11 * 60)
    return {
      label: "Sáng",
      icon: "partly-sunny" as const,
      fg: "#B7791F",
      bg: "#FBF4DC",
    };
  if (totalMinutes < 14 * 60)
    return {
      label: "Trưa",
      icon: "sunny" as const,
      fg: "#D9731A",
      bg: "#FFF1E0",
    };
  if (totalMinutes < 19 * 60)
    return {
      label: "Chiều",
      icon: "cloudy" as const,
      fg: "#2F7FB0",
      bg: "#E7F2FA",
    };
  return {
    label: "Tối",
    icon: "moon" as const,
    fg: "#4650C8",
    bg: "#E9EBFB",
  };
}
