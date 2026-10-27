import React, { useState } from "react";
import { Text } from "react-native";
import { DateTime } from "luxon";
import { useQuery } from "@tanstack/react-query";
import { api } from "../src/api";
import { DateRange } from "../src/date-range";
import { HealthReport } from "../src/health-report";
import { Entry, HealthData, Profile } from "../src/types";
import { Header, Page, Section, State } from "../src/ui";
import { MetricRow } from "../src/health-ui";

export default function AllHealthData() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => api<Profile>("/me", { signal }),
  });
  const zone = me.data?.timezone || "Asia/Ho_Chi_Minh";
  const today = DateTime.now().setZone(zone).toISODate()!;
  const [range, setRange] = useState<{ from: string; to: string }>();
  const [rangeMode, setRangeMode] = useState<"7days" | "30days" | "custom">(
    "7days",
  );
  const from =
      range?.from ||
      DateTime.fromISO(today, { zone: "utc" }).minus({ days: 6 }).toISODate()!,
    to = range?.to || today;
  const entries = useQuery({
    queryKey: ["entries", from, to, zone],
    queryFn: ({ signal }) =>
      api<Entry[]>(`/entries?from=${from}&to=${to}`, { signal }),
    enabled: !!me.data,
  });
  const health = useQuery({
    queryKey: ["health-data"],
    queryFn: ({ signal }) => api<HealthData>("/health-data", { signal }),
    enabled: !!me.data,
  });
  const dayCount = Math.max(
    1,
    Math.round(
      DateTime.fromISO(to, { zone: "utc" })
        .diff(DateTime.fromISO(from, { zone: "utc" }), "days").days,
    ) + 1,
  );
  const dates = Array.from({ length: dayCount }, (_, index) =>
    DateTime.fromISO(from, { zone: "utc" }).plus({ days: index }).toISODate()!,
  );

  return (
    <Page>
      <Header
        back
        title="Thống kê sức khỏe"
        subtitle="Theo dõi xu hướng các chỉ số của bạn."
      />
      <DateRange
        from={from}
        to={to}
        onChange={(start, end) => setRange({ from: start, to: end })}
        presets={[]}
        variant="journal"
        today={today}
        maxDays={366}
        selectedMode={rangeMode}
        onModeChange={(mode) => {
          if (mode === "7days" || mode === "30days" || mode === "custom")
            setRangeMode(mode);
        }}
      />
      <Text style={{ color: "#61746B", fontSize: 13 }}>
        Chạm vào một chỉ số để xem biểu đồ và lịch sử chi tiết.
      </Text>
      <State query={me}>
        <State query={entries}>
          <HealthReport
            entries={entries.data ?? []}
            dates={dates}
            zone={zone}
            profile={me.data}
          />
          <State query={health}>
            <Section title="Các chỉ số khác" />
            {health.data?.metrics
              .filter((metric) => metric.kind === "blood_pressure" || metric.kind === "mood")
              .map((metric) => (
                <MetricRow
                  key={metric.kind}
                  kind={metric.kind}
                  value={metric.value}
                  secondary={metric.secondary}
                  detail={
                    metric.measured_at
                      ? `Gần nhất ${DateTime.fromISO(metric.measured_at).setZone(zone).toFormat("dd/MM/yyyy")}`
                      : "Chưa có bản ghi"
                  }
                />
              ))}
          </State>
        </State>
      </State>
    </Page>
  );
}
