import { DateTime } from "luxon";
export function utcRange(from: string, to: string, zone: string) {
  return {
    start: DateTime.fromISO(from, { zone }).startOf("day").toUTC().toJSDate(),
    end: DateTime.fromISO(to, { zone })
      .startOf("day")
      .plus({ days: 1 })
      .toUTC()
      .toJSDate(),
  };
}
export function dayKey(time: string | Date, zone: string) {
  return DateTime.fromJSDate(new Date(time)).setZone(zone).toISODate()!;
}
export function occurrenceTimes(s: any, from: string, to: string) {
  const out: string[] = [];
  for (
    let d = DateTime.fromISO(from, { zone: s.timezone }).startOf("day");
    d.toISODate()! <= to;
    d = d.plus({ days: 1 })
  ) {
    const key = d.toISODate()!;
    if (
      key < s.start_date ||
      (s.end_date && key > s.end_date) ||
      !s.weekdays.includes(d.weekday)
    )
      continue;
    for (const t of s.times) {
      const [hour, minute] = t.split(":").map(Number);
      const local = d.set({ hour, minute });
      // DST nonexistent wall times are skipped; ambiguous times use Luxon's earlier instant.
      if (local.hour === hour && local.minute === minute)
        out.push(
          local
            .getPossibleOffsets()
            .sort((a, b) => a.toMillis() - b.toMillis())[0]
            .toUTC()
            .toISO()!,
        );
    }
  }
  return out;
}
export function summarize(
  entries: any[],
  zone: string,
  from: string,
  to: string,
) {
  const days: any[] = [];
  for (
    let d = DateTime.fromISO(from);
    d.toISODate()! <= to;
    d = d.plus({ days: 1 })
  ) {
    const date = d.toISODate()!,
      rows = entries.filter((e) => dayKey(e.measured_at, zone) === date);
    const sum = (kind: string) => {
      const r = rows.filter((e) => e.kind === kind);
      return r.length ? r.reduce((a, e) => a + Number(e.value), 0) : null;
    };
    const last = (kind: string) =>
      rows
        .filter((e) => e.kind === kind)
        .sort((a, b) => +new Date(b.measured_at) - +new Date(a.measured_at))[0]
        ?.value ?? null;
    days.push({
      date,
      water: sum("water"),
      sleep: sum("sleep"),
      weight: last("weight"),
      heart_rate: last("heart_rate"),
      blood_pressure: last("blood_pressure"),
      mood: last("mood"),
    });
  }
  return days;
}
