import React from "react";
import { Image, Text, View, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { DateTime } from "luxon";
import * as Crypto from "expo-crypto";
import { api, changed } from "../../src/api";
import {
  Day,
  HealthData,
  MetricKind,
  Occurrence,
  Profile,
} from "../../src/types";
import {
  BrandMark,
  Button,
  C,
  Feedback,
  H,
  Icon,
  kindIcons,
  Page,
  Section,
  State,
  T,
  TextLink,
  Title,
  useAction,
} from "../../src/ui";
import { metricLabels, metricUnits, metricValue } from "../../src/metric-meta";

export default function Today() {
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
  const week = useQuery({
    queryKey: ["stats", from, to, q.data?.profile.timezone],
    queryFn: ({ signal }) =>
      api<{ days: Day[] }>(`/stats?from=${from}&to=${to}`, { signal }),
    enabled: !!q.data,
  });
  const action = useAction(),
    data = q.data;
  const next = meds.data?.find(
    (o) =>
      !o.cancelled && !o.status && +new Date(o.due_at) > meds.dataUpdatedAt,
  );
  const latest = (kind: MetricKind) =>
    health.data?.metrics.find((m) => m.kind === kind);
  const recordedDays =
    week.data?.days.filter((d) =>
      [d.water, d.sleep, d.weight, d.heart_rate, d.blood_pressure, d.mood].some(
        (n) => n != null,
      ),
    ).length ?? 0;
  const waterDays =
      week.data?.days.flatMap((d) => (d.water == null ? [] : [d.water])) || [],
    sleepDays =
      week.data?.days.flatMap((d) => (d.sleep == null ? [] : [d.sleep])) || [];
  const weeklyWater = waterDays.length
      ? waterDays.reduce((a, n) => a + n, 0)
      : null,
    averageSleep = sleepDays.length
      ? sleepDays.reduce((a, n) => a + n, 0) / sleepDays.length
      : null;
  const weightDays =
    week.data?.days.flatMap((d) => (d.weight == null ? [] : [d.weight])) || [];
  const openMetric = (kind: MetricKind, period = "week") =>
    router.push({ pathname: "/metric", params: { kind, period } });
  const tones = {
    water: { bg: C.primary, ink: C.white },
    sleep: { bg: "#254F43", ink: C.white },
    weight: { bg: C.soft, ink: C.primary },
    heart_rate: { bg: "#F9E9E1", ink: "#7E4B3C" },
  };
  const newUser = health.data?.metrics.every((m) => m.value == null);
  return (
    <Page>
      <View style={s.row}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            flex: 1,
          }}
        >
          <BrandMark size={36} />
          <Text
            style={{
              color: C.primary,
              fontSize: 21,
              fontWeight: "700",
              letterSpacing: -0.5,
            }}
          >
            Ginkgo
          </Text>
        </View>
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
      </View>
      <View style={{ gap: 6 }}>
        <Text style={s.date}>
          {DateTime.now()
            .setZone(data?.profile.timezone || "Asia/Ho_Chi_Minh")
            .setLocale("vi")
            .toFormat("cccc, dd 'tháng' MM")}
        </Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Title>
              {data?.profile.name
                ? `Chào ${data.profile.name}.`
                : "Hôm nay của bạn"}
            </Title>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thêm bản ghi"
            onPress={() => router.push("/entry")}
            style={s.add}
          >
            <Ionicons name="add" size={25} color={C.primary} />
          </Pressable>
        </View>
      </View>
      <State query={q}>
        <State query={health}>
          {newUser && (
            <View style={s.welcome}>
              <View style={{ flex: 1, gap: 7 }}>
                <H>Mỗi ngày, một chút.</H>
                <T muted>Bắt đầu bằng một cốc nước hoặc giấc ngủ của bạn.</T>
                <TextLink
                  title="Ghi bản đầu tiên →"
                  onPress={() => router.push("/entry")}
                />
              </View>
              <Image
                accessible={false}
                source={require("../../assets/wellness-ritual.png")}
                style={{ width: 100, height: 126, borderRadius: 16 }}
                resizeMode="cover"
              />
            </View>
          )}
          <Section
            title="Điểm nhấn"
            action={
              <TextLink
                title="Tất cả chỉ số"
                onPress={() => router.push("/health-data")}
              />
            }
          />
          <View style={s.grid}>
            {(["water", "sleep", "weight", "heart_rate"] as const).map(
              (kind) => {
                const m = latest(kind),
                  daily = kind === "water" ? data?.summary.water : m?.value,
                  tone = tones[kind];
                return (
                  <Pressable
                    key={kind}
                    accessibilityRole="button"
                    accessibilityLabel={`Thống kê ${metricLabels[kind]}`}
                    onPress={() =>
                      openMetric(kind, kind === "water" ? "today" : "week")
                    }
                    style={({ pressed }) => [
                      s.tile,
                      { backgroundColor: tone.bg, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <View style={[s.row, { justifyContent: "space-between" }]}>
                      <Ionicons
                        name={kindIcons[kind]}
                        size={29}
                        color={tone.ink}
                      />
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={tone.ink}
                      />
                    </View>
                    <Text
                      style={{
                        color: tone.ink,
                        fontSize: 14,
                        fontWeight: "500",
                      }}
                    >
                      {metricLabels[kind]}
                    </Text>
                    <Text
                      style={{
                        color: tone.ink,
                        fontSize: 26,
                        fontWeight: "700",
                        letterSpacing: -0.5,
                      }}
                    >
                      {metricValue(kind, daily)}{" "}
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "400",
                          letterSpacing: 0,
                        }}
                      >
                        {daily == null ? "" : metricUnits[kind]}
                      </Text>
                    </Text>
                    <Text
                      style={{ color: tone.ink, opacity: 0.85, fontSize: 11 }}
                    >
                      {kind === "water"
                        ? "Đã ghi hôm nay"
                        : m?.measured_at
                          ? `Gần nhất ${DateTime.fromISO(m.measured_at).setZone(data?.profile.timezone).toFormat("dd/MM")}`
                          : "Chưa có bản ghi"}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
          <View style={s.quick}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: C.text }}>
                Thêm một cốc nước?
              </Text>
              <T muted>Ghi nhanh 250 ml</T>
            </View>
            <Button
              title="+ 250 ml"
              secondary
              disabled={action.busy}
              onPress={() =>
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
                }, "Đã ghi thêm 250 ml nước")
              }
            />
          </View>
          <Feedback action={action} />
          <Section
            title="Báo cáo 7 ngày"
            action={
              <TextLink title="Chi tiết" onPress={() => openMetric("water")} />
            }
          />
          <State query={week}>
            <View style={s.grid}>
              {[
                {
                  label: "Tổng nước",
                  value: metricValue("water", weeklyWater),
                  unit: weeklyWater == null ? "" : "ml",
                  kind: "water" as MetricKind,
                  icon: "water-outline" as const,
                },
                {
                  label: "Ngủ trung bình",
                  value: metricValue("sleep", averageSleep),
                  unit: "",
                  kind: "sleep" as MetricKind,
                  icon: "moon-outline" as const,
                },
                {
                  label: "Cân nặng gần nhất",
                  value: metricValue("weight", weightDays.at(-1)),
                  unit: weightDays.length ? "kg" : "",
                  kind: "weight" as MetricKind,
                  icon: "scale-outline" as const,
                },
                {
                  label: "Ngày có số liệu",
                  value: `${recordedDays}/7`,
                  unit: "ngày",
                  kind: null,
                  icon: "calendar-outline" as const,
                },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityLabel={
                    item.kind
                      ? `Xem báo cáo ${item.label.toLowerCase()}`
                      : "Xem nhật ký 7 ngày"
                  }
                  onPress={() =>
                    item.kind
                      ? openMetric(item.kind)
                      : router.push("/(tabs)/journal")
                  }
                  style={s.report}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons name={item.icon} color={C.primary} size={17} />
                    <Text
                      style={{ color: C.muted, fontSize: 12, flexShrink: 1 }}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <Text
                    style={{ color: C.text, fontSize: 21, fontWeight: "600" }}
                  >
                    {item.value}{" "}
                    <Text
                      style={{
                        color: C.muted,
                        fontSize: 12,
                        fontWeight: "400",
                      }}
                    >
                      {item.unit}
                    </Text>
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: C.muted }}>
              Ngủ trung bình tính trên {sleepDays.length} ngày đã ghi.
            </Text>
          </State>
          <Section
            title="Lịch thuốc gần nhất"
            action={
              <TextLink
                title="Xem lịch"
                onPress={() => router.push("/(tabs)/reminders")}
              />
            }
          />
          <State query={meds}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                next ? "Xem lần uống thuốc sắp tới" : "Tạo lịch thuốc"
              }
              onPress={() =>
                router.push(next ? "/(tabs)/reminders" : "/schedule")
              }
              style={s.quick}
            >
              <Icon name="medical-outline" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{ color: C.text, fontSize: 16, fontWeight: "600" }}
                >
                  {next?.medicine || "Chưa có lần uống sắp tới"}
                </Text>
                <T muted>
                  {next
                    ? `${DateTime.fromISO(next.due_at).setZone(data?.profile.timezone).toFormat("HH:mm · dd/MM")} · ${next.dose}`
                    : "Thêm lịch để được nhắc đúng giờ"}
                </T>
              </View>
              <Ionicons name="chevron-forward" color={C.muted} size={18} />
            </Pressable>
          </State>
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
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.soft,
    borderColor: C.white,
    borderWidth: 2,
  },
  date: { fontSize: 12, color: C.muted, textTransform: "capitalize" },
  add: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: C.soft,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    flexBasis: "46%",
    flexGrow: 1,
    minWidth: 122,
    borderRadius: 22,
    padding: 17,
    gap: 10,
  },
  report: {
    flexBasis: "46%",
    flexGrow: 1,
    minWidth: 122,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: "#E9EDE6",
    borderRadius: 18,
    padding: 15,
    gap: 12,
    minHeight: 96,
  },
  quick: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: "#E9EDE6",
  },
  welcome: {
    padding: 16,
    backgroundColor: C.soft,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
  },
});
