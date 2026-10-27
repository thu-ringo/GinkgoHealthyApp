import React from "react";
import {
  Image,
  Text,
  View,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import * as Crypto from "expo-crypto";
import { api, changed } from "../../src/api";
import {
  Day,
  Entry,
  HealthData,
  MetricKind,
  Occurrence,
  Profile,
} from "../../src/types";
import {
  BrandHeader,
  C,
  Page,
  State,
  TextLink,
  useAction,
} from "../../src/ui";
import { metricLabels, metricValue } from "../../src/metric-meta";
import { HomeHealthTrends, valuesByDay } from "../../src/health-report";
import { articles } from "../../src/articles";
import { useReducedMotion } from "../../src/use-reduced-motion";

const metricTones = {
  water: { color: "#087FD1", background: "#E7F4FF", border: "#7EC5FA" },
  sleep: { color: "#6945D8", background: "#F2ECFF", border: "#BA9AFF" },
  weight: { color: "#07865C", background: "#E9F7EF", border: "#78C8A4" },
  heart_rate: { color: "#E42C59", background: "#FFF0F3", border: "#FF9BB5" },
};

function HomeSection({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        minHeight: 34,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <Text style={{ flex: 1, color: "#18283D", fontSize: 22, fontWeight: "800" }}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export default function Today() {
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const q = useQuery({
    queryKey: ["today"],
    queryFn: ({ signal }) =>
      api<{ date: string; profile: Profile; summary: Day; entryCount: number }>(
        "/today",
        { signal },
      ),
  });
  const health = useQuery({
    queryKey: ["health-data"],
    queryFn: ({ signal }) => api<HealthData>("/health-data", { signal }),
  });
  const meds = useQuery({
    queryKey: ["reminder-horizon"],
    queryFn: ({ signal }) => api<Occurrence[]>("/occurrences", { signal }),
  });
  const from = DateTime.fromISO(q.data?.date || DateTime.now().toISODate()!)
      .minus({ days: 6 })
      .toISODate()!,
    to = q.data?.date || DateTime.now().toISODate()!;
  const entries = useQuery({
    queryKey: ["entries", from, to, q.data?.profile.timezone],
    queryFn: ({ signal }) =>
      api<Entry[]>(`/entries?from=${from}&to=${to}`, { signal }),
    enabled: !!q.data,
  });
  const action = useAction(),
    data = q.data;
  const now = DateTime.now().setZone(data?.profile.timezone || "Asia/Ho_Chi_Minh");
  const pendingOccurrences = (meds.data ?? [])
    .filter((occurrence) => !occurrence.cancelled && !occurrence.status)
    .sort((a, b) => a.due_at.localeCompare(b.due_at));
  const next =
    pendingOccurrences.find(
      (occurrence) =>
        DateTime.fromISO(occurrence.due_at).toMillis() >= now.toMillis(),
    ) ?? pendingOccurrences[0];
  const isOverdue =
    !!next && DateTime.fromISO(next.due_at).toMillis() < now.toMillis();
  const zone = data?.profile.timezone || "Asia/Ho_Chi_Minh";
  const waterGoal = data?.profile.water_goal;
  const todayWater = data?.summary.water;
  const waterProgress =
    todayWater != null && waterGoal != null && waterGoal > 0
      ? Math.min(1, Math.max(0, todayWater / waterGoal))
      : null;
  const quickAddWater = () =>
    action.run(async () => {
      const id = Crypto.randomUUID();
      await api(`/entries/${id}`, {
        method: "PUT",
        body: {
          id,
          kind: "water",
          value: 250,
          secondary: null,
          unit: "ml",
          measured_at: new Date().toISOString(),
          source: "manual",
          note: "",
        },
      });
      await changed();
    }, "Đã ghi thêm 250 ml nước");
  const openMetric = (kind: MetricKind, period = "week") =>
    router.push({ pathname: "/metric", params: { kind, period } });
  const reportDates = Array.from({ length: 7 }, (_, index) =>
    DateTime.fromISO(from, { zone: "utc" }).plus({ days: index }).toISODate()!,
  );
  const weekSeries = valuesByDay(entries.data ?? [], reportDates, zone);
  const latestMetric = (kind: MetricKind) =>
    health.data?.metrics.find((metric) => metric.kind === kind);
  const sleepMetric = latestMetric("sleep");
  const weightMetric = latestMetric("weight");
  const heartMetric = latestMetric("heart_rate");
  const recordedDays = {
    water: weekSeries.water.filter((point) => point.value != null).length,
    sleep: weekSeries.sleep.filter((point) => point.value != null).length,
    weight: weekSeries.weight.filter((point) => point.value != null).length,
    heart_rate: weekSeries.heart_rate.filter((point) => point.value != null).length,
  };
  const trackedCount = Object.values(recordedDays).filter((count) => count > 0).length;
  const availableWidth = Math.min(screenWidth, 680) - 32;
  const articleCardWidth = (availableWidth - 12) / 2;
  const featuredArticles = articles.filter((article) =>
    ["balanced-diet", "healthy-hydration"].includes(article.id),
  );
  const narrowScreen = screenWidth < 390;
  const compactCards = screenWidth < 430;
  return (
    <Page horizontalPadding={16} backgroundColor="#FAFCFA">
      <BrandHeader
        title="Ginkgo"
        subtitle="Chăm sóc sức khỏe mỗi ngày"
        logoSource={require("../../assets/Ginkgo.png")}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở hồ sơ"
            onPress={() => router.push("/profile")}
            style={s.avatar}
          >
            <Text style={{ color: C.primary, fontWeight: "700", fontSize: 18 }}>
              {data?.profile.name?.slice(0, 1).toUpperCase() || "G"}
            </Text>
          </Pressable>
        }
      />
      <View style={{ gap: 6 }}>
        <Text style={s.date}>
          {DateTime.now()
            .setZone(zone)
            .setLocale("vi")
            .toFormat("cccc, dd 'tháng' MM, yyyy")}
        </Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={s.greeting}>
              {data?.profile.name
                ? `Chào ${data.profile.name.slice(0, 1).toUpperCase()}${data.profile.name.slice(1)} 👋`
                : "Chào bạn 👋"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thêm bản ghi"
            onPress={() => router.push("/entry")}
            style={[s.add, narrowScreen && s.addCompact]}
          >
            <Ionicons name="add" size={23} color="#FFFFFF" />
            {!narrowScreen && (
              <Text style={s.addLabel}>Thêm bản ghi</Text>
            )}
          </Pressable>
        </View>
      </View>
      <State query={q}>
        <State query={health}>
          <State query={entries}>
            <View style={{ gap: 12 }}>
              <View style={s.overviewCard}>
                <View style={s.overviewHeading}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={s.overviewTitle}>Tổng quan sức khỏe</Text>
                    <Text style={s.overviewDescription}>
                      Bạn đã ghi nhận {trackedCount}/4 chỉ số trong 7 ngày gần nhất.
                    </Text>
                  </View>
                  <OverviewIllustration compact={narrowScreen} />
                </View>
                <View
                  style={[
                    s.overviewGrid,
                    screenWidth >= 430 ? s.overviewGridWide : null,
                  ]}
                >
                  {([
                    {
                      kind: "water",
                      label: "Nước uống",
                      icon: "water" as const,
                    },
                    {
                      kind: "sleep",
                      label: "Giấc ngủ",
                      icon: "moon" as const,
                    },
                    {
                      kind: "weight",
                      label: "Cân nặng",
                      icon: "scale-outline" as const,
                    },
                    {
                      kind: "heart_rate",
                      label: "Nhịp tim",
                      icon: "heart" as const,
                    },
                  ] as const).map((item) => (
                    <View
                      key={item.kind}
                      style={[
                        s.overviewItem,
                        screenWidth >= 430 ? s.overviewItemWide : null,
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={27}
                        color={metricTones[item.kind].color}
                      />
                      <Text
                        numberOfLines={1}
                        style={s.overviewMetricLabel}
                      >
                        {item.label}
                      </Text>
                      <Text style={s.overviewMetricCount}>
                        {recordedDays[item.kind]}/{reportDates.length} ngày
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={s.overviewFooter}>
                  <View style={{ flex: 1, minWidth: 160 }}>
                    <Text style={s.overviewFooterText}>
                      Tiếp tục duy trì thói quen ghi nhận để theo dõi sức khỏe tốt hơn.
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/health-data")}
                    style={({ pressed }) => [
                      s.overviewAction,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Text style={s.overviewActionText}>Xem chi tiết</Text>
                    <Ionicons name="chevron-forward" size={17} color="#087F5B" />
                  </Pressable>
                </View>
              </View>

              <HomeSection
                title="Chỉ số sức khỏe"
                action={
                  <TextLink
                    title="Xem tất cả"
                    onPress={() => router.push("/health-data")}
                  />
                }
              />
              <View style={s.metricGrid}>
                {([
                  {
                    kind: "water" as const,
                    label: metricLabels.water,
                    value:
                      todayWater == null
                        ? "Chưa có dữ liệu"
                        : `${metricValue("water", todayWater)} ml`,
                    detail: "Hôm nay",
                    icon: "water" as const,
                  },
                  {
                    kind: "sleep" as const,
                    label: metricLabels.sleep,
                    value:
                      sleepMetric?.value == null
                        ? "Chưa có dữ liệu"
                        : metricValue("sleep", sleepMetric.value),
                    detail: sleepMetric?.measured_at ? "Đêm gần nhất" : "Chưa ghi nhận",
                    icon: "moon-outline" as const,
                  },
                  {
                    kind: "weight" as const,
                    label: metricLabels.weight,
                    value:
                      weightMetric?.value == null
                        ? "Chưa có dữ liệu"
                        : `${metricValue("weight", weightMetric.value)} kg`,
                    detail: weightMetric?.measured_at
                      ? "Lần ghi nhận gần nhất"
                      : "Chưa ghi nhận",
                    icon: "scale-outline" as const,
                  },
                  {
                    kind: "heart_rate" as const,
                    label: metricLabels.heart_rate,
                    value:
                      heartMetric?.value == null
                        ? "Chưa có dữ liệu"
                        : `${metricValue("heart_rate", heartMetric.value)} bpm`,
                    detail: heartMetric?.measured_at ? "Lần đo gần nhất" : "Chưa ghi nhận",
                    icon: "heart" as const,
                  },
                ]).map((item) => (
                  <View
                    key={item.kind}
                    style={[
                      s.metricCard,
                      {
                        backgroundColor: metricTones[item.kind].background,
                        borderColor: metricTones[item.kind].border,
                      },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${item.label}: ${item.value}`}
                      onPress={() => openMetric(item.kind)}
                      style={({ pressed }) => [
                        s.metricMain,
                        { transform: [{ scale: pressed && !reduceMotion ? 0.985 : 1 }] },
                      ]}
                    >
                      <View
                        style={[
                          s.metricIcon,
                          compactCards && s.metricIconCompact,
                          { backgroundColor: metricTones[item.kind].color },
                        ]}
                      >
                        <Ionicons name={item.icon} size={31} color="#FFFFFF" />
                      </View>
                      <View style={s.metricInfo}>
                        <Text numberOfLines={1} style={s.metricLabel}>
                          {item.label}
                        </Text>
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          style={[
                            s.metricValue,
                            { color: metricTones[item.kind].color },
                          ]}
                        >
                          {item.value}
                        </Text>
                        <Text numberOfLines={1} style={s.metricDetail}>
                          {item.detail}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={metricTones[item.kind].color}
                      />
                    </Pressable>
                    {item.kind === "water" && (
                      <View style={s.waterExtras}>
                        {waterProgress != null && (
                          <View
                            accessibilityLabel={`Tiến độ mục tiêu nước ${Math.round(waterProgress * 100)} phần trăm`}
                            style={s.progressTrack}
                          >
                            <View
                              style={[
                                s.progressFill,
                                { width: `${Math.round(waterProgress * 100)}%` },
                              ]}
                            />
                          </View>
                        )}
                        <View
                          style={[
                            s.waterFooter,
                            compactCards ? s.waterFooterCompact : null,
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              s.waterGoalText,
                              compactCards ? s.waterGoalTextCompact : null,
                            ]}
                          >
                            {waterGoal != null && waterGoal > 0
                              ? `Mục tiêu: ${metricValue("water", waterGoal)} ml`
                              : "Chưa đặt mục tiêu"}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Ghi thêm 250 ml nước"
                            accessibilityState={{ disabled: action.busy }}
                            disabled={action.busy}
                            onPress={quickAddWater}
                            style={({ pressed }) => [
                              s.quickWater,
                              {
                                opacity: pressed || action.busy ? 0.65 : 1,
                                transform: [{ scale: pressed && !reduceMotion ? 0.985 : 1 }],
                              },
                            ]}
                          >
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                            <Text style={s.quickWaterText}>+250 ml</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <View style={{ gap: 10, paddingTop: 6 }}>
                <HomeSection
                  title="Xu hướng 7 ngày"
                  action={
                    <TextLink
                      title="Xem chi tiết"
                      onPress={() => router.push("/health-data")}
                    />
                  }
                />
                <Text style={s.trendSubtitle}>
                  Theo dõi sự thay đổi các chỉ số trong tuần.
                </Text>
                <HomeHealthTrends
                  entries={entries.data ?? []}
                  dates={reportDates}
                  zone={zone}
                  profile={data?.profile}
                />
              </View>
            </View>
          </State>

          <View style={{ gap: 12, paddingTop: 6 }}>
            <HomeSection
              title="Lịch thuốc sắp tới"
              action={
                <TextLink
                  title="Xem lịch"
                  onPress={() => router.push("/(tabs)/reminders")}
                />
              }
            />
            <State query={meds}>
              {next ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Mở lịch thuốc: ${next.medicine}, ${DateTime.fromISO(next.due_at).setZone(zone).toFormat("HH:mm dd/MM")}`}
                  onPress={() => router.push("/(tabs)/reminders")}
                  style={({ pressed }) => [
                    s.medicationCard,
                    {
                      opacity: pressed ? 0.92 : 1,
                      transform: [{ scale: pressed && !reduceMotion ? 0.985 : 1 }],
                    },
                  ]}
                >
                  <View style={s.medicationIcon}>
                    <Ionicons name="medkit" size={30} color="#C66A26" />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text numberOfLines={1} style={s.medicationName}>
                      {next.medicine}
                    </Text>
                    <Text numberOfLines={1} style={s.medicationDetails}>
                      {DateTime.fromISO(next.due_at)
                        .setZone(zone)
                        .toFormat("HH:mm · dd/MM")}{" "}
                      · {next.dose}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.medicationBadge,
                      isOverdue ? s.medicationBadgeOverdue : null,
                    ]}
                  >
                    <Text
                      style={[
                        s.medicationBadgeText,
                        isOverdue ? s.medicationBadgeTextOverdue : null,
                      ]}
                    >
                      {isOverdue ? "Chưa xác nhận" : "Sắp tới"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" color="#66788C" size={19} />
                </Pressable>
              ) : (
                <View style={s.medicationEmpty}>
                  <View style={s.medicationIcon}>
                    <Ionicons name="medkit-outline" size={30} color="#C66A26" />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={s.medicationName}>Chưa có lịch thuốc sắp tới</Text>
                    <Text style={s.medicationDetails}>
                      Thêm lịch để được nhắc đúng giờ.
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/schedule")}
                    style={s.createSchedule}
                  >
                    <Text style={s.createScheduleText}>Tạo lịch</Text>
                    <Ionicons name="chevron-forward" size={17} color="#087F5B" />
                  </Pressable>
                </View>
              )}
            </State>
          </View>

          <View style={{ gap: 12, paddingTop: 6 }}>
            <HomeSection
              title="Kiến thức cho bạn"
              action={
                <TextLink
                    title="Xem thêm"
                  onPress={() => router.push("/(tabs)/explore")}
                />
              }
            />
            <View style={s.articleGrid}>
              {featuredArticles.map((article) => (
                <Pressable
                  key={article.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Mở bài viết: ${article.title}`}
                  onPress={() => router.push(`/article/${article.id}`)}
                  style={({ pressed }) => [
                    s.articleCard,
                    {
                      width: articleCardWidth,
                      opacity: pressed ? 0.84 : 1,
                      transform: [{ scale: pressed && !reduceMotion ? 0.985 : 1 }],
                    },
                  ]}
                >
                  <Image
                    source={article.image}
                    accessibilityLabel={article.title}
                    resizeMode="cover"
                    style={[s.articleImage, { height: articleCardWidth * 0.75 }]}
                  />
                  <Text style={s.articleCategory}>{article.category}</Text>
                  <Text
                    numberOfLines={3}
                    style={{ color: "#18283D", fontSize: 15, fontWeight: "700", lineHeight: 20 }}
                  >
                    {article.title}
                  </Text>
                  <Text style={{ color: "#66788C", fontSize: 13 }}>
                    {article.readingTime}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {!data?.profile.name && (
            <TextLink
              title="Hoàn thiện hồ sơ và mục tiêu →"
              onPress={() => router.push("/profile")}
            />
          )}
        </State>
      </State>
    </Page>
  );
}
function OverviewIllustration({ compact }: { compact: boolean }) {
  return (
    <View
      accessible={false}
      style={{
        width: compact ? 68 : 92,
        height: 78,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={s.illustrationClipboard}>
        <View style={s.illustrationClip} />
        <View style={s.illustrationBars}>
          {[22, 32, 18].map((height, index) => (
            <View
              key={index}
              style={[
                s.illustrationBar,
                { height, backgroundColor: index === 1 ? "#087F5B" : "#71C49A" },
              ]}
            />
          ))}
        </View>
        <View style={s.illustrationLine} />
      </View>
      <View style={s.illustrationHeart}>
        <Ionicons name="heart" size={17} color="#E42C59" />
      </View>
      <Ionicons
        name="leaf"
        size={18}
        color="#07865C"
        style={{ position: "absolute", bottom: 1, left: 3 }}
      />
      <Ionicons
        name="leaf"
        size={15}
        color="#51A878"
        style={{ position: "absolute", top: 4, left: 7, transform: [{ rotate: "-35deg" }] }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9F7F0",
  },
  date: { fontSize: 14, color: "#66788C", textTransform: "capitalize" },
  greeting: {
    color: "#18283D",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  add: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#087F5B",
  },
  addCompact: {
    width: 48,
    paddingHorizontal: 0,
    borderRadius: 24,
  },
  addLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  overviewCard: {
    padding: 18,
    gap: 14,
    borderRadius: 22,
    backgroundColor: "#E9F7F0",
    borderWidth: 1,
    borderColor: "#D7EDE2",
  },
  overviewHeading: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  overviewTitle: {
    color: "#18283D",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  overviewDescription: {
    color: "#536B64",
    fontSize: 13,
    lineHeight: 18,
  },
  illustrationClipboard: {
    width: 50,
    height: 64,
    alignItems: "center",
    paddingTop: 10,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B7DEC9",
  },
  illustrationClip: {
    position: "absolute",
    top: -3,
    width: 22,
    height: 9,
    borderRadius: 6,
    backgroundColor: "#68B98D",
  },
  illustrationBars: {
    height: 37,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  illustrationBar: { width: 7, borderRadius: 4 },
  illustrationLine: {
    width: 30,
    height: 3,
    marginTop: 5,
    borderRadius: 2,
    backgroundColor: "#D7EDE2",
  },
  illustrationHeart: {
    position: "absolute",
    top: 8,
    right: 0,
    width: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFD2DC",
  },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  overviewGridWide: { flexWrap: "nowrap" },
  overviewItem: {
    width: "48%",
    flexGrow: 1,
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  overviewItemWide: { width: "23%" },
  overviewMetricLabel: {
    color: "#536B64",
    fontSize: 12,
    fontWeight: "600",
  },
  overviewMetricCount: {
    color: "#18283D",
    fontSize: 15,
    fontWeight: "800",
  },
  overviewFooter: {
    paddingTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#CFE7D9",
  },
  overviewFooterText: {
    color: "#536B64",
    fontSize: 13,
    lineHeight: 19,
  },
  overviewAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#78C8A4",
  },
  overviewActionText: { color: "#087F5B", fontSize: 14, fontWeight: "700" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: {
    width: "48%",
    flexGrow: 1,
    minHeight: 140,
    padding: 12,
    gap: 7,
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1.5,
  },
  metricMain: {
    minHeight: 73,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  metricIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
  },
  metricIconCompact: { width: 48, height: 48 },
  metricInfo: { flex: 1, minWidth: 0, gap: 3 },
  metricLabel: { color: "#18283D", fontSize: 14, fontWeight: "700" },
  metricValue: { fontSize: 20, fontWeight: "800" },
  metricDetail: { color: "#536B64", fontSize: 12 },
  waterExtras: { gap: 5 },
  progressTrack: {
    height: 7,
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: "#C7E4FA",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#087FD1",
  },
  waterFooter: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  waterFooterCompact: { flexDirection: "column", alignItems: "flex-start" },
  waterGoalText: { flex: 1, color: "#31566F", fontSize: 11, fontWeight: "600" },
  waterGoalTextCompact: { fontSize: 12 },
  quickWater: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: "#087FD1",
  },
  quickWaterText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  trendSubtitle: {
    marginTop: -7,
    color: "#66788C",
    fontSize: 14,
    lineHeight: 20,
  },
  medicationCard: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFE8E1",
  },
  medicationIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "#FFF1E4",
  },
  medicationName: {
    color: "#18283D",
    fontSize: 17,
    fontWeight: "700",
  },
  medicationDetails: { color: "#66788C", fontSize: 14 },
  medicationBadge: {
    minHeight: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 16,
    backgroundColor: "#E7F4FF",
  },
  medicationBadgeOverdue: { backgroundColor: "#FFF1E4" },
  medicationBadgeText: { color: "#0873B8", fontSize: 12, fontWeight: "700" },
  medicationBadgeTextOverdue: { color: "#A9551C" },
  medicationEmpty: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFE8E1",
  },
  createSchedule: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#E9F7F0",
  },
  createScheduleText: { color: "#087F5B", fontSize: 14, fontWeight: "700" },
  articleGrid: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  articleCard: {
    padding: 10,
    gap: 7,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE8E2",
  },
  articleImage: { width: "100%", borderRadius: 12 },
  articleCategory: {
    color: "#087F5B",
    fontSize: 12,
    fontWeight: "700",
  },
});
