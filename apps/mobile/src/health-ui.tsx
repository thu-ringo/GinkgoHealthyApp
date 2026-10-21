import React, { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DateTime } from "luxon";
import { router } from "expo-router";
import { C, H, Icon, kindIcons, T } from "./ui";
import { metricLabels, metricUnits, metricValue } from "./metric-meta";
import type { MetricKind, MetricStats } from "./types";

export function MetricRow({
  kind,
  value,
  secondary,
  detail,
}: {
  kind: MetricKind;
  value: number | null;
  secondary?: number | null;
  detail: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Thống kê ${metricLabels[kind]}`}
      onPress={() => router.push({ pathname: "/metric", params: { kind } })}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E9EDE6",
        borderRadius: 20,
        backgroundColor: C.white,
        minHeight: 94,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={kindIcons[kind]} size={46} />
      <View style={{ flex: 1, gap: 4 }}>
        <T muted>{metricLabels[kind]}</T>
        <Text style={{ fontSize: 21, color: C.text, fontWeight: "600" }}>
          {metricValue(kind, value, secondary)}{" "}
          <Text style={{ fontSize: 13, color: C.muted, fontWeight: "400" }}>
            {value == null ? "" : metricUnits[kind]}
          </Text>
        </Text>
        <Text style={{ fontSize: 12, color: C.muted }}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.muted} />
    </Pressable>
  );
}
export function PeriodTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (period: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        padding: 4,
        backgroundColor: "#EEF2EB",
        borderRadius: 28,
        gap: 3,
      }}
    >
      {[
        ["today", "Hôm nay"],
        ["week", "7 ngày"],
        ["month", "30 ngày"],
      ].map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: value === key }}
          onPress={() => onChange(key)}
          style={{
            flex: 1,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            backgroundColor: value === key ? C.primary : "transparent",
            paddingHorizontal: 6,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: value === key ? C.white : C.muted,
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function GoalRing({
  value,
  goal,
  children,
}: {
  value: number | null;
  goal: number;
  children: React.ReactNode;
}) {
  const ratio = value == null ? 0 : Math.min(1, Math.max(0, value / goal)),
    size = 210,
    radius = 94;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignSelf: "center",
        alignItems: "center",
        justifyContent: "center",
      }}
      accessible
      accessibilityLabel={
        value == null
          ? "Chưa có dữ liệu mục tiêu"
          : `Đã ghi ${Math.round((value / goal) * 100)} phần trăm mục tiêu`
      }
    >
      {Array.from({ length: 72 }, (_, i) => {
        const angle = (i / 72) * Math.PI * 2 - Math.PI / 2;
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              width: 5,
              height: 12,
              borderRadius: 3,
              backgroundColor: i / 72 < ratio ? C.primary : C.soft,
              left: size / 2 + radius * Math.cos(angle) - 2.5,
              top: size / 2 + radius * Math.sin(angle) - 6,
              transform: [{ rotate: `${i * 5}deg` }],
            }}
          />
        );
      })}
      <View style={{ alignItems: "center", gap: 6 }}>{children}</View>
    </View>
  );
}
export function DailyChart({
  kind,
  days,
}: {
  kind: MetricKind;
  days: MetricStats["days"];
}) {
  const { width } = useWindowDimensions(),
    chart = useRef<ScrollView>(null);
  const pointWidth =
    days.length <= 7
      ? Math.max(25, (Math.min(width, 680) - 88) / Math.max(days.length, 1))
      : 38;
  const values = days.flatMap((d) => (d.value == null ? [] : [d.value])),
    max = Math.max(1, ...values);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <H>Theo từng ngày</H>
        <T muted>
          {kind === "sleep"
            ? "giờ"
            : kind === "mood"
              ? "mức 1–5"
              : metricUnits[kind]}
        </T>
      </View>
      <ScrollView
        ref={chart}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() =>
          chart.current?.scrollToEnd({ animated: false })
        }
        accessibilityLabel={`Biểu đồ ${metricLabels[kind]}`}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            paddingTop: 4,
          }}
        >
          {days.map((d, i) => (
            <View
              key={d.date}
              accessible
              accessibilityLabel={`${d.date}: ${d.value == null ? "chưa ghi" : metricValue(kind, d.value, d.secondary)}`}
              style={{ width: pointWidth, alignItems: "center", gap: 10 }}
            >
              <Text style={{ fontSize: 10, color: C.muted }}>
                {d.value == null
                  ? "—"
                  : kind === "sleep"
                    ? (d.value / 60).toFixed(1)
                    : new Intl.NumberFormat("vi-VN", {
                        maximumFractionDigits: 0,
                      }).format(d.value)}
              </Text>
              <View
                style={{
                  height: 138,
                  width: Math.min(22, pointWidth - 10),
                  backgroundColor: "#F1F4EE",
                  borderRadius: 12,
                  justifyContent: "flex-end",
                  overflow: "hidden",
                }}
              >
                {d.value != null && (
                  <View
                    style={{
                      height: Math.max(3, (d.value / max) * 138),
                      backgroundColor:
                        i === days.length - 1 ? C.primary : C.sage,
                      borderRadius: 12,
                    }}
                  />
                )}
                {kind === "blood_pressure" && d.secondary != null && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: Math.max(0, (d.secondary / max) * 138 - 2),
                      height: 4,
                      width: "100%",
                      backgroundColor: C.accent,
                    }}
                  />
                )}
              </View>
              <Text style={{ fontSize: 10, color: C.muted }}>
                {DateTime.fromISO(d.date).toFormat("dd/MM")}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <T muted>
        {kind === "blood_pressure"
          ? "Cột xanh: tâm thu · Vạch đào: tâm trương. "
          : ""}
        Ngày chưa ghi để trống.
      </T>
    </View>
  );
}
