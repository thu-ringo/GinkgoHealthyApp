import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DateTime } from "luxon";
import { useQuery } from "@tanstack/react-query";
import { api, changed } from "../../src/api";
import { Entry, kinds, Profile } from "../../src/types";
import {
  Button,
  C,
  Empty,
  Feedback,
  BrandHeader,
  Icon,
  kindIcons,
  Page,
  Row,
  Section,
  State,
  T,
  TextLink,
  useAction,
} from "../../src/ui";
import { metricColors, metricValue } from "../../src/metric-meta";
import { DateRange } from "../../src/date-range";

export default function Journal() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => api<Profile>("/me", { signal }),
  });
  const zone = me.data?.timezone || "Asia/Ho_Chi_Minh",
    today = DateTime.now().setZone(zone).toISODate()!;
  const [range, setRange] = useState<{ from: string; to: string }>(),
    [rangeMode, setRangeMode] = useState<"7days" | "30days" | "custom">("7days"),
    [kind, setKind] = useState("all"),
    [confirm, setConfirm] = useState(""),
    [expanded, setExpanded] = useState("");
  const from =
      range?.from || DateTime.fromISO(today, { zone: "utc" }).minus({ days: 6 }).toISODate()!,
    to = range?.to || today;
  const entries = useQuery({
    queryKey: ["entries", from, to, zone],
    queryFn: ({ signal }) =>
      api<Entry[]>(`/entries?from=${from}&to=${to}`, { signal }),
    enabled: !!me.data,
  });
  const action = useAction(),
    rows = entries.data?.filter((e) => kind === "all" || e.kind === kind) || [];
  const groups = Object.entries(
    rows.reduce<Record<string, Entry[]>>((all, entry) => {
      const day = DateTime.fromISO(entry.measured_at)
        .setZone(zone)
        .toISODate()!;
      (all[day] ??= []).push(entry);
      return all;
    }, {}),
  ).sort(([a], [b]) => b.localeCompare(a));
  const filterKinds = [
    "weight",
    "water",
    "sleep",
    "heart_rate",
    "blood_pressure",
    "mood",
    "note",
  ] as const;
  const filters = [
    {
      key: "all",
      title: "Tất cả",
      icon: "grid-outline" as const,
      color: "#087F5B",
      background: "#E9F7F0",
      border: "#78C8A4",
    },
    ...filterKinds.map((key) => ({
      key,
      title: kinds[key].label.replace(" (1–5)", ""),
      icon: kindIcons[key],
      color: metricColors[key].icon,
      background: metricColors[key].background,
      border: metricColors[key].border,
    })),
  ];
  return (
    <Page horizontalPadding={16} backgroundColor="#F8FBF9">
      <BrandHeader
        title="Nhật ký"
        subtitle="Những ghi nhận của bạn, theo từng ngày."
        action={
          <Button
            title="Thêm"
            icon="add"
            minHeight={44}
            primaryColor="#287A56"
            onPress={() => router.push("/entry")}
          />
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mở thống kê các chỉ số"
        onPress={() => router.push("/health-data")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: "#E8F5EE",
          borderRadius: 16,
          padding: 14,
          minHeight: 80,
          borderWidth: 1,
          borderColor: "#DFE8E1",
        }}
      >
        <Icon name="stats-chart-outline" tone="#FFFFFF" color="#155C43" size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: "#20332B", fontSize: 16, fontWeight: "700" }}>
            Thống kê sức khỏe
          </Text>
          <Text style={{ color: "#61746B", fontSize: 13 }}>
            Xem xu hướng theo từng chỉ số
          </Text>
        </View>
        <Ionicons name="chevron-forward" color="#155C43" size={20} />
      </Pressable>
      <DateRange
        from={from}
        to={to}
        onChange={(a, b) => setRange({ from: a, to: b })}
        presets={[]}
        variant="journal"
        today={today}
        selectedMode={rangeMode}
        onModeChange={(mode) => {
          if (mode === "7days" || mode === "30days" || mode === "custom")
            setRangeMode(mode);
        }}
      />
      <View style={{ gap: 10 }}>
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: "row", gap: 8 }}>
            {filters.slice(row * 4, row * 4 + 4).map((filter) => (
              <FilterChip
                key={filter.key}
                title={filter.title}
                icon={filter.icon}
                color={filter.color}
                background={filter.background}
                border={filter.border}
                isAll={filter.key === "all"}
                selected={kind === filter.key}
                onPress={() => setKind(filter.key)}
              />
            ))}
          </View>
        ))}
      </View>
      <Section
        title="Lịch sử bản ghi"
        action={
          <Text style={{ color: "#61746B", fontSize: 13 }}>
            {rows.length} bản ghi
          </Text>
        }
      />
      <Feedback action={action} />
      <State query={me}>
        <State query={entries}>
          {!rows.length && (
            <Empty
              title="Chưa có bản ghi trong khoảng thời gian này"
              description="Thử chọn khoảng ngày hoặc loại ghi nhận khác, hoặc thêm bản ghi mới."
              icon={
                kind !== "all" && kind in kindIcons
                  ? kindIcons[kind]
                  : "book-outline"
              }
              action={
                <Button
                  title={`Ghi ${kind !== "all" ? kinds[kind]?.label.toLowerCase() : "bản ghi"}`}
                  icon="add"
                  onPress={() =>
                    router.push({
                      pathname: "/entry",
                      ...(kind !== "all" ? { params: { kind } } : {}),
                    })
                  }
                />
              }
            />
          )}
          {!!rows.length && (
            <View style={{ gap: 18 }}>
              {groups.map(([day, dayEntries]) => {
                const yesterday = DateTime.fromISO(today, { zone: "utc" }).minus({ days: 1 }).toISODate();
                const dayLabel =
                  day === today
                    ? "Hôm nay"
                    : day === yesterday
                      ? "Hôm qua"
                      : DateTime.fromISO(day, { zone: "utc" }).setLocale("vi").toFormat("cccc");
                return (
                  <View key={day} style={{ gap: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <Text style={{ color: "#20332B", fontSize: 15, fontWeight: "700" }}>
                        {dayLabel} · {DateTime.fromISO(day, { zone: "utc" }).toFormat("dd/MM/yyyy")}
                      </Text>
                      <Text style={{ color: "#61746B", fontSize: 13 }}>
                        {dayEntries.length} bản ghi
                      </Text>
                    </View>
                    {dayEntries.map((e) => {
                      const colors =
                        metricColors[e.kind as keyof typeof metricColors];
                      return (
                        <View
                          key={e.id}
                          style={{
                            padding: 12,
                            gap: 8,
                            borderWidth: 1,
                            borderColor: colors?.border ?? C.border,
                            borderRadius: 15,
                            backgroundColor: C.white,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <View
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 14,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: colors?.background ?? C.soft,
                              }}
                            >
                              <Icon
                                name={kindIcons[e.kind]}
                                size={44}
                                tone="transparent"
                                color={colors?.icon ?? C.primary}
                              />
                            </View>
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text
                                style={{
                                  color: C.text,
                                  fontSize: 14,
                                  fontWeight: "600",
                                }}
                              >
                                {kinds[e.kind]?.label.replace(" (1–5)", "")}
                              </Text>
                              {e.kind !== "note" && (
                                <Text
                                  style={{
                                    color: C.text,
                                  fontSize: 21,
                                  fontWeight: "700",
                                  }}
                                >
                                  {metricValue(e.kind, e.value, e.secondary)}{" "}
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      fontWeight: "400",
                                      color: C.muted,
                                    }}
                                  >
                                    {e.kind === "sleep"
                                      ? ""
                                      : e.unit === "level"
                                        ? "/ 5"
                                        : e.unit}
                                  </Text>
                                </Text>
                              )}
                              <Text style={{ color: C.muted, fontSize: 13 }}>
                                {DateTime.fromISO(e.measured_at)
                                  .setZone(zone)
                                  .toFormat("HH:mm")}
                              </Text>
                            </View>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Tùy chọn bản ghi ${kinds[e.kind]?.label}`}
                              accessibilityState={{ expanded: expanded === e.id }}
                              onPress={() => {
                                setExpanded(expanded === e.id ? "" : e.id);
                                setConfirm("");
                              }}
                              style={{
                                minHeight: 48,
                                minWidth: 48,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Ionicons
                                name="ellipsis-horizontal"
                                color={C.muted}
                                size={21}
                              />
                            </Pressable>
                          </View>
                          {!!e.note && <T>{e.note}</T>}
                          {expanded === e.id && (
                            <>
                              <T muted>
                                Nguồn:{" "}
                                {e.source === "manual"
                                  ? "Nhập thủ công"
                                  : e.source}
                              </T>
                              <Row>
                                <TextLink
                                  title="Sửa bản ghi"
                                  onPress={() =>
                                    router.push({
                                      pathname: "/entry",
                                      params: { record: JSON.stringify(e) },
                                    })
                                  }
                                />
                                <Button
                                  secondary
                                  danger
                                  title={
                                    confirm === e.id ? "Xác nhận xóa" : "Xóa"
                                  }
                                  disabled={action.busy}
                                  onPress={() => {
                                    if (confirm !== e.id) {
                                      setConfirm(e.id);
                                      return;
                                    }
                                    void action.run(async () => {
                                      await api(`/entries/${e.id}`, {
                                        method: "DELETE",
                                      });
                                      setConfirm("");
                                      await changed();
                                    }, "Đã xóa bản ghi");
                                  }}
                                />
                              </Row>
                            </>
                          )}
                        </View>
                      );
                    })}
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

function FilterChip({
  title,
  selected,
  color,
  background,
  border,
  isAll,
  icon,
  onPress,
}: {
  title: string;
  selected: boolean;
  color: string;
  background: string;
  border: string;
  isAll: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 94,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingHorizontal: 4,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: selected && isAll ? "#FFFFFF" : background,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? color : border,
      }}
    >
      <Ionicons
        name={icon ?? "ellipse"}
        size={27}
        color={color}
      />
      <Text
        numberOfLines={2}
        style={{
          color,
          fontSize: selected ? 14 : 13,
          lineHeight: 17,
          textAlign: "center",
          fontWeight: selected ? "700" : "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
