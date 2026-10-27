import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DateTime } from "luxon";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { Entry, Profile } from "./types";
import { Icon, kindIcons } from "./ui";
import { useReducedMotion } from "./use-reduced-motion";

type ReportKind = "water" | "sleep" | "weight" | "heart_rate";
type Tone = { color: string; background: string; border: string };
type Point = { date: string; value: number | null };

const kinds: ReportKind[] = ["water", "sleep", "weight", "heart_rate"];
const labels: Record<ReportKind, string> = {
  water: "Nước uống",
  sleep: "Giấc ngủ",
  weight: "Cân nặng",
  heart_rate: "Nhịp tim",
};
const tones: Record<ReportKind, Tone> = {
  water: { color: "#087FD1", background: "#E7F4FF", border: "#7EC5FA" },
  sleep: { color: "#6945D8", background: "#F2ECFF", border: "#BA9AFF" },
  weight: { color: "#07865C", background: "#E9F7EF", border: "#78C8A4" },
  heart_rate: { color: "#E42C59", background: "#FFF0F3", border: "#FF9BB5" },
};

function number(value: number, precision = 1): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: precision,
  }).format(value);
}

function displayValue(kind: ReportKind, value: number): string {
  if (kind === "water") return `${number(value, 0)} ml`;
  if (kind === "sleep") return `${number(value / 60)} giờ`;
  if (kind === "weight") return `${number(value)} kg`;
  return `${number(value, 0)} bpm`;
}

function dayKey(entry: Entry, zone: string): string {
  return DateTime.fromISO(entry.measured_at).setZone(zone).toISODate()!;
}

export function valuesByDay(
  entries: Entry[],
  dates: string[],
  zone: string,
): Record<ReportKind, Point[]> {
  const grouped = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (!kinds.includes(entry.kind as ReportKind)) continue;
    const key = dayKey(entry, zone);
    const current = grouped.get(key) ?? [];
    current.push(entry);
    grouped.set(key, current);
  }
  return Object.fromEntries(
    kinds.map((kind) => [
      kind,
      dates.map((date) => {
        const rows = (grouped.get(date) ?? [])
          .filter((entry) => entry.kind === kind && entry.value != null)
          .sort((a, b) => a.measured_at.localeCompare(b.measured_at));
        if (!rows.length) return { date, value: null };
        if (kind === "water" || kind === "sleep") {
          return {
            date,
            value: rows.reduce((sum, entry) => sum + Number(entry.value), 0),
          };
        }
        if (kind === "weight") {
          return { date, value: Number(rows[rows.length - 1].value) };
        }
        return {
          date,
          value:
            rows.reduce((sum, entry) => sum + Number(entry.value), 0) /
            rows.length,
        };
      }),
    ]),
  ) as Record<ReportKind, Point[]>;
}

