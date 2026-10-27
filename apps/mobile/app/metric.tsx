import React, { useState } from "react";
import { Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { DateTime } from "luxon";
import { useQuery } from "@tanstack/react-query";
import { api } from "../src/api";
import {
  C,
  Disclosure,
  Header,
  Page,
  State,
} from "../src/ui";
import { PeriodTabs } from "../src/health-ui";
import { MetricDetails } from "../src/metric-detail";
import { DateRange } from "../src/date-range";
import {
  metricLabels,
  metricOrder,
} from "../src/metric-meta";
import { metricPalette } from "../src/palette";
import type { Entry, MetricKind, MetricStats, Profile } from "../src/types";

export default function MetricDetail() {
  const params = useLocalSearchParams<{ kind?: string; period?: string }>();
  const kind: MetricKind = metricOrder.includes(params.kind as MetricKind)
    ? (params.kind as MetricKind)
    : "water";
  const [period, setPeriod] = useState(
      params.period === "today"
        ? "today"
        : params.period === "month"
          ? "month"
          : "week",
    ),
    [custom, setCustom] = useState<{ from: string; to: string }>();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => api<Profile>("/me", { signal }),
  });
  const zone = me.data?.timezone || "Asia/Ho_Chi_Minh",
    today = DateTime.now().setZone(zone).toISODate()!;
  const from =
      period === "custom" && custom
        ? custom.from
        : DateTime.fromISO(today)
            .minus({
              days: period === "month" ? 29 : period === "today" ? 0 : 6,
            })
            .toISODate()!,
    to = period === "custom" && custom ? custom.to : today;
  const q = useQuery({
    queryKey: ["metric", kind, from, to, zone],
    queryFn: ({ signal }) =>
      api<MetricStats>(`/metrics/${kind}?from=${from}&to=${to}`, { signal }),
    enabled: !!me.data,
  });
  const records = useQuery({
    queryKey: ["entries", from, to, zone],
    queryFn: ({ signal }) =>
      api<Entry[]>(`/entries?from=${from}&to=${to}`, { signal }),
    enabled: !!me.data,
  });
  const data = q.data;
  const palette = metricPalette[kind];
  return (
    <Page
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ghi ${metricLabels[kind].toLowerCase()}`}
          onPress={() =>
            router.push({ pathname: "/entry", params: { kind } })
          }
          style={({ pressed }) => ({
            minHeight: 56,
            borderRadius: 28,
            backgroundColor: palette.deep,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            opacity: pressed ? 0.85 : 1,
            shadowColor: palette.deep,
            shadowOpacity: 0.28,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: 5,
          })}
        >
          <Ionicons name="add" color={C.white} size={22} />
          <Text style={{ color: C.white, fontSize: 16, fontWeight: "700" }}>
            Ghi {metricLabels[kind].toLowerCase()}
          </Text>
        </Pressable>
      }
    >
      <Header back title={metricLabels[kind]} />
      <PeriodTabs
        value={period}
        onChange={setPeriod}
        kind={kind}
      />
      <State query={me}>
        <State query={q}>
          {data ? (
            <MetricDetails
              kind={kind}
              stats={data}
              period={period}
              entries={records.data ?? []}
              zone={zone}
              onOpenRecords={() =>
                router.push({
                  pathname: "/records",
                  params: { kind, from, to },
                })
              }
              recordsPending={records.isPending}
              recordsError={
                records.error instanceof Error
                  ? records.error.message
                  : records.isError
                    ? "Không thể tải bản ghi."
                    : null
              }
            />
          ) : null}
          <Disclosure
            title="Chọn khoảng ngày"
            subtitle="Xem dữ liệu trong khoảng khác"
            icon="calendar-outline"
            accent={palette.deep}
            soft={palette.soft}
            textColor={C.text}
          >
            <DateRange
              from={from}
              to={to}
              accent={palette.deep}
              soft={palette.soft}
              border={palette.border}
              textColor={C.text}
              minHeight={48}
              presets={[
                {
                  label: "7 ngày",
                  from: DateTime.fromISO(today).minus({ days: 6 }).toISODate()!,
                  to: today,
                },
                {
                  label: "30 ngày",
                  from: DateTime.fromISO(today).minus({ days: 29 }).toISODate()!,
                  to: today,
                },
              ]}
              onChange={(a, b) => {
                setCustom({ from: a, to: b });
                setPeriod("custom");
              }}
            />
          </Disclosure>
          <Text style={{ color: C.text, fontSize: 13, lineHeight: 20 }}>
            {kind === "water" || kind === "sleep"
              ? "Nước và giấc ngủ được cộng theo từng ngày. "
              : "Mỗi ngày dùng số đo cuối cùng. "}
            Trung bình chỉ tính các ngày có ghi nhận; đây không phải đánh giá y
            khoa.
          </Text>
        </State>
      </State>
    </Page>
  );
}
