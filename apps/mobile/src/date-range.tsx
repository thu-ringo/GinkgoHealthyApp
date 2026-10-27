import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DateTime } from "luxon";
import { C } from "./ui";
import { DatePickerSheet } from "./date-picker";

export function DateRange({
  from,
  to,
  onChange,
  presets,
  accent,
  tone,
  soft,
  border,
  textColor,
  minHeight = 42,
  variant,
  selectedMode,
  onModeChange,
  today,
  maxDays = 90,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  presets: { label: string; from: string; to: string }[];
  accent?: string;
  tone?: string;
  soft?: string;
  border?: string;
  textColor?: string;
  minHeight?: number;
  variant?: "reminders" | "journal";
  selectedMode?: "today" | "last30days" | "7days" | "30days" | "custom";
  onModeChange?: (
    mode: "today" | "last30days" | "7days" | "30days" | "custom",
  ) => void;
  today?: string;
  maxDays?: number;
}) {
  const accentColor = accent ?? tone ?? C.primary;
  const mutedTextColor = textColor ?? C.muted;
  const [showOptions, setShowOptions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const end = DateTime.fromISO(to);
  if (variant === "journal") {
    const currentDay = DateTime.fromISO(today ?? to, { zone: "utc" });
    const mode = selectedMode === "30days" ? "30days" : selectedMode === "custom" ? "custom" : "7days";
    const shiftRange = (direction: -1 | 1) => {
      if (mode === "custom") {
        setShowDatePicker(true);
        return;
      }
      const span = mode === "30days" ? 30 : 7;
      const nextEnd = DateTime.fromISO(to, { zone: "utc" }).plus({ days: direction * span });
      if (nextEnd > currentDay) {
        const clampedEnd = currentDay;
        onChange(clampedEnd.minus({ days: span - 1 }).toISODate()!, clampedEnd.toISODate()!);
        return;
      }
      onChange(
        nextEnd.minus({ days: span - 1 }).toISODate()!,
        nextEnd.toISODate()!,
      );
    };
    const selectMode = (next: "7days" | "30days" | "custom") => {
      if (next === "custom") {
        setShowDatePicker(true);
        return;
      }
      onModeChange?.(next);
      const span = next === "30days" ? 30 : 7;
      onChange(currentDay.minus({ days: span - 1 }).toISODate()!, currentDay.toISODate()!);
    };

    return (
      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            padding: 3,
            gap: 3,
            borderRadius: 24,
            backgroundColor: "#EDF2ED",
          }}
        >
          {([
            ["7days", "7 ngày"],
            ["30days", "30 ngày"],
            ["custom", "Tùy chọn"],
          ] as const).map(([id, label]) => {
            const selected = mode === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={() => selectMode(id)}
                style={{
                  flex: 1,
                  minHeight: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 21,
                  backgroundColor: selected ? "#287A56" : "transparent",
                }}
              >
                <Text style={{ color: selected ? "#FFFFFF" : "#52695D", fontSize: 14, fontWeight: selected ? "700" : "500" }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View
          style={{
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 4,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#DFE8E1",
            backgroundColor: "#FFFFFF",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Khoảng thời gian trước"
            onPress={() => shiftRange(-1)}
            style={{ minWidth: 40, minHeight: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="chevron-back" size={20} color="#287A56" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chọn khoảng ngày"
            onPress={() => setShowDatePicker(true)}
            style={{ flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <Ionicons name="calendar-outline" size={21} color="#287A56" />
            <Text numberOfLines={1} style={{ color: "#20332B", fontSize: 14, fontWeight: "600" }}>
              {DateTime.fromISO(from, { zone: "utc" }).toFormat("dd/MM/yyyy")} – {DateTime.fromISO(to, { zone: "utc" }).toFormat("dd/MM/yyyy")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Khoảng thời gian tiếp theo"
            accessibilityState={{ disabled: to >= (today ?? to) }}
            disabled={to >= (today ?? to)}
            onPress={() => shiftRange(1)}
            style={{ minWidth: 40, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: to >= (today ?? to) ? 0.4 : 1 }}
          >
            <Ionicons name="chevron-forward" size={20} color="#287A56" />
          </Pressable>
        </View>
        {showDatePicker && (
          <DatePickerSheet
            key={`${from}-${to}`}
            visible
            mode="range"
            range={{ from, to }}
            today={today ?? to}
            maxDate={today ?? to}
            maxDays={maxDays}
            tone={{ deep: "#287A56", soft: "#E8F5EE", border: "#DFE8E1" }}
            title="Chọn khoảng ngày"
            onCancel={() => setShowDatePicker(false)}
            onConfirm={(selection) => {
              if (typeof selection === "string") return;
              onChange(selection.from, selection.to);
              onModeChange?.("custom");
              setShowDatePicker(false);
            }}
          />
        )}
      </View>
    );
  }
  if (variant === "reminders") {
    const current = DateTime.fromISO(today ?? to, { zone: "utc" });
    const safeRanges = [
      {
        label: "Tuần này",
        from: current.startOf("week").toISODate()!,
        to: today ?? to,
      },
      {
        label: "Tháng này",
        from: current.startOf("month").toISODate()!,
        to: today ?? to,
      },
      {
        label: "Tháng trước",
        from: current.minus({ months: 1 }).startOf("month").toISODate()!,
        to: current.minus({ months: 1 }).endOf("month").toISODate()!,
      },
      {
        label: "90 ngày",
        from: current.minus({ days: maxDays - 1 }).toISODate()!,
        to: today ?? to,
      },
    ].filter((range) => {
      const start = DateTime.fromISO(range.from, { zone: "utc" });
      const finish = DateTime.fromISO(range.to, { zone: "utc" });
      return finish.diff(start, "days").days + 1 <= maxDays;
    });
    const selectedQuickRange = safeRanges.find(
      (range) => range.from === from && range.to === to,
    );
    const toneColor = tone ?? accentColor;
    const softColor = soft ?? "#E1F3F4";
    const borderColor = border ?? "#B9E0E3";
    const mode = selectedMode ?? (from === (today ?? to) && to === (today ?? to) ? "today" : "custom");
    const chooseMode = (nextMode: "today" | "last30days" | "custom") => {
      onModeChange?.(nextMode);
      if (nextMode === "custom") setShowOptions(true);
      else setShowOptions(false);
      if (nextMode === "today") onChange(today ?? to, today ?? to);
      if (nextMode === "last30days") {
        onChange(
          current.minus({ days: 29 }).toISODate()!,
          today ?? to,
        );
      }
    };

    return (
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 20, backgroundColor: softColor, borderWidth: 1, borderColor: borderColor }}>
          {[
            { id: "today" as const, label: "Hôm nay" },
            { id: "last30days" as const, label: "30 ngày" },
            { id: "custom" as const, label: "Tùy chọn" },
          ].map((item) => {
            const selected = mode === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected }}
                onPress={() => chooseMode(item.id)}
                style={{
                  flex: 1,
                  minHeight: 52,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  borderRadius: 16,
                  backgroundColor: selected ? toneColor : "transparent",
                }}
              >
                {item.id === "custom" && (
                  <Ionicons name="calendar" size={18} color={selected ? "#FFFFFF" : C.text} />
                )}
                <Text style={{ color: selected ? "#FFFFFF" : C.text, fontSize: 15, fontWeight: "700" }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {mode === "custom" && (
          <View style={{ padding: 12, gap: 10, borderRadius: 20, backgroundColor: softColor }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {safeRanges.map((range) => {
                const selected = selectedQuickRange?.label === range.label;
                return (
                  <Pressable
                    key={range.label}
                    accessibilityRole="button"
                    accessibilityLabel={`${range.label}, ${DateTime.fromISO(range.from, { zone: "utc" }).toFormat("dd/MM/yyyy")} đến ${DateTime.fromISO(range.to, { zone: "utc" }).toFormat("dd/MM/yyyy")}`}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onModeChange?.("custom");
                      onChange(range.from, range.to);
                    }}
                    style={{
                      width: "48%",
                      minHeight: 84,
                      padding: 10,
                      justifyContent: "center",
                      borderRadius: 16,
                      backgroundColor: selected ? toneColor : "#FFFFFF",
                      borderWidth: selected ? 0 : 1,
                      borderColor,
                    }}
                  >
                    <Text style={{ color: selected ? "#FFFFFF" : C.text, fontSize: 16, fontWeight: "700" }}>
                      {range.label}
                    </Text>
                    <Text style={{ color: selected ? "#FFFFFF" : C.text, fontSize: 13, marginTop: 4 }}>
                      {DateTime.fromISO(range.from, { zone: "utc" }).toFormat("dd/MM")} – {DateTime.fromISO(range.to, { zone: "utc" }).toFormat("dd/MM")}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ position: "absolute", right: 9, top: 8 }} />}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn khoảng ngày trên lịch"
              onPress={() => setShowDatePicker(true)}
              style={{ minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, borderWidth: 1, borderColor: toneColor, backgroundColor: "#FFFFFF" }}
            >
              <Ionicons name="calendar-outline" size={21} color={toneColor} />
              <Text style={{ color: toneColor, fontSize: 15, fontWeight: "700" }}>Chọn ngày trên lịch</Text>
            </Pressable>
          </View>
        )}
        <View style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor }}>
          <Ionicons name="calendar" size={22} color={toneColor} />
          <Text style={{ color: C.text, flex: 1, fontSize: 16, fontWeight: "700" }}>
            {DateTime.fromISO(from, { zone: "utc" }).toFormat("dd/MM/yyyy")} – {DateTime.fromISO(to, { zone: "utc" }).toFormat("dd/MM/yyyy")}
          </Text>
          <Text style={{ color: toneColor, fontSize: 12, fontWeight: "700", backgroundColor: softColor, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 }}>
            {mode === "today" ? "Hôm nay" : mode === "last30days" ? "30 ngày" : selectedQuickRange?.label ?? "Tùy chọn"}
          </Text>
        </View>
        {showDatePicker && (
          <DatePickerSheet
            key={`${from}-${to}`}
            visible
            mode="range"
            range={{ from, to }}
            today={today ?? to}
            maxDate={today ?? to}
            maxDays={maxDays}
            tone={{ deep: toneColor, soft: softColor, border: borderColor }}
            title="Chọn khoảng ngày"
            onCancel={() => setShowDatePicker(false)}
            onConfirm={(selection) => {
              if (typeof selection === "string") return;
              onChange(selection.from, selection.to);
              onModeChange?.("custom");
              setShowDatePicker(false);
            }}
          />
        )}
      </View>
    );
  }
  const quickRanges = [
    {
      label: "Tuần này",
      from: end.startOf("week").toISODate()!,
      to,
    },
    {
      label: "Tháng này",
      from: end.startOf("month").toISODate()!,
      to,
    },
    {
      label: "Tháng trước",
      from: end.minus({ months: 1 }).startOf("month").toISODate()!,
      to: end.minus({ months: 1 }).endOf("month").toISODate()!,
    },
    {
      label: "90 ngày",
      from: end.minus({ days: 89 }).toISODate()!,
      to,
    },
  ];
  const selectedPreset = presets.find(
    (preset) => preset.from === from && preset.to === to,
  );
  const isQuickRange = quickRanges.some(
    (range) => range.from === from && range.to === to,
  );

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          padding: 4,
          gap: 3,
          borderRadius: 24,
          backgroundColor: soft ?? "#EEF2EB",
          ...(border ? { borderWidth: 1, borderColor: border } : {}),
        }}
      >
        {presets.map((preset) => (
          <RangeButton
            key={preset.label}
            label={preset.label}
            selected={selectedPreset === preset}
            accent={accentColor}
            textColor={mutedTextColor}
            minHeight={minHeight}
            onPress={() => {
              setShowOptions(false);
              onChange(preset.from, preset.to);
            }}
          />
        ))}
        <RangeButton
          label="Tùy chọn"
          selected={showOptions || (!selectedPreset && isQuickRange)}
          accent={accentColor}
          textColor={mutedTextColor}
          minHeight={minHeight}
          onPress={() => setShowOptions(!showOptions)}
        />
      </View>
      {showOptions && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {quickRanges.map((range) => (
            <Pressable
              key={range.label}
              accessibilityRole="button"
              accessibilityLabel={range.label}
              accessibilityState={{
                selected: range.from === from && range.to === to,
              }}
              onPress={() => {
                onChange(range.from, range.to);
                setShowOptions(false);
              }}
              style={{
                minHeight,
                justifyContent: "center",
                paddingHorizontal: 14,
                borderRadius: 16,
                backgroundColor:
                  range.from === from && range.to === to
                    ? soft ?? C.soft
                    : C.white,
                borderWidth: 1,
                borderColor:
                  range.from === from && range.to === to
                    ? accentColor
                    : C.border,
              }}
            >
              <Text
                style={{
                  color:
                    range.from === from && range.to === to
                      ? accentColor
                      : C.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {range.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name="calendar-outline" size={18} color={mutedTextColor} />
        <Text style={{ color: mutedTextColor, fontSize: 14 }}>
          {DateTime.fromISO(from).toFormat("dd/MM/yyyy")} –{" "}
          {DateTime.fromISO(to).toFormat("dd/MM/yyyy")}
        </Text>
      </View>
    </View>
  );
}

function RangeButton({
  label,
  selected,
  accent,
  textColor,
  minHeight,
  onPress,
}: {
  label: string;
  selected: boolean;
  accent: string;
  textColor: string;
  minHeight: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
        borderRadius: 20,
        backgroundColor: selected ? accent : "transparent",
      }}
    >
      <Text
        style={{
          color: selected ? C.white : textColor,
          fontSize: 14,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
