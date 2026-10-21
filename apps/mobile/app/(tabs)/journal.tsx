import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DateTime } from "luxon";
import { useQuery } from "@tanstack/react-query";
import { api, changed } from "../../src/api";
import { Entry, kinds, Profile } from "../../src/types";
import {
  Button,
  Chip,
  C,
  Empty,
  Feedback,
  Header,
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
import { metricValue } from "../../src/metric-meta";
import { DateRange } from "../../src/date-range";

export default function Journal() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) => api<Profile>("/me", { signal }),
  });
  const zone = me.data?.timezone || "Asia/Ho_Chi_Minh",
    today = DateTime.now().setZone(zone).toISODate()!;
  const [range, setRange] = useState<{ from: string; to: string }>(),
    [kind, setKind] = useState("all"),
    [confirm, setConfirm] = useState(""),
    [expanded, setExpanded] = useState("");
  const from =
      range?.from || DateTime.fromISO(today).minus({ days: 6 }).toISODate()!,
    to = range?.to || today;
  const entries = useQuery({
    queryKey: ["entries", from, to, zone],
    queryFn: ({ signal }) =>
      api<Entry[]>(`/entries?from=${from}&to=${to}`, { signal }),
    enabled: !!me.data,
  });
  const action = useAction(),
    rows = entries.data?.filter((e) => kind === "all" || e.kind === kind) || [];
  return (
    <Page>
      <Header
        title="Nhật ký"
        subtitle="Những ghi nhận của bạn, theo từng ngày."
        action={
          <Button
            title="Thêm"
            icon="add"
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
          backgroundColor: C.soft,
          borderRadius: 20,
          padding: 15,
          minHeight: 74,
        }}
      >
        <Icon name="stats-chart-outline" tone="#D9EADC" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: C.primary, fontSize: 16, fontWeight: "600" }}>
            Thống kê sức khỏe
          </Text>
          <T muted>Xem xu hướng theo từng chỉ số</T>
        </View>
        <Ionicons name="chevron-forward" color={C.primary} size={18} />
      </Pressable>
      <DateRange
        from={from}
        to={to}
        onChange={(a, b) => setRange({ from: a, to: b })}
        presets={[7, 30].map((n) => ({
          label: `${n} ngày`,
          from: DateTime.fromISO(today)
            .minus({ days: n - 1 })
            .toISODate()!,
          to: today,
        }))}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <Chip
          title="Tất cả"
          selected={kind === "all"}
          onPress={() => setKind("all")}
        />
        {Object.keys(kinds).map((k) => (
          <Chip
            key={k}
            title={kinds[k].label.replace(" (1–5)", "")}
            selected={kind === k}
            icon={kindIcons[k]}
            onPress={() => setKind(k)}
          />
        ))}
      </ScrollView>
      <Section
        title="Lịch sử bản ghi"
        action={<T muted>{rows.length} bản ghi</T>}
      />
      <Feedback action={action} />
      <State query={me}>
        <State query={entries}>
          {!rows.length && (
            <Empty
              title="Chưa có bản ghi"
              description="Chọn khoảng ngày hoặc loại chỉ số khác, hoặc thêm ghi nhận đầu tiên của bạn."
              icon="book-outline"
            />
          )}
          {!!rows.length && (
            <View
              style={{
                backgroundColor: C.white,
                borderRadius: 22,
                paddingHorizontal: 16,
              }}
            >
              {rows.map((e, i) => (
                <View
                  key={e.id}
                  style={{
                    paddingVertical: 15,
                    gap: 10,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: "#E9EDE6",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 11,
                    }}
                  >
                    <Icon name={kindIcons[e.kind]} size={40} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: C.muted, fontSize: 13 }}>
                        {kinds[e.kind]?.label.replace(" (1–5)", "")}
                      </Text>
                      {e.kind !== "note" && (
                        <Text
                          style={{
                            color: C.text,
                            fontSize: 22,
                            fontWeight: "600",
                          }}
                        >
                          {metricValue(e.kind, e.value, e.secondary)}{" "}
                          <Text
                            style={{
                              fontSize: 12,
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
                      <Text style={{ color: C.muted, fontSize: 12 }}>
                        {DateTime.fromISO(e.measured_at)
                          .setZone(zone)
                          .toFormat("HH:mm · dd/MM/yyyy")}
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
                        {e.source === "manual" ? "Nhập thủ công" : e.source}
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
                          title={confirm === e.id ? "Xác nhận xóa" : "Xóa"}
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
              ))}
            </View>
          )}
        </State>
      </State>
    </Page>
  );
}
