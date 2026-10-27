import React from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DateTime } from "luxon";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../src/api";
import { C, Empty, kindIcons, Page, State } from "../src/ui";
import { metricPalette } from "../src/palette";
import {
  metricLabels,
  metricOrder,
  metricUnits,
  metricValue,
} from "../src/metric-meta";
import type { Entry, MetricKind, Profile } from "../src/types";

function isDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromISO(value).isValid;
}

export default function Records() {
  const params = useLocalSearchParams<{
    kind?: string;
    from?: string;
    to?: string;
  }>();
  const kind: MetricKind = metricOrder.includes(params.kind as MetricKind)
    ? (params.kind as MetricKind)
    : "water";
  const palette = metricPalette[kind];
  const me = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => api<Profile>("/me", { signal }),
  });
  const zone = me.data?.timezone || "Asia/Ho_Chi_Minh";
  const today = DateTime.now().setZone(zone).toISODate()!;
  const requestedFrom = isDate(params.from)
    ? params.from
    : DateTime.fromISO(today).minus({ days: 6 }).toISODate()!;
  const requestedTo = isDate(params.to) ? params.to : today;
  const from =
      requestedFrom <= requestedTo ? requestedFrom : requestedTo,
    to = requestedFrom <= requestedTo ? requestedTo : requestedFrom;
  const records = useQuery({
    queryKey: ["entries", from, to, zone],
    queryFn: ({ signal }) =>
      api<Entry[]>(`/entries?from=${from}&to=${to}`, { signal }),
    enabled: !!me.data,
  });
  const entries = (records.data ?? [])
    .filter((entry) => entry.kind === kind)
    .sort((a, b) => b.measured_at.localeCompare(a.measured_at));
  const grouped = entries.reduce<Record<string, Entry[]>>((days, entry) => {
    const date = DateTime.fromISO(entry.measured_at)
      .setZone(zone)
      .toISODate()!;
    (days[date] ??= []).push(entry);
    return days;
  }, {});
  const groups = Object.entries(grouped).sort(([a], [b]) =>
    b.localeCompare(a),
  );

  return (
    <Page>
      <View
        style={{
          padding: 16,
          minHeight: 94,
          borderRadius: 24,
          backgroundColor: palette.deep,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          style={{
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={24} color={C.white} />
        </Pressable>
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            accessibilityRole="header"
            style={{ color: C.white, fontSize: 21, fontWeight: "700" }}
          >
            {metricLabels[kind]}
          </Text>
          <Text style={{ color: C.white, fontSize: 14 }}>
            {DateTime.fromISO(from).toFormat("dd/MM/yyyy")} –{" "}
            {DateTime.fromISO(to).toFormat("dd/MM/yyyy")}
          </Text>
        </View>
      </View>

      <State query={me}>
        <State query={records}>
          {!entries.length ? (
            <Empty
              title="Chưa có bản ghi"
              description="Trong khoảng ngày đã chọn chưa có ghi nhận cho chỉ số này."
              icon={kindIcons[kind]}
              iconColor={palette.deep}
              iconTone={palette.soft}
            />
          ) : (
            <View style={{ gap: 20 }}>
              {groups.map(([date, dayEntries]) => {
                const values = dayEntries.flatMap((entry) =>
                  entry.value == null ? [] : [entry.value],
                );
                const dailyTotal = values.length
                  ? values.reduce((sum, value) => sum + value, 0)
                  : null;
                return (
                  <View key={date} style={{ gap: 10 }}>
                    <View style={{ gap: 3 }}>
                      <Text
                        accessibilityRole="header"
                        style={{
                          color: C.text,
                          fontSize: 17,
                          fontWeight: "700",
                          textTransform: "capitalize",
                        }}
                      >
                        {DateTime.fromISO(date)
                          .setLocale("vi")
                          .toFormat("cccc, dd/MM/yyyy")}
                      </Text>
                      {(kind === "water" || kind === "sleep") &&
                      dailyTotal != null ? (
                        <Text style={{ color: C.text, fontSize: 14 }}>
                          Tổng ngày: {metricValue(kind, dailyTotal)}{" "}
                          {metricUnits[kind]}
                        </Text>
                      ) : null}
                    </View>
                    {dayEntries.map((entry) => (
                      <Pressable
                        key={entry.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Sửa bản ghi ${metricLabels[kind]} ${metricValue(kind, entry.value, entry.secondary)} ${metricUnits[kind]} lúc ${DateTime.fromISO(entry.measured_at).setZone(zone).toFormat("HH:mm")}`}
                        onPress={() =>
                          router.push({
                            pathname: "/entry",
                            params: { record: JSON.stringify(entry) },
                          })
                        }
                        style={({ pressed }) => ({
                          minHeight: 76,
                          padding: 12,
                          borderRadius: 18,
                          backgroundColor: C.white,
                          borderWidth: 1,
                          borderColor: palette.border,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          opacity: pressed ? 0.82 : 1,
                        })}
                      >
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: palette.soft,
                          }}
                        >
                          <Ionicons
                            name={kindIcons[kind]}
                            size={24}
                            color={palette.deep}
                          />
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text
                            style={{
                              color: C.text,
                              fontSize: 22,
                              fontWeight: "700",
                            }}
                          >
                            {metricValue(kind, entry.value, entry.secondary)}{" "}
                            <Text
                              style={{
                                color: C.text,
                                fontSize: 14,
                                fontWeight: "500",
                              }}
                            >
                              {metricUnits[kind]}
                            </Text>
                          </Text>
                          <Text style={{ color: C.text, fontSize: 14 }}>
                            {DateTime.fromISO(entry.measured_at)
                              .setZone(zone)
                              .toFormat("HH:mm")}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={palette.deep}
                        />
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </View>
          )}
        </State>
      </State>
    </Page>
  );
}
