import React, { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DateTime } from "luxon";
import { useReducedMotion } from "./use-reduced-motion";

type Tone = { deep: string; soft: string; border: string };
export type DatePickerSelection = string | { from: string; to: string };
type QuickRange = { label: string; from: string; to: string };

function date(value: string) {
  return DateTime.fromISO(value, { zone: "utc" }).startOf("day");
}

function dateInBounds(
  value: string,
  minDate?: string,
  maxDate?: string,
) {
  return (
    (!minDate || value >= minDate) &&
    (!maxDate || value <= maxDate)
  );
}

export function DatePickerSheet({
  visible,
  mode,
  value,
  range,
  today,
  minDate,
  maxDate,
  maxDays,
  tone,
  title,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  mode: "single" | "range";
  value?: string;
  range?: { from: string; to: string };
  today: string;
  minDate?: string;
  maxDate?: string;
  maxDays?: number;
  tone: Tone;
  title: string;
  onCancel: () => void;
  onConfirm: (value: DatePickerSelection) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [month, setMonth] = useState(() => date(value || range?.from || today).startOf("month"));
  const [selected, setSelected] = useState(value || today);
  const [start, setStart] = useState(range?.from || "");
  const [end, setEnd] = useState(range?.to || "");
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const [rangeError, setRangeError] = useState("");

  const quickRanges = useMemo<QuickRange[]>(() => {
    const current = date(today);
    const ranges = [
      {
        label: "Tuần này",
        from: current.startOf("week").toISODate()!,
        to: today,
      },
      {
        label: "Tháng này",
        from: current.startOf("month").toISODate()!,
        to: today,
      },
      {
        label: "Tháng trước",
        from: current.minus({ months: 1 }).startOf("month").toISODate()!,
        to: current.minus({ months: 1 }).endOf("month").toISODate()!,
      },
      {
        label: "90 ngày",
        from: current.minus({ days: 89 }).toISODate()!,
        to: today,
      },
    ];
    return ranges.filter(
      (item) =>
        (!maxDays || date(item.to).diff(date(item.from), "days").days + 1 <= maxDays) &&
        dateInBounds(item.from, minDate, maxDate) &&
        dateInBounds(item.to, minDate, maxDate),
    );
  }, [today, maxDays, minDate, maxDate]);

  const daysInMonth = month.daysInMonth ?? 30;
  const firstWeekday = month.weekday - 1;
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) =>
      month.set({ day: index + 1 }).toISODate()!,
    ),
  ];
  while (cells.length % 7) cells.push(null);

  const isWithinMaxDays = (from: string, to: string) =>
    !maxDays || date(to).diff(date(from), "days").days + 1 <= maxDays;

  const chooseDay = (day: string) => {
    if (!dateInBounds(day, minDate, maxDate)) return;
    if (mode === "single") {
      setSelected(day);
      return;
    }
    if (!awaitingEnd || !start) {
      setStart(day);
      setEnd("");
      setAwaitingEnd(true);
      setRangeError("");
      return;
    }
    if (day < start) {
      setEnd(day);
      setRangeError("Ngày bắt đầu không được sau ngày kết thúc.");
      return;
    }
    if (!isWithinMaxDays(start, day)) {
      setEnd("");
      setRangeError(`Khoảng ngày không được vượt quá ${maxDays} ngày.`);
      return;
    }
    setEnd(day);
    setAwaitingEnd(false);
    setRangeError("");
  };

  const applyQuickRange = (item: QuickRange) => {
    setStart(item.from);
    setEnd(item.to);
    setAwaitingEnd(false);
    setRangeError("");
    setMonth(date(item.from).startOf("month"));
  };

  const selectedRange = start && end
    ? `${date(start).toFormat("dd/MM/yyyy")} – ${date(end).toFormat("dd/MM/yyyy")} · ${date(end).diff(date(start), "days").days + 1} ngày`
    : start
      ? `${date(start).toFormat("dd/MM/yyyy")} – Chọn ngày kết thúc`
      : "Chọn ngày bắt đầu và kết thúc";
  const canConfirm = mode === "single"
    ? dateInBounds(selected, minDate, maxDate)
    : Boolean(start && end && start <= end && isWithinMaxDays(start, end) && !rangeError);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? "none" : "slide"}
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(22, 34, 31, 0.42)",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 460,
            alignSelf: "center",
            maxHeight: "94%",
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 18,
            paddingTop: 22,
            paddingBottom: 28,
            gap: 16,
          }}
        >
          <Text accessibilityRole="header" style={{ color: "#202B29", fontSize: 20, fontWeight: "700" }}>
            {title}
          </Text>
          {mode === "range" && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {quickRanges.map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}, ${date(item.from).toFormat("dd/MM/yyyy")} đến ${date(item.to).toFormat("dd/MM/yyyy")}`}
                  onPress={() => applyQuickRange(item)}
                  style={{
                    minHeight: 48,
                    paddingHorizontal: 14,
                    justifyContent: "center",
                    borderRadius: 16,
                    backgroundColor: start === item.from && end === item.to ? tone.deep : tone.soft,
                  }}
                >
                  <Text style={{ color: start === item.from && end === item.to ? "#FFFFFF" : "#202B29", fontSize: 14, fontWeight: "700" }}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tháng trước"
              onPress={() => setMonth((current) => current.minus({ months: 1 }))}
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="chevron-back" size={22} color="#202B29" />
            </Pressable>
            <Text accessibilityRole="header" style={{ color: "#202B29", fontSize: 20, fontWeight: "700" }}>
              {month.setLocale("vi").toFormat("'Tháng' L/yyyy")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tháng sau"
              onPress={() => setMonth((current) => current.plus({ months: 1 }))}
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="chevron-forward" size={22} color="#202B29" />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((weekday) => (
              <Text key={weekday} style={{ width: 44, textAlign: "center", color: "#3F4A47", fontSize: 13, fontWeight: "600" }}>
                {weekday}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" }}>
            {cells.map((day, index) => {
              if (!day) return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 48 }} />;
              const rangeLimitExceeded =
                mode === "range" &&
                awaitingEnd &&
                Boolean(start) &&
                !isWithinMaxDays(day < start ? day : start, day < start ? start : day);
              const disabled = !dateInBounds(day, minDate, maxDate) || rangeLimitExceeded;
              const chosen = mode === "single"
                ? day === selected
                : day === start || day === end;
              const between = mode === "range" && Boolean(start && end && day > start && day < end);
              const isToday = day === today;
              return (
                <View key={day} style={{ width: `${100 / 7}%`, height: 48, alignItems: "center", justifyContent: "center" }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={date(day).setLocale("vi").toFormat("cccc dd/MM/yyyy")}
                    accessibilityState={{ selected: chosen, disabled }}
                    disabled={disabled}
                    onPress={() => chooseDay(day)}
                    style={{
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 22,
                      backgroundColor: chosen ? tone.deep : between ? tone.soft : "transparent",
                      borderWidth: isToday && !chosen ? 1.5 : 0,
                      borderColor: tone.deep,
                      opacity: disabled ? 0.3 : 1,
                    }}
                  >
                    <Text style={{ color: chosen ? "#FFFFFF" : "#202B29", fontSize: 15, fontWeight: chosen || isToday ? "700" : "500" }}>
                      {date(day).day}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
          {mode === "range" && (
            <Text accessibilityLiveRegion="polite" style={{ color: "#202B29", fontSize: 16, fontWeight: "700", textAlign: "center" }}>
              {rangeError || selectedRange}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hủy chọn ngày"
              onPress={onCancel}
              style={{ flex: 1, minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 16, borderWidth: 1, borderColor: tone.border }}
            >
              <Text style={{ color: "#202B29", fontSize: 16, fontWeight: "700" }}>Hủy</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xác nhận ngày đã chọn"
              accessibilityState={{ disabled: !canConfirm }}
              disabled={!canConfirm}
              onPress={() => onConfirm(mode === "single" ? selected : { from: start, to: end })}
              style={{ flex: 1, minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: tone.deep, opacity: canConfirm ? 1 : 0.45 }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
                {mode === "range" ? "Áp dụng" : "Xong"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
