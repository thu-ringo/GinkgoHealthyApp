import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { DateTime } from "luxon";
import { useQuery } from "@tanstack/react-query";
import { api } from "../src/api";
import {
  Button,
  Card,
  C,
  Disclosure,
  Empty,
  Header,
  Icon,
  kindIcons,
  Page,
  Section,
  State,
  T,
} from "../src/ui";
import { DailyChart, GoalRing, PeriodTabs } from "../src/health-ui";
import { DateRange } from "../src/date-range";
import {
  metricLabels,
  metricOrder,
  metricUnits,
  metricValue,
} from "../src/metric-meta";
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
  const data = q.data,
    summed = kind === "water" || kind === "sleep";
  const value = summed
    ? from === to
      ? data?.summary.total
      : data?.summary.average
    : data?.summary.latest;
  const secondary = !summed ? data?.summary.latestSecondary : null;
  return (
    <Page
      footer={
        <Button
          title={`Ghi ${metricLabels[kind].toLowerCase()}`}
          icon="add"
          onPress={() => router.push({ pathname: "/entry", params: { kind } })}
        />
      }
    >
      <Header back title={metricLabels[kind]} />
      <PeriodTabs value={period} onChange={setPeriod} />
      <State query={me}>
        <State query={q}>
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 4 }}>
            <T muted>
              {summed
                ? from === to
                  ? "Tổng đã ghi trong ngày"
                  : "Trung bình mỗi ngày có ghi"
                : "Số đo gần nhất trong khoảng"}
            </T>
            {kind === "water" && data?.goal ? (
              <GoalRing value={value ?? null} goal={data.goal}>
                <Icon name="water-outline" size={36} />
                <Text
                  style={{
                    color: C.primary,
                    fontSize: 34,
                    fontWeight: "700",
                    letterSpacing: -1,
                  }}
                >
                  {metricValue(kind, value)}
                </Text>
                <T muted>ml</T>
                <Text style={{ fontSize: 13, color: C.primary }}>
                  {value == null
                    ? "Chưa có số liệu"
                    : `${Math.round((value / data.goal) * 100)}% mục tiêu`}
                </Text>
              </GoalRing>
            ) : (
              <>
                <Icon name={kindIcons[kind]} size={50} />
                <Text
                  style={{
                    color: C.primary,
                    fontSize: kind === "blood_pressure" ? 39 : 44,
                    fontWeight: "700",
                    letterSpacing: -1,
                  }}
                >
                  {metricValue(kind, value, secondary)}{" "}
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "400",
                      letterSpacing: 0,
                    }}
                  >
                    {value == null ? "" : metricUnits[kind]}
                  </Text>
                </Text>
              </>
            )}
            {data?.goal != null && (
              <T muted>
                Mục tiêu mỗi ngày: {metricValue(kind, data.goal)}{" "}
                {metricUnits[kind]}
              </T>
            )}
            <Text style={{ fontSize: 12, color: C.muted }}>
              {DateTime.fromISO(from).toFormat("dd/MM")} –{" "}
              {DateTime.fromISO(to).toFormat("dd/MM/yyyy")} ·{" "}
              {data?.summary.recordedDays ?? 0}/{data?.summary.periodDays ?? 0}{" "}
              ngày có ghi
            </Text>
          </View>
          <Card>
            <DailyChart kind={kind} days={data?.days || []} />
          </Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[
              {
                label: summed ? "Tổng trong khoảng" : "Trung bình/ngày có ghi",
                value: summed ? data?.summary.total : data?.summary.average,
                secondary:
                  kind === "blood_pressure"
                    ? data?.summary.averageSecondary
                    : null,
              },
              {
                label: "Ngày ghi cao nhất",
                value: data?.summary.max,
                secondary: null,
              },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  minWidth: 122,
                  padding: 16,
                  gap: 8,
                  borderRadius: 18,
                  backgroundColor: C.white,
                  borderWidth: 1,
                  borderColor: "#E9EDE6",
                }}
              >
                <T muted>{item.label}</T>
                <Text
                  style={{ color: C.text, fontWeight: "600", fontSize: 20 }}
                >
                  {metricValue(kind, item.value, item.secondary)}{" "}
                  <Text
                    style={{ fontSize: 12, fontWeight: "400", color: C.muted }}
                  >
                    {item.value == null ? "" : metricUnits[kind]}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
          {kind === "blood_pressure" && (
            <T muted>
              Giá trị cao nhất ở trên là tâm thu. Biểu đồ giữ cặp tâm thu/tâm
              trương của số đo cuối mỗi ngày.
            </T>
          )}
          <Section
            title="Ghi nhận gần đây"
            action={<T muted>{data?.summary.recordCount ?? 0} bản ghi</T>}
          />
          <State query={records}>
            {!records.data?.some((e) => e.kind === kind) && (
              <Empty
                title="Chưa có bản ghi"
                description="Thêm bản ghi để bắt đầu theo dõi chỉ số này."
                icon={kindIcons[kind]}
              />
            )}
            {records.data
              ?.filter((e) => e.kind === kind)
              .slice(0, 5)
              .map((e) => (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Sửa bản ghi ${metricLabels[kind]} ${DateTime.fromISO(e.measured_at).setZone(zone).toFormat("dd/MM HH:mm")}`}
                  onPress={() =>
                    router.push({
                      pathname: "/entry",
                      params: { record: JSON.stringify(e) },
                    })
                  }
                  style={{
                    minHeight: 62,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: C.white,
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontWeight: "600", color: C.text, fontSize: 16 }}
                    >
                      {metricValue(kind, e.value, e.secondary)}{" "}
                      {metricUnits[kind]}
                    </Text>
                    <T muted>
                      {DateTime.fromISO(e.measured_at)
                        .setZone(zone)
                        .toFormat("HH:mm · dd/MM/yyyy")}
                    </T>
                  </View>
                  <Ionicons name="chevron-forward" color={C.muted} size={17} />
                </Pressable>
              ))}
          </State>
          <Disclosure
            title="Chọn khoảng ngày"
            subtitle="Xem dữ liệu trong khoảng khác"
            icon="calendar-outline"
          >
            <DateRange
              from={from}
              to={to}
              presets={[]}
              onChange={(a, b) => {
                setCustom({ from: a, to: b });
                setPeriod("custom");
              }}
            />
          </Disclosure>
          <T muted>
            {summed
              ? "Nước và giấc ngủ được cộng theo từng ngày. "
              : "Mỗi ngày dùng số đo cuối cùng. "}
            Trung bình chỉ tính các ngày có ghi nhận; đây không phải đánh giá y
            khoa.
          </T>
        </State>
      </State>
    </Page>
  );
}