export function HealthReport({
  entries,
  dates,
  zone,
  profile,
}: {
  entries: Entry[];
  dates: string[];
  zone: string;
  profile?: Profile;
}) {
  const [selected, setSelected] = useState<ReportKind | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const [transition] = useState(() => new Animated.Value(1));
  const series = useMemo(
    () => valuesByDay(entries, dates, zone),
    [entries, dates, zone],
  );
  const selectedTone = selected ? tones[selected] : null;
  const selectedPoints = selected ? series[selected] : [];
  const selectedPoint =
    selectedPoints.find((point) => point.date === selectedDay) ?? null;
  const recordedValues = (kind: ReportKind) =>
    series[kind].flatMap((point) =>
      point.value == null ? [] : [point.value],
    );
  const values = {
    water: recordedValues("water"),
    sleep: recordedValues("sleep"),
    weight: recordedValues("weight"),
    heart_rate: recordedValues("heart_rate"),
  };
  const average = (items: number[]) =>
    items.length
      ? items.reduce((sum, item) => sum + item, 0) / items.length
      : null;
  const currentWeight = values.weight[values.weight.length - 1];
  const previousWeight = values.weight[values.weight.length - 2];
  const heartRateEntries = entries.filter(
    (entry) => entry.kind === "heart_rate" && entry.value != null,
  );
  const averageHeartRate = heartRateEntries.length
    ? heartRateEntries.reduce((sum, entry) => sum + Number(entry.value), 0) /
      heartRateEntries.length
    : null;
  const cardValues: Record<ReportKind, { value: string; detail: string }> = {
    water: {
      value:
        average(values.water) == null
          ? "Chưa có dữ liệu"
          : displayValue("water", average(values.water)!),
      detail: "Trung bình mỗi ngày có ghi",
    },
    sleep: {
      value:
        average(values.sleep) == null
          ? "Chưa có dữ liệu"
          : displayValue("sleep", average(values.sleep)!),
      detail: "Trung bình mỗi đêm có ghi",
    },
    weight: {
      value:
        currentWeight == null
          ? "Chưa có dữ liệu"
          : displayValue("weight", currentWeight),
      detail:
        currentWeight != null && previousWeight != null
          ? `Thay đổi ${number(currentWeight - previousWeight)} kg`
          : "Lần ghi gần nhất",
    },
    heart_rate: {
      value: averageHeartRate == null
        ? "Chưa có dữ liệu"
        : displayValue("heart_rate", averageHeartRate),
      detail: "Trung bình các lần đo",
    },
  };
  const reportWidth = gridWidth > 0 ? (gridWidth - 10) / 2 : undefined;
  const history =
    selected == null
      ? []
      : entries
          .filter((entry) => entry.kind === selected && entry.value != null)
          .sort((a, b) => b.measured_at.localeCompare(a.measured_at))
          .slice(0, 10);

  useEffect(() => {
    if (reducedMotion) {
      transition.setValue(1);
      return;
    }
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [selected, reducedMotion, transition]);

  const selectKind = (kind: ReportKind | null) => {
    setSelected(kind);
    setSelectedDay(null);
  };

  return (
    <View style={{ gap: 12 }}>
      <View
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
      >
        {kinds.map((kind) => {
          const tone = tones[kind];
          const active = selected === kind;
          const iconName =
            kind === "water"
              ? "water-outline"
              : kind === "sleep"
                ? "moon-outline"
                : kind === "weight"
                  ? "scale-outline"
                  : "heart-outline";
          return (
            <Pressable
              key={kind}
              accessibilityRole="button"
              accessibilityLabel={`${labels[kind]}: ${cardValues[kind].value}`}
              accessibilityState={{ selected: active }}
              onPress={() => selectKind(active ? null : kind)}
              style={({ pressed }) => ({
                width: reportWidth,
                minHeight: 112,
                padding: 12,
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                borderRadius: 17,
                backgroundColor: active ? tone.color : tone.background,
                borderWidth: active ? 2.5 : 1,
                borderColor: active ? tone.color : tone.border,
                opacity: pressed ? 0.82 : 1,
              })}
            >
              <Ionicons
                name={iconName}
                size={31}
                color={active ? "#FFFFFF" : tone.color}
              />
              <Text
                style={{
                  color: active ? "#FFFFFF" : "#20332B",
                  fontSize: active ? 15 : 14,
                  fontWeight: active ? "700" : "600",
                }}
              >
                {labels[kind]}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  color: active ? "#FFFFFF" : tone.color,
                  fontSize: active ? 17 : 16,
                  fontWeight: "700",
                }}
              >
                {cardValues[kind].value}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View
        style={{
          opacity: transition,
          transform: [
            {
              translateY: transition.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 0],
              }),
            },
          ],
        }}
      >
        {selected == null ? (
          <View
            style={{
              padding: 16,
              gap: 14,
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#DFE8E1",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="leaf-outline" size={22} color="#287A56" />
              <Text style={{ color: "#20332B", fontSize: 17, fontWeight: "700" }}>
                Tổng quan
              </Text>
            </View>
            <View style={{ gap: 11 }}>
              {kinds.map((kind) => (
                <View
                  key={kind}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon
                    name={kindIcons[kind]}
                    size={38}
                    tone={tones[kind].background}
                    color={tones[kind].color}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: "#61746B", fontSize: 13 }}>
                      {labels[kind]}
                    </Text>
                    <Text style={{ color: "#20332B", fontSize: 16, fontWeight: "700" }}>
                      {cardValues[kind].value}
                    </Text>
                  </View>
                  <Text
                    style={{
                      maxWidth: "42%",
                      color: "#61746B",
                      fontSize: 12,
                      textAlign: "right",
                    }}
                  >
                    {cardValues[kind].detail}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ color: "#61746B", fontSize: 13, lineHeight: 19 }}>
              Chọn một chỉ số để xem biểu đồ chi tiết.
            </Text>
            {!entries.length && (
              <Text style={{ color: "#61746B", fontSize: 13 }}>
                Chưa có bản ghi trong khoảng thời gian này.
              </Text>
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => selectKind(null)}
                style={{
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#DFE8E1",
                }}
              >
                <Ionicons name="chevron-back" size={18} color="#287A56" />
                <Text style={{ color: "#155C43", fontSize: 14, fontWeight: "700" }}>
                  Tổng quan
                </Text>
              </Pressable>
              <Text style={{ color: "#61746B", fontSize: 13 }}>
                {labels[selected]}
              </Text>
            </View>
            <View
              style={{
                padding: 14,
                gap: 10,
                borderRadius: 18,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: selectedTone!.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#20332B", fontSize: 16, fontWeight: "700" }}>
                  Theo từng ngày
                </Text>
                <Text style={{ color: "#61746B", fontSize: 13 }}>
                  {selected === "water"
                    ? "ml"
                    : selected === "sleep"
                      ? "giờ"
                      : selected === "weight"
                        ? "kg"
                        : "bpm"}
                </Text>
              </View>
              <ReportChart
                kind={selected}
                points={selectedPoints}
                color={selectedTone!.color}
                border={selectedTone!.border}
                selectedDate={selectedDay}
                onSelect={setSelectedDay}
              />
              {selectedDay && (
                <View
                  accessibilityLiveRegion="polite"
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: selectedTone!.background,
                  }}
                >
                  <Text style={{ color: selectedTone!.color, fontSize: 13, fontWeight: "700" }}>
                    {DateTime.fromISO(selectedDay, { zone: "utc" })
                      .setLocale("vi")
                      .toFormat("cccc, dd/MM/yyyy")}{" "}
                    ·{" "}
                    {selectedPoint?.value == null
                      ? "Chưa có dữ liệu"
                      : displayValue(selected, selectedPoint.value)}
                  </Text>
                </View>
              )}
              <Text style={{ color: "#61746B", fontSize: 13, textAlign: "center" }}>
                Chạm vào điểm để xem giá trị và ngày.
              </Text>
              {selected === "heart_rate" && (
                <Text style={{ color: "#61746B", fontSize: 12 }}>
                  Giá trị trung bình các lần đo trong ngày.
                </Text>
              )}
              {selected === "water" && profile?.water_goal ? (
                <Text style={{ color: "#61746B", fontSize: 12 }}>
                  Mục tiêu: {number(profile.water_goal, 0)} ml/ngày
                </Text>
              ) : null}
            </View>
            <Summary kind={selected} points={selectedPoints} tone={selectedTone!} />
            <View
              style={{
                padding: 14,
                gap: 9,
                borderRadius: 18,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#DFE8E1",
              }}
            >
              <Text style={{ color: "#20332B", fontSize: 17, fontWeight: "700" }}>
                Lịch sử bản ghi
              </Text>
              {history.length ? (
                history.map((entry) => (
                  <View
                    key={entry.id}
                    style={{
                      minHeight: 54,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#EDF2ED",
                    }}
                  >
                    <Icon
                      name={kindIcons[selected]}
                      size={36}
                      tone={selectedTone!.background}
                      color={selectedTone!.color}
                    />
                    <Text style={{ flex: 1, color: "#20332B", fontSize: 14, fontWeight: "600" }}>
                      {displayValue(selected, Number(entry.value))}
                    </Text>
                    <Text style={{ color: "#61746B", fontSize: 12 }}>
                      {DateTime.fromISO(entry.measured_at)
                        .setZone(zone)
                        .toFormat("dd/MM · HH:mm")}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: "#61746B", fontSize: 14 }}>
                  Chưa có bản ghi cho chỉ số này trong khoảng thời gian đã chọn.
                </Text>
              )}
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function Summary({
  kind,
  points,
  tone,
}: {
  kind: ReportKind;
  points: Point[];
  tone: Tone;
}) {
  const recorded = points.flatMap((point) =>
    point.value == null ? [] : [point.value],
  );
  const average =
    recorded.length > 0
      ? recorded.reduce((sum, value) => sum + value, 0) / recorded.length
      : null;
  const max = recorded.length ? Math.max(...recorded) : null;
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {[
        { label: "Trung bình", value: average },
        { label: "Cao nhất", value: max },
      ].map((item) => (
        <View
          key={item.label}
          style={{
            flex: 1,
            minHeight: 80,
            padding: 12,
            gap: 6,
            borderRadius: 16,
            backgroundColor: tone.background,
            borderWidth: 1,
            borderColor: tone.border,
          }}
        >
          <Text style={{ color: "#61746B", fontSize: 12 }}>{item.label}</Text>
          <Text style={{ color: tone.color, fontSize: 16, fontWeight: "700" }}>
            {item.value == null ? "—" : displayValue(kind, item.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ReportChart({
  kind,
  points,
  color,
  border,
  selectedDate,
  onSelect,
}: {
  kind: ReportKind;
  points: Point[];
  color: string;
  border: string;
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const width = Math.max(220, Math.min(620, measuredWidth || screenWidth - 72));
  const height = 224;
  const left = 34;
  const right = width - 8;
  const top = 34;
  const baseline = 179;
  const values = points.flatMap((point) =>
    point.value == null ? [] : [point.value],
  );
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 1;
  const pad = values.length ? Math.max((high - low) * 0.18, high * 0.06, 1) : 1;
  const min = kind === "water" || kind === "sleep" ? 0 : Math.max(0, low - pad);
  const max = Math.max(min + 1, high + pad);
  const range = max - min;
  const slot = (right - left) / Math.max(1, points.length);
  const yFor = (value: number) =>
    baseline - ((value - min) / range) * (baseline - top);
  const segments: number[][] = [];
  let segment: number[] = [];
  points.forEach((point, index) => {
    if (point.value == null) {
      if (segment.length) segments.push(segment);
      segment = [];
    } else {
      segment.push(index);
    }
  });
  if (segment.length) segments.push(segment);
  const pathFor = (indices: number[]) =>
    indices
      .map((index, offset) => {
        const x = left + slot * (index + 0.5);
        const y = yFor(points[index].value!);
        if (!offset) return `M ${x} ${y}`;
        const previous = indices[offset - 1];
        const previousX = left + slot * (previous + 0.5);
        const previousY = yFor(points[previous].value!);
        const middle = (previousX + x) / 2;
        return `C ${middle} ${previousY}, ${middle} ${y}, ${x} ${y}`;
      })
      .join(" ");
  const labelsToShow = new Set<number>();
  let lastLabelX = -Infinity;
  points.forEach((point, index) => {
    if (point.value == null) return;
    const x = left + slot * (index + 0.5);
    if (x - lastLabelX >= 42 || selectedDate === point.date) {
      labelsToShow.add(index);
      lastLabelX = x;
    }
  });

  return (
    <View
      onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
      style={{ width: "100%", height }}
    >
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={`report-fill-${kind}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.22" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {[0, 1, 2].map((step) => {
          const y = top + ((baseline - top) / 2) * step;
          const tick = max - ((max - min) / 2) * step;
          return (
            <G key={step}>
              <Line
                x1={left}
                y1={y}
                x2={right}
                y2={y}
                stroke={step === 2 ? border : "#EEF2EF"}
                strokeWidth={1}
              />
              <SvgText
                x={left - 5}
                y={y + 4}
                textAnchor="end"
                fontSize={12}
                fill="#61746B"
              >
                {number(
                  kind === "sleep" ? tick / 60 : tick,
                  kind === "sleep" || kind === "weight" ? 1 : 0,
                )}
              </SvgText>
            </G>
          );
        })}
        {segments.map((indices, index) => {
          const path = pathFor(indices);
          if (indices.length < 2) return null;
          const firstX = left + slot * (indices[0] + 0.5);
          const lastX = left + slot * (indices[indices.length - 1] + 0.5);
          return (
            <G key={`segment-${index}`}>
              <Path
                d={`${path} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`}
                fill={`url(#report-fill-${kind})`}
              />
              <Path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </G>
          );
        })}
        {points.map((point, index) => {
          const x = left + slot * (index + 0.5);
          const y = point.value == null ? baseline : yFor(point.value);
          const selected = selectedDate === point.date;
          return (
            <G key={point.date}>
              {point.value != null && labelsToShow.has(index) && (
                <SvgText
                  x={x}
                  y={Math.max(14, y - 9)}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight="700"
                  fill="#20332B"
                >
                  {number(
                    kind === "sleep" ? point.value / 60 : point.value,
                    kind === "heart_rate" || kind === "water" ? 0 : 1,
                  )}
                </SvgText>
              )}
              {point.value != null && (
                <Circle
                  cx={x}
                  cy={y}
                  r={selected ? 5 : 4}
                  fill={selected ? "#FFFFFF" : color}
                  stroke={color}
                  strokeWidth={2}
                />
              )}
              <SvgText
                x={x}
                y={height - 8}
                textAnchor="middle"
                fontSize={11}
                fill="#52695D"
              >
                {points.length <= 7
                  ? DateTime.fromISO(point.date, { zone: "utc" })
                      .setLocale("vi")
                      .toFormat("ccc")
                  : index % 5 === 0 || index === points.length - 1
                    ? DateTime.fromISO(point.date, { zone: "utc" }).toFormat(
                        "d/M",
                      )
                    : ""}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      <View
        style={{
          position: "absolute",
          left,
          right: width - right,
          top,
          bottom: height - baseline,
          flexDirection: "row",
        }}
      >
        {points.map((point) => (
          <Pressable
            key={point.date}
            accessibilityRole="button"
            accessibilityLabel={`${DateTime.fromISO(point.date, { zone: "utc" }).toFormat("dd/MM/yyyy")}: ${point.value == null ? "chưa có dữ liệu" : displayValue(kind, point.value)}`}
            accessibilityState={{ selected: selectedDate === point.date }}
            onPress={() => onSelect(point.date)}
            style={{ flex: 1, minHeight: 44 }}
          />
        ))}
      </View>
    </View>
  );
}

export function HomeHealthTrends({
  entries,
  dates,
  zone,
  profile,
}: {
  entries: Entry[];
  dates: string[];
  zone: string;
  profile?: Profile;
}) {
  const [userSelected, setUserSelected] = useState<ReportKind | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const [transition] = useState(() => new Animated.Value(1));
  const series = useMemo(
    () => valuesByDay(entries, dates, zone),
    [entries, dates, zone],
  );
  const firstWithData = kinds.find((kind) =>
    series[kind].some((point) => point.value != null),
  );
  const selected = userSelected ?? firstWithData ?? "water";
  useEffect(() => {
    if (reducedMotion) {
      transition.setValue(1);
      return;
    }
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [selected, reducedMotion, transition]);

  const selectedTone = selected ? tones[selected] : null;
  const selectedPoints = selected ? series[selected] : [];
  const selectedPoint =
    selectedPoints.find((point) => point.date === selectedDay) ?? null;
  const recordedValues = (kind: ReportKind) =>
    series[kind].flatMap((point) =>
      point.value == null ? [] : [point.value],
    );
  const values = {
    water: recordedValues("water"),
    sleep: recordedValues("sleep"),
    weight: recordedValues("weight"),
    heart_rate: recordedValues("heart_rate"),
  };
  const average = (items: number[]) =>
    items.length
      ? items.reduce((sum, item) => sum + item, 0) / items.length
      : null;
  const firstWeight = values.weight[0];
  const latestWeight = values.weight[values.weight.length - 1];
  const weightChange =
    values.weight.length > 1 ? latestWeight - firstWeight : null;
  const heartRateEntries = entries.flatMap((entry) =>
    entry.kind === "heart_rate" && entry.value != null
      ? [Number(entry.value)]
      : [],
  );
  const averageHeartRate = average(heartRateEntries);
  const recordedHeartDays = values.heart_rate.length;
  const recordedWaterDays = values.water.length;
  const waterGoalDays = profile?.water_goal
    ? series.water.filter(
        (point) => point.value != null && point.value >= profile.water_goal,
      ).length
    : null;
  const sleepChange =
    values.sleep.length > 1
      ? values.sleep[values.sleep.length - 1] - values.sleep[0]
      : null;
  const commentary: Record<ReportKind, string> = {
    water: average(values.water) == null
      ? "Chưa đủ dữ liệu để nhận xét xu hướng."
      : waterGoalDays != null
        ? `Lượng nước trung bình: ${displayValue("water", average(values.water)!)} mỗi ngày có ghi nhận. Bạn đạt mục tiêu trong ${waterGoalDays}/${dates.length} ngày.`
        : `Lượng nước trung bình: ${displayValue("water", average(values.water)!)} mỗi ngày có ghi nhận (${recordedWaterDays}/${dates.length} ngày).`,
    sleep: average(values.sleep) == null
      ? "Chưa đủ dữ liệu để nhận xét xu hướng."
      : sleepChange == null
        ? `Thời lượng ngủ trung bình: ${displayValue("sleep", average(values.sleep)!)} trong ${values.sleep.length} đêm có ghi nhận. Chưa đủ dữ liệu để so sánh chênh lệch.`
        : `Thời lượng ngủ trung bình: ${displayValue("sleep", average(values.sleep)!)} trong ${values.sleep.length} đêm. Chênh lệch giữa đêm đầu và cuối có ghi nhận: ${sleepChange > 0 ? "+" : ""}${displayValue("sleep", sleepChange)}.`,
    weight:
      latestWeight == null || weightChange == null
        ? "Chưa đủ dữ liệu để nhận xét xu hướng."
        : `Cân nặng thay đổi ${weightChange > 0 ? "+" : ""}${number(weightChange)} kg giữa bản ghi đầu và cuối trong khoảng 7 ngày.`,
    heart_rate:
      averageHeartRate == null
        ? "Chưa đủ dữ liệu để nhận xét xu hướng."
        : `Nhịp tim trung bình ${displayValue("heart_rate", averageHeartRate)} từ ${heartRateEntries.length} lần đo, ghi nhận trong ${recordedHeartDays} ngày.`,
  };

  return (
    <View style={{ gap: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 9, paddingVertical: 2 }}
      >
        {kinds.map((kind) => {
          const tone = tones[kind];
          const active = selected === kind;
          const iconName =
            kind === "water"
              ? "water"
              : kind === "sleep"
                ? "moon"
                : kind === "weight"
                  ? "scale-outline"
                  : "heart";
          return (
            <Pressable
              key={kind}
              accessibilityRole="button"
              accessibilityLabel={`Xem xu hướng ${labels[kind]}`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                setUserSelected(kind);
                setSelectedDay(null);
              }}
              style={({ pressed }) => ({
                minHeight: 46,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 14,
                borderRadius: 22,
                backgroundColor: active ? tone.color : tone.background,
                borderWidth: 1,
                borderColor: tone.color,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Ionicons
                name={iconName}
                size={21}
                color={active ? "#FFFFFF" : tone.color}
              />
              <Text
                style={{
                  color: active ? "#FFFFFF" : tone.color,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {labels[kind]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Animated.View
        style={{
          opacity: transition,
          transform: [
            {
              translateY: transition.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 0],
              }),
            },
          ],
        }}
      >
        {selected && selectedTone ? (
          <View
            style={{
              padding: 16,
              gap: 12,
              borderRadius: 20,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: selectedTone.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: "#18283D", fontSize: 17, fontWeight: "700" }}>
                Theo từng ngày
              </Text>
              <Text style={{ color: "#66788C", fontSize: 14 }}>
                {selected === "water"
                  ? "ml"
                  : selected === "sleep"
                    ? "giờ"
                    : selected === "weight"
                      ? "kg"
                      : "bpm"}
              </Text>
            </View>
            <ReportChart
              kind={selected}
              points={selectedPoints}
              color={selectedTone.color}
              border={selectedTone.border}
              selectedDate={selectedDay}
              onSelect={setSelectedDay}
            />
            {!selectedPoints.some((point) => point.value != null) && (
              <Text style={{ color: "#66788C", fontSize: 13, textAlign: "center" }}>
                Chưa có dữ liệu cho chỉ số này trong 7 ngày gần nhất.
              </Text>
            )}
            {selectedDay && (
              <View
                accessibilityLiveRegion="polite"
                style={{
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: selectedTone.background,
                }}
              >
                <Text style={{ color: selectedTone.color, fontSize: 14, fontWeight: "700" }}>
                  {DateTime.fromISO(selectedDay, { zone: "utc" })
                    .setLocale("vi")
                    .toFormat("cccc, dd/MM/yyyy")}{" "}
                  ·{" "}
                  {selectedPoint?.value == null
                    ? "Chưa có dữ liệu"
                    : displayValue(selected, selectedPoint.value)}
                </Text>
              </View>
            )}
            <Text style={{ color: "#66788C", fontSize: 13, textAlign: "center" }}>
              Chạm vào điểm để xem giá trị và ngày.
            </Text>
            {selected === "heart_rate" && (
              <Text style={{ color: "#66788C", fontSize: 13 }}>
                Giá trị trung bình các lần đo trong ngày.
              </Text>
            )}
            {selected === "water" && profile?.water_goal ? (
              <Text style={{ color: "#66788C", fontSize: 13 }}>
                Mục tiêu: {number(profile.water_goal, 0)} ml/ngày
              </Text>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              padding: 16,
              gap: 8,
              borderRadius: 18,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#DFE8E1",
            }}
          >
            <Text style={{ color: "#20332B", fontSize: 16, fontWeight: "700" }}>
              Chưa có dữ liệu sức khỏe
            </Text>
            <Text style={{ color: "#61746B", fontSize: 13, lineHeight: 19 }}>
              Ghi nhận nước uống, giấc ngủ, cân nặng hoặc nhịp tim để xem xu hướng 7 ngày.
            </Text>
          </View>
        )}
      </Animated.View>
      {selected && selectedTone && (
        <View
          style={{
            minHeight: 88,
            padding: 16,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            borderRadius: 16,
            backgroundColor: selectedTone.background,
            borderWidth: 1,
            borderColor: selectedTone.border,
          }}
        >
          <Ionicons name="stats-chart" size={23} color={selectedTone.color} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ color: "#18283D", fontSize: 16, fontWeight: "700" }}>
              Nhận xét trong tuần
            </Text>
            <Text style={{ color: "#34465A", fontSize: 14, lineHeight: 20 }}>
              {commentary[selected]}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
