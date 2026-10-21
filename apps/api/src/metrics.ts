import { dayKey, summarize } from "./time";

export const metricKinds = [
  "water",
  "sleep",
  "weight",
  "heart_rate",
  "blood_pressure",
  "mood",
] as const;
export type MetricKind = (typeof metricKinds)[number];
export const metricUnits: Record<MetricKind, string> = {
  water: "ml",
  sleep: "min",
  weight: "kg",
  heart_rate: "bpm",
  blood_pressure: "mmHg",
  mood: "level",
};

// Missing days remain null. Daily averages use recorded days, never invented zeroes.
export function metricStats(
  entries: any[],
  kind: MetricKind,
  zone: string,
  from: string,
  to: string,
) {
  const rows = entries
    .filter((e) => e.kind === kind)
    .sort(
      (a, b) =>
        +new Date(b.measured_at) - +new Date(a.measured_at) ||
        +new Date(b.created_at || 0) - +new Date(a.created_at || 0),
    );
  const days = summarize(rows, zone, from, to).map((d) => {
    const recorded = rows.filter((e) => dayKey(e.measured_at, zone) === d.date);
    return {
      date: d.date,
      value: d[kind] == null ? null : Number(d[kind]),
      secondary:
        kind === "blood_pressure" && recorded[0]?.secondary != null
          ? Number(recorded[0].secondary)
          : null,
      count: recorded.length,
    };
  });
  const values = days.flatMap((d) => (d.value == null ? [] : [d.value]));
  const secondaryValues = days.flatMap((d) =>
    d.secondary == null ? [] : [d.secondary],
  );
  const average = (v: number[]) =>
    v.length ? v.reduce((a, n) => a + n, 0) / v.length : null;
  return {
    kind,
    unit: metricUnits[kind],
    from,
    to,
    timezone: zone,
    days,
    summary: {
      total:
        (kind === "water" || kind === "sleep") && values.length
          ? values.reduce((a, n) => a + n, 0)
          : null,
      average: average(values),
      averageSecondary: average(secondaryValues),
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      latest: rows[0]?.value == null ? null : Number(rows[0].value),
      latestSecondary:
        rows[0]?.secondary == null ? null : Number(rows[0].secondary),
      latestAt: rows[0] ? new Date(rows[0].measured_at).toISOString() : null,
      recordCount: rows.length,
      recordedDays: values.length,
      periodDays: days.length,
    },
  };
}
