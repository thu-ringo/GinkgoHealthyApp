import React from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DateTime } from "luxon";
import { router } from "expo-router";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { C, H, Icon, kindIcons, moodLevelIcons } from "./ui";
import {
  metricLabels,
  metricUnits,
  metricValue,
} from "./metric-meta";
import { metricPalette } from "./palette";
import type { Entry, MetricKind, MetricStats } from "./types";

export function MetricDetails({
  kind,
  stats,
  period,
  entries,
  zone,
  recordsPending,
  recordsError,
  onOpenRecords,
}: {
  kind: MetricKind;
  stats: MetricStats;
  period: string;
  entries: Entry[];
  zone: string;
  recordsPending: boolean;
  recordsError: string | null;
  onOpenRecords: () => void;
}) {
  const isSum = kind === "water" || kind === "sleep";
  const isMood = kind === "mood";
  const palette = metricPalette[kind];
  const oneDay = stats.from === stats.to;
  const goal = stats.goal;
  const goalForPeriod =
    goal == null ? null : goal * stats.summary.periodDays;
  const total = stats.summary.total;
  const heroValue = isSum
    ? total
    : stats.summary.latest;
  const heroSecondary = isSum ? null : stats.summary.latestSecondary;
  const goalProgress =
    total == null || goalForPeriod == null || goalForPeriod <= 0
      ? null
      : total / goalForPeriod;
  const filteredEntries = entries
    .filter((entry) => entry.kind === kind)
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const latestEntry = filteredEntries[filteredEntries.length - 1];
  const todayEntries = filteredEntries.filter(
    (entry) =>
      DateTime.fromISO(entry.measured_at).setZone(zone).toISODate() ===
      stats.to,
  );
  const periodLabel =
    period === "today"
      ? "Hôm nay"
      : period === "week"
        ? "7 ngày"
        : period === "month"
          ? "30 ngày"
          : `${stats.summary.periodDays} ngày`;
  const summaryOne = isSum ? stats.summary.total : stats.summary.average;
  const summaryTwo = stats.summary.max;

  return (
    <View style={{ gap: 18 }}>
      <MetricHero
        kind={kind}
        value={heroValue}
        secondary={heroSecondary}
        goal={goalForPeriod}
        progress={goalProgress}
        recordedDays={stats.summary.recordedDays}
        periodDays={stats.summary.periodDays}
        periodLabel={periodLabel}
      />

      {oneDay ? (
        <View style={{ gap: 10 }}>
          <H>Các lần ghi trong ngày</H>
          {todayEntries.length ? (
            todayEntries.map((entry) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                kind={kind}
                zone={zone}
              />
            ))
          ) : (
            <Text style={{ color: C.text, fontSize: 14 }}>
              Chưa có lần ghi nào trong ngày.
            </Text>
          )}
        </View>
      ) : (
        <View
          style={{
            padding: 14,
            borderRadius: 22,
            backgroundColor: C.white,
            borderColor: palette.border,
            borderWidth: 1,
          }}
        >
          <MetricChart
            kind={kind}
            days={stats.days}
            goal={goal}
            period={period}
          />
        </View>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {isSum ? (
          <>
            <StatCard
              kind={kind}
              label="Tổng trong khoảng"
              value={summaryOne}
              progress={goalProgress ?? 0}
              accessibleValue={`${metricValue(kind, summaryOne)} ${metricUnits[kind]}`}
            />
            <StatCard
              kind={kind}
              label="Ngày cao nhất"
              value={summaryTwo}
              progress={
                summaryTwo == null || goal == null || goal <= 0
                  ? 0
                  : summaryTwo / goal
              }
              accessibleValue={`${metricValue(kind, summaryTwo)} ${metricUnits[kind]}`}
            />
          </>
        ) : isMood ? (
          <>
            <StatCard
              kind={kind}
              label="Mức trung bình"
              value={stats.summary.average}
              progress={(stats.summary.average ?? 0) / 5}
              accessibleValue={`${metricValue(kind, stats.summary.average)} trên 5`}
            />
            <StatCard
              kind={kind}
              label="Mức cao nhất"
              value={stats.summary.max}
              progress={(stats.summary.max ?? 0) / 5}
              accessibleValue={`${metricValue(kind, stats.summary.max)} trên 5`}
            />
          </>
        ) : (
          <>
            <StatCard
              kind={kind}
              label="Trung bình/ngày có ghi"
              value={stats.summary.average}
              secondary={
                kind === "blood_pressure"
                  ? stats.summary.averageSecondary
                  : null
              }
              progress={
                stats.summary.periodDays > 0
                  ? stats.summary.recordedDays / stats.summary.periodDays
                  : 0
              }
              accessibleValue={`${stats.summary.recordedDays}/${stats.summary.periodDays} ngày có ghi`}
            />
            <StatCard
              kind={kind}
              label="Số đo gần nhất"
              value={stats.summary.latest}
              secondary={stats.summary.latestSecondary}
              progress={
                stats.summary.periodDays > 0
                  ? stats.summary.recordedDays / stats.summary.periodDays
                  : 0
              }
              accessibleValue={`${stats.summary.recordedDays}/${stats.summary.periodDays} ngày có ghi`}
            />
          </>
        )}
      </View>

      {kind === "blood_pressure" ? (
        <Text style={{ color: C.text, fontSize: 13, lineHeight: 20 }}>
          Biểu đồ: Tâm thu (số trên) / Tâm trương (số dưới).
        </Text>
      ) : null}

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <H>Ghi nhận gần đây</H>
          <Text style={{ color: C.text, fontSize: 14 }}>
            {stats.summary.recordCount} bản ghi
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mở ${stats.summary.recordCount} bản ghi ${metricLabels[kind]} trong khoảng ngày đã chọn`}
          onPress={onOpenRecords}
          style={{
            minHeight: 80,
            padding: 14,
            borderRadius: 18,
            backgroundColor: palette.soft,
            borderWidth: 1,
            borderColor: palette.border,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          {latestEntry ? (
            <Icon
              name={kindIcons[kind]}
              size={48}
              tone={C.white}
              color={palette.deep}
              circular
            />
          ) : null}
          <View style={{ flex: 1, gap: 4 }}>
            {latestEntry ? (
              <>
                <Text
                  style={{ color: C.text, fontSize: 14, fontWeight: "600" }}
                >
                  {metricValue(kind, latestEntry.value, latestEntry.secondary)}{" "}
                  {metricUnits[kind]} ·{" "}
                  {DateTime.fromISO(latestEntry.measured_at)
                    .setZone(zone)
                    .toFormat("HH:mm · dd/MM")}
                </Text>
                <Text style={{ color: C.text, fontSize: 13 }}>
                  Bản ghi mới nhất
                </Text>
              </>
            ) : (
              <Text style={{ color: C.text, fontSize: 14 }}>
                {recordsPending
                  ? "Đang tải bản ghi…"
                  : recordsError ?? "Chưa có bản ghi trong khoảng này"}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" color={palette.deep} size={20} />
        </Pressable>
      </View>
    </View>
  );
}

function MetricHero({
  kind,
  value,
  secondary,
  goal,
  progress,
  recordedDays,
  periodDays,
  periodLabel,
}: {
  kind: MetricKind;
  value: number | null;
  secondary: number | null;
  goal: number | null;
  progress: number | null;
  recordedDays: number;
  periodDays: number;
  periodLabel: string;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const palette = metricPalette[kind];
  const isSum = kind === "water" || kind === "sleep";
  const face = kind === "mood" && value != null
    ? moodLevelIcons[Math.max(0, Math.min(4, Math.round(value) - 1))]
    : kindIcons[kind];
  const valueText = value == null ? "Chưa ghi" : metricValue(kind, value, secondary);
  const size = kind === "water" || kind === "sleep" ? 210 : 64;
  const [ringProgress] = React.useState(() => new Animated.Value(0));
  const [ringProgressValue, setRingProgressValue] = React.useState(0);

  React.useEffect(() => {
    const listener = ringProgress.addListener(({ value: next }) =>
      setRingProgressValue(next),
    );
    let animation: Animated.CompositeAnimation | undefined;
    let active = true;
    const run = (reduceMotion: boolean) => {
      if (!active) return;
      ringProgress.stopAnimation();
      if (reduceMotion) {
        ringProgress.setValue(1);
        return;
      }
      ringProgress.setValue(0);
      animation = Animated.timing(ringProgress, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      });
      animation.start();
    };
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      run,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(run);
    return () => {
      active = false;
      subscription.remove();
      animation?.stop();
      ringProgress.removeListener(listener);
    };
  }, [ringProgress, kind, periodLabel]);

  return (
    <View
      accessible
      accessibilityLabel={`${metricLabels[kind]}, ${valueText}${value == null ? "" : ` ${metricUnits[kind]}`}${isSum && progress != null ? `, ${Math.round(progress * 100)} phần trăm mục tiêu` : `, ${recordedDays} trên ${periodDays} ngày có ghi`}`}
      style={{
        width: "100%",
        minHeight: isSum ? 430 : 270,
        borderRadius: 28,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 22,
        paddingHorizontal: 16,
        gap: 9,
        backgroundColor: palette.deep,
        shadowColor: palette.deep,
        shadowOpacity: 0.25,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}
    >
      <Svg
        width={Math.min(640, Math.max(220, windowWidth - 40))}
        height={isSum ? 430 : 270}
        viewBox={`0 0 400 ${isSum ? 430 : 270}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Defs>
          <LinearGradient id={`hero-${kind}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.deep} />
            <Stop offset="1" stopColor={palette.gradientEnd} />
          </LinearGradient>
        </Defs>
        <Rect
          width="400"
          height={isSum ? 430 : 270}
          fill={`url(#hero-${kind})`}
        />
        <Circle cx="22" cy="34" r="64" fill="white" opacity="0.08" />
        <Circle cx="376" cy="82" r="82" fill="white" opacity="0.08" />
        <Circle cx="24" cy={isSum ? 410 : 254} r="40" fill="white" opacity="0.07" />
      </Svg>

      {isSum ? (
        <GoalProgressRing
          kind={kind}
          size={size}
          progress={(progress ?? 0) * ringProgressValue}
          icon={kindIcons[kind]}
        />
      ) : (
        <View
          style={{
            width: 86,
            height: 86,
            borderRadius: 43,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {kind === "heart_rate" ? (
            <HeartBeatIcon name={face} />
          ) : (
            <Ionicons name={face} size={52} color={C.white} />
          )}
        </View>
      )}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          maxWidth: "100%",
          color: C.white,
          fontSize: isSum ? 46 : 48,
          fontWeight: "800",
          letterSpacing: -1,
          textShadowColor: "rgba(0,0,0,0.22)",
          textShadowRadius: 2,
          textShadowOffset: { width: 0, height: 1 },
        }}
      >
        {valueText}
      </Text>
      {value != null && metricUnits[kind] ? (
        <Text style={{ color: C.white, fontSize: 16, fontWeight: "600" }}>
          {metricUnits[kind]}
        </Text>
      ) : null}
      {isSum ? (
        <View
          style={{
            minHeight: 32,
            paddingHorizontal: 14,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.28)",
          }}
        >
          <Text style={{ color: C.white, fontSize: 14, fontWeight: "700" }}>
            {progress == null
              ? goal == null
                ? "Chưa có mục tiêu"
                : "Chưa có dữ liệu"
              : `${Math.round(progress * 100)}% mục tiêu ${periodLabel.toLowerCase()}`}
          </Text>
        </View>
      ) : (
        <Text style={{ color: C.white, fontSize: 14, fontWeight: "600" }}>
          {recordedDays}/{periodDays} ngày có ghi
        </Text>
      )}
      {isSum && progress != null && progress >= 1 ? (
        <Text style={{ color: C.white, fontSize: 14, fontWeight: "700" }}>
          Đạt mục tiêu
        </Text>
      ) : null}
      {isSum && goal != null ? (
        <Text style={{ color: C.white, fontSize: 13, fontWeight: "600" }}>
          Mục tiêu khoảng này: {metricValue(kind, goal)} {metricUnits[kind]}
        </Text>
      ) : null}
    </View>
  );
}

function HeartBeatIcon({ name }: { name: React.ComponentProps<typeof Ionicons>["name"] }) {
  const scale = React.useState(() => new Animated.Value(1))[0];

  React.useEffect(() => {
    let active = true;
    let pulse: Animated.CompositeAnimation | undefined;
    const start = (reduceMotion: boolean) => {
      if (!active) return;
      pulse?.stop();
      scale.stopAnimation();
      scale.setValue(1);
      if (reduceMotion) return;
      pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.12,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 440,
            useNativeDriver: true,
          }),
          Animated.delay(700),
        ]),
      );
      pulse.start();
    };
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      start,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(start);
    return () => {
      active = false;
      subscription.remove();
      pulse?.stop();
      scale.stopAnimation();
    };
  }, [scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={name} size={58} color={C.white} />
    </Animated.View>
  );
}

