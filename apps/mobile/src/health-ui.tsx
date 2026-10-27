import React from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { C, Icon, kindIcons } from "./ui";
import {
  metricColors,
  metricLabels,
  metricUnits,
  metricValue,
} from "./metric-meta";
import { metricPalette } from "./palette";
import type { MetricKind } from "./types";

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
  const color = metricColors[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        value == null
          ? `Ghi ${metricLabels[kind]}`
          : `Thống kê ${metricLabels[kind]}`
      }
      onPress={() =>
        router.push(
          value == null
            ? { pathname: "/entry", params: { kind } }
            : { pathname: "/metric", params: { kind } },
        )
      }
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        padding: 16,
        borderWidth: 1,
        borderColor: color.border,
        borderRadius: 20,
        backgroundColor: C.white,
        minHeight: 106,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon
        name={kindIcons[kind]}
        size={52}
        tone={color.background}
        color={color.icon}
        circular
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 15, color: C.text, fontWeight: "600" }}>
          {metricLabels[kind]}
        </Text>
        <Text style={{ fontSize: 24, color: C.text, fontWeight: "700" }}>
          {metricValue(kind, value, secondary)}{" "}
          <Text
            style={{
              fontSize: 14,
              color: C.text,
              fontWeight: "400",
            }}
          >
            {value == null ? "" : metricUnits[kind]}
          </Text>
        </Text>
        {value == null ? (
          <Text
            style={{ fontSize: 13, color: color.icon, fontWeight: "600" }}
          >
            Ghi ngay
          </Text>
        ) : (
          <Text style={{ fontSize: 13, color: C.text }}>{detail}</Text>
        )}
      </View>
      <Ionicons
        name={value == null ? "add-circle-outline" : "chevron-forward"}
        size={value == null ? 22 : 20}
        color={color.icon}
      />
    </Pressable>
  );
}

export function PeriodTabs({
  value,
  onChange,
  kind,
}: {
  value: string;
  onChange: (period: string) => void;
  kind: MetricKind;
}) {
  const palette = metricPalette[kind];
  return (
    <View
      style={{
        flexDirection: "row",
        height: 48,
        backgroundColor: palette.soft,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 16,
        overflow: "hidden",
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
            backgroundColor: value === key ? palette.deep : "transparent",
            paddingHorizontal: 4,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: value === key ? "700" : "500",
              color: value === key ? C.white : C.text,
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