function GoalProgressRing({
  kind,
  size,
  progress,
  icon,
}: {
  kind: MetricKind;
  size: number;
  progress: number;
  icon: typeof kindIcons.water;
}) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const palette = metricPalette[kind];

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="rgba(255,255,255,0.15)"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={8}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={C.white}
          strokeWidth={8}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={
            circumference * (1 - Math.max(0, Math.min(1, progress)))
          }
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: C.white,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={30} color={palette.deep} />
      </View>
    </View>
  );
}

function StatCard({
  kind,
  label,
  value,
  secondary,
  progress,
  accessibleValue,
}: {
  kind: MetricKind;
  label: string;
  value: number | null;
  secondary?: number | null;
  progress: number;
  accessibleValue: string;
}) {
  const palette = metricPalette[kind];
  const size = 70;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const title =
    kind === "water" || kind === "sleep"
      ? `${metricValue(kind, value)} ${metricUnits[kind]}`
      : kind === "mood"
        ? `${metricValue(kind, value)} / 5`
        : `${metricValue(kind, value, secondary)} ${metricUnits[kind]}`;
  const donutProgress = Math.max(0, Math.min(1, progress));

  return (
    <View
      style={{
        flex: 1,
        minWidth: 145,
        minHeight: 110,
        padding: 12,
        borderRadius: 22,
        backgroundColor: palette.soft,
        borderWidth: 1,
        borderColor: palette.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <View
        accessible
        accessibilityLabel={`${label}: ${accessibleValue}`}
        style={{ width: size, height: size }}
      >
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={palette.border}
            strokeWidth={6}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={palette.deep}
            strokeWidth={6}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - donutProgress)}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={kind === "mood" && value != null ? moodLevelIcons[Math.max(0, Math.min(4, Math.round(value) - 1))] : kindIcons[kind]}
            size={25}
            color={palette.deep}
          />
        </View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: C.text, fontSize: 14 }}>{label}</Text>
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          style={{ color: C.text, fontSize: 24, fontWeight: "700" }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

function TimelineEntry({
  entry,
  kind,
  zone,
}: {
  entry: Entry;
  kind: MetricKind;
  zone: string;
}) {
  const palette = metricPalette[kind];
  const icon =
    kind === "mood" && entry.value != null
      ? moodLevelIcons[Math.max(0, Math.min(4, Math.round(entry.value) - 1))]
      : kindIcons[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sửa bản ghi ${metricLabels[kind]} ${metricValue(kind, entry.value, entry.secondary)} ${metricUnits[kind]} lúc ${DateTime.fromISO(entry.measured_at).setZone(zone).toFormat("HH:mm")}`}
      onPress={() =>
        router.push({
          pathname: "/entry",
          params: { record: JSON.stringify(entry) },
        })
      }
      style={{
        minHeight: 72,
        padding: 12,
        borderRadius: 18,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: palette.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Icon
        name={icon}
        size={48}
        tone={palette.soft}
        color={palette.deep}
        circular
      />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: palette.deep, fontSize: 22, fontWeight: "700" }}>
          {metricValue(kind, entry.value, entry.secondary)}{" "}
          {metricUnits[kind]}
        </Text>
        <Text style={{ color: C.text, fontSize: 14 }}>
          {DateTime.fromISO(entry.measured_at).setZone(zone).toFormat("HH:mm")}
        </Text>
      </View>
      <Ionicons name="chevron-forward" color={palette.deep} size={20} />
    </Pressable>
  );
}

function MetricChart({
  kind,
  days,
  goal,
  period,
}: {
  kind: MetricKind;
  days: MetricStats["days"];
  goal: number | null;
  period: string;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [selected, setSelected] = React.useState<number | null>(null);
  const [growth] = React.useState(() => new Animated.Value(0));
  const [animatedProgress, setAnimatedProgress] = React.useState(0);
  const palette = metricPalette[kind];
  const width = Math.min(600, Math.max(220, windowWidth - 108));
  const height = 245;
  const left = kind === "mood" ? 38 : 16;
  const right = width - 14;
  const top = 38;
  const baseline = 196;
  const plotHeight = baseline - top;
  const isLongRange = days.length > 7;
  const isBar = kind === "water" || kind === "sleep";
  const isBloodPressure = kind === "blood_pressure";
  const validValues = days.flatMap((day) =>
    day.value == null
      ? []
      : isBloodPressure && day.secondary != null
        ? [day.value, day.secondary]
        : [day.value],
  );
  const minValue = isBar
    ? 0
    : kind === "mood"
      ? 1
      : validValues.length
        ? Math.min(...validValues)
        : 0;
  const maxValue = Math.max(
    kind === "mood" ? 5 : goal ?? 0,
    ...validValues,
    isBar ? 1 : minValue + 1,
  ) * (isBar ? 1.15 : 1);
  const range = maxValue - minValue || 1;
  const slot = (right - left) / Math.max(1, days.length);
  const barWidth = Math.max(3, Math.min(24, slot * 0.58));
  const selectedDay = selected == null ? undefined : days[selected];
  const showValueLabels = !isLongRange && days.length <= 7;
  const valueLabel = selectedDay
    ? selectedDay.value == null
      ? "Chưa có dữ liệu"
      : `${metricValue(kind, selectedDay.value, selectedDay.secondary)} ${metricUnits[kind]}`
    : null;
  const yFor = (value: number) =>
    baseline - ((value - minValue) / range) * plotHeight;
  const goalY =
    isBar && goal != null
      ? baseline - (goal / maxValue) * plotHeight
      : null;

  React.useEffect(() => {
    const listener = growth.addListener(({ value }) =>
      setAnimatedProgress(value),
    );
    let animation: Animated.CompositeAnimation | undefined;
    let active = true;
    const run = (reduceMotion: boolean) => {
      if (!active) return;
      growth.stopAnimation();
      if (reduceMotion) {
        growth.setValue(1);
        return;
      }
      growth.setValue(0);
      animation = Animated.timing(growth, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      });
      animation.start();
    };
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      run,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(run);
    return () => {
      active = false;
      subscription.remove();
      animation?.stop();
      growth.removeListener(listener);
    };
  }, [growth, kind, period]);

  const segments: number[][] = [];
  let currentSegment: number[] = [];
  days.forEach((day, index) => {
    if (day.value == null) {
      if (currentSegment.length) segments.push(currentSegment);
      currentSegment = [];
    } else {
      currentSegment.push(index);
    }
  });
  if (currentSegment.length) segments.push(currentSegment);

  const linePath = (indices: number[]) =>
    indices
      .map((index, offset) => {
        const day = days[index];
        const x = left + slot * (index + 0.5);
        const targetY = yFor(day.value ?? minValue);
        const y = baseline - (baseline - targetY) * animatedProgress;
        if (!offset) return `M ${x} ${y}`;
        const previousIndex = indices[offset - 1];
        const previousDay = days[previousIndex];
        const previousX = left + slot * (previousIndex + 0.5);
        const previousY =
          baseline -
          (baseline - yFor(previousDay.value ?? minValue)) * animatedProgress;
        const middle = (previousX + x) / 2;
        return `C ${middle} ${previousY}, ${middle} ${y}, ${x} ${y}`;
      })
      .join(" ");

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text
          accessibilityRole="header"
          accessibilityLabel={`Biểu đồ ${metricLabels[kind]} theo từng ngày; ngày chưa ghi được để trống`}
          style={{
            color: C.text,
            fontSize: 19,
            lineHeight: 27,
            fontWeight: "600",
            letterSpacing: -0.3,
          }}
        >
          Theo từng ngày
        </Text>
        <Text style={{ color: C.text, fontSize: 13 }}>
          {kind === "sleep" ? "giờ" : kind === "mood" ? "mức 1–5" : metricUnits[kind]}
        </Text>
      </View>
      <View
        accessible={false}
        style={{ width, height, alignSelf: "center" }}
      >
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id={`chart-${kind}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palette.deep} stopOpacity="0.38" />
              <Stop offset="1" stopColor={palette.gradientEnd} stopOpacity="0.04" />
            </LinearGradient>
            <LinearGradient id={`bar-${kind}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palette.deep} />
              <Stop offset="1" stopColor={palette.gradientEnd} />
            </LinearGradient>
          </Defs>
          {goalY != null && (
            <>
              <Line
                x1={left}
                y1={goalY}
                x2={right}
                y2={goalY}
                stroke={palette.deep}
                strokeWidth={1.5}
                strokeDasharray="5 5"
              />
              <SvgText
                x={right}
                y={16}
                textAnchor="end"
                fontSize={12}
                fontWeight="600"
                fill={palette.deep}
              >
                {`Mục tiêu ${metricValue(kind, goal)} ${metricUnits[kind]}`}
              </SvgText>
            </>
          )}
          <Line
            x1={left}
            y1={baseline}
            x2={right}
            y2={baseline}
            stroke={palette.border}
            strokeWidth={1}
          />
          {kind === "mood" &&
            [1, 2, 3, 4, 5].map((mood) => {
              const y = yFor(mood);
              return (
                <G key={mood}>
                  <Line
                    x1={left}
                    y1={y}
                    x2={right}
                    y2={y}
                    stroke={palette.border}
                    strokeWidth={1}
                    strokeDasharray="2 5"
                  />
                  <SvgText
                    x={left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={12}
                    fontWeight="600"
                    fill={palette.deep}
                  >
                    {mood}
                  </SvgText>
                </G>
              );
            })}
          {kind === "mood" &&
            [1, 2, 3, 4, 5].map((mood) => {
              const y = yFor(mood);
              return (
                <View
                  key={mood}
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: y - 10,
                    width: 18,
                    height: 20,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={moodLevelIcons[mood - 1]}
                    size={15}
                    color={palette.deep}
                  />
                </View>
              );
            })}
          {!isBar && (
            <>
              {segments.map((segment, index) => {
                const path = linePath(segment);
                const firstX = left + slot * (segment[0] + 0.5);
                const lastX =
                  left + slot * (segment[segment.length - 1] + 0.5);
                const areaPath = `${path} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
                return (
                  <G key={`segment-${index}`}>
                    <Path d={areaPath} fill={`url(#chart-${kind})`} />
                    <Path
                      d={path}
                      fill="none"
                      stroke={palette.deep}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </G>
                );
              })}
            </>
          )}
          {days.map((day, index) => {
            const labelVisible =
              !isLongRange || index % 5 === 0 || index === days.length - 1;
            if (day.value == null) {
              return labelVisible ? (
                <SvgText
                  key={day.date}
                  x={left + slot * (index + 0.5)}
                  y={229}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#3F4A47"
                >
                  {DateTime.fromISO(day.date).toFormat(
                    isLongRange ? "d/M" : "dd/MM",
                  )}
                </SvgText>
              ) : null;
            }
            const x = left + slot * (index + 0.5);
            const isLast = index === days.length - 1;
            const dateLabel =
              isLongRange && index % 5 !== 0 && index !== days.length - 1
                ? null
                : DateTime.fromISO(day.date).toFormat(
                    isLongRange ? "d/M" : "dd/MM",
                  );
            if (isBar) {
              const rawHeight = (day.value / maxValue) * plotHeight;
              const height = Math.max(3, rawHeight * animatedProgress);
              return (
                <G key={day.date}>
                  {showValueLabels && (
                    <SvgText
                      x={x}
                      y={Math.max(18, baseline - height - 7)}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight="700"
                      fill={C.text}
                    >
                      {kind === "sleep"
                        ? (day.value / 60).toFixed(1)
                        : metricValue(kind, day.value)}
                    </SvgText>
                  )}
                  <Rect
                    x={x - barWidth / 2}
                    y={baseline - height}
                    width={barWidth}
                    height={height}
                    rx={barWidth / 2}
                    fill={`url(#bar-${kind})`}
                    stroke={isLast ? palette.deep : "none"}
                    strokeWidth={isLast ? 1.5 : 0}
                  />
                  {dateLabel ? (
                    <SvgText
                      x={x}
                      y={229}
                      textAnchor="middle"
                      fontSize={12}
                      fill="#3F4A47"
                    >
                      {dateLabel}
                    </SvgText>
                  ) : null}
                </G>
              );
            }
            const valueY = yFor(day.value);
            if (isBloodPressure && day.secondary != null) {
              const secondaryY = yFor(day.secondary);
              const barY = Math.min(valueY, secondaryY);
              const barHeight = Math.max(4, Math.abs(secondaryY - valueY));
              return (
                <G key={day.date}>
                  <Rect
                    x={x - barWidth / 2}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    rx={barWidth / 2}
                    fill={`url(#bar-${kind})`}
                  />
                  {showValueLabels && (
                    <>
                      <SvgText
                        x={x}
                        y={barY - 4}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight="700"
                        fill={C.text}
                      >
                        {metricValue(kind, day.value)}
                      </SvgText>
                      <SvgText
                        x={x}
                        y={Math.min(baseline - 2, barY + barHeight + 13)}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight="600"
                        fill={C.text}
                      >
                        {metricValue(kind, day.secondary)}
                      </SvgText>
                    </>
                  )}
                  {dateLabel ? (
                    <SvgText
                      x={x}
                      y={229}
                      textAnchor="middle"
                      fontSize={12}
                      fill="#3F4A47"
                    >
                      {dateLabel}
                    </SvgText>
                  ) : null}
                </G>
              );
            }
            return (
              <G key={day.date}>
                <Circle
                  cx={x}
                  cy={valueY}
                  r={isLast ? 5 : 4}
                  fill={palette.deep}
                  stroke={C.white}
                  strokeWidth={2}
                />
                {showValueLabels && kind !== "mood" ? (
                  <SvgText
                    x={x}
                    y={valueY - 10}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight="700"
                    fill={C.text}
                  >
                    {metricValue(kind, day.value)}
                  </SvgText>
                ) : null}
                {dateLabel ? (
                  <SvgText
                    x={x}
                    y={229}
                    textAnchor="middle"
                    fontSize={12}
                    fill="#3F4A47"
                  >
                    {dateLabel}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
        {kind === "mood" && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top,
              bottom: height - baseline,
              left,
              right: width - right,
            }}
          >
            {days.map((day, index) =>
              day.value == null ? null : (
                <View
                  key={`mood-${day.date}`}
                  style={{
                    position: "absolute",
                    left: slot * (index + 0.5) - 9,
                    top: yFor(day.value) - top - 9,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: C.white,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={moodLevelIcons[Math.max(0, Math.min(4, Math.round(day.value) - 1))]}
                    size={15}
                    color={palette.deep}
                  />
                </View>
              ),
            )}
          </View>
        )}
        <View
          style={{
            position: "absolute",
            top,
            bottom: height - baseline,
            left,
            right: width - right,
            flexDirection: "row",
          }}
        >
          {days.map((day, index) => (
            <Pressable
              key={day.date}
              accessibilityRole="button"
              accessibilityLabel={`${DateTime.fromISO(day.date).toFormat("dd/MM/yyyy")}: ${day.value == null ? "chưa ghi" : `${metricValue(kind, day.value, day.secondary)} ${metricUnits[kind]}`}`}
              accessibilityState={{ selected: selected === index }}
              hitSlop={4}
              onPress={() => setSelected(index)}
              style={{ flex: 1, minHeight: 48 }}
            />
          ))}
        </View>
      </View>
      <Text
        style={{
          color: C.text,
          fontSize: 13,
          textAlign: "center",
          minHeight: 20,
        }}
      >
        {selectedDay
          ? `${DateTime.fromISO(selectedDay.date).toFormat("dd/MM/yyyy")} · ${valueLabel}`
          : "Chạm vào điểm để xem giá trị và ngày"}
      </Text>
      <Text style={{ color: C.text, fontSize: 13 }}>
        Ngày chưa ghi được để trống.
      </Text>
    </View>
  );
}
