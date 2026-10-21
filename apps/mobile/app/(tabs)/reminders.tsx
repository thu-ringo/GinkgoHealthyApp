import React, { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { DateTime } from "luxon";
import { useQuery } from "@tanstack/react-query";
import { api, changed } from "../../src/api";
import { clearReminders, syncReminders } from "../../src/notifications";
import { Occurrence, Profile, Schedule } from "../../src/types";
import {
  Button,
  Card,
  Chip,
  C,
  Disclosure,
  Empty,
  Feedback,
  Header,
  H,
  Icon,
  Notice,
  Page,
  Row,
  State,
  T,
  useAction,
} from "../../src/ui";
import { DateRange } from "../../src/date-range";
export default function Reminders() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Profile>("/me") });
  const zone = me.data?.timezone || "Asia/Ho_Chi_Minh",
    today = DateTime.now().setZone(zone).toISODate()!;
  const [from, setFrom] = useState(today),
    [to, setTo] = useState(today),
    [confirm, setConfirm] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("doses");
  const schedules = useQuery({
    queryKey: ["schedules"],
    queryFn: ({ signal }) => api<Schedule[]>("/schedules", { signal }),
  });
  const occurrences = useQuery({
    queryKey: ["occurrences", from, to, zone],
    queryFn: ({ signal }) =>
      api<Occurrence[]>(`/occurrences?from=${from}&to=${to}`, { signal }),
    refetchInterval: 30000,
  });
  const action = useAction();
  return (
    <Page>
      <Header
        title="Lịch nhắc"
        subtitle="Nhớ đúng giờ, theo hướng dẫn của bạn."
      />
      <Button
        title="Thêm lịch thuốc"
        icon="add"
        onPress={() => router.push("/schedule")}
      />
      <Row>
        <Chip
          title="Lần uống"
          icon="time-outline"
          selected={tab === "doses"}
          onPress={() => setTab("doses")}
        />
        <Chip
          title="Lịch thuốc"
          icon="calendar-outline"
          selected={tab === "schedules"}
          onPress={() => setTab("schedules")}
        />
      </Row>
      <Feedback action={action} />
      {tab === "doses" ? (
        <>
          <DateRange
            from={from}
            to={to}
            onChange={(a, b) => {
              setFrom(a);
              setTo(b);
            }}
            presets={[
              { label: "Hôm nay", from: today, to: today },
              {
                label: "30 ngày",
                from: DateTime.fromISO(today).minus({ days: 29 }).toISODate()!,
                to: today,
              },
            ]}
          />
          <State query={occurrences}>
            {!occurrences.data?.length && (
              <Empty
                title="Chưa có lần uống trong ngày"
                description="Tạo lịch thuốc hoặc chọn khoảng ngày khác để xem các lần uống."
                icon="alarm-outline"
                action={
                  <Button
                    secondary
                    title="Tạo lịch đầu tiên"
                    onPress={() => router.push("/schedule")}
                  />
                }
              />
            )}
            {occurrences.data?.map((o) => (
              <View key={o.id} style={{ flexDirection: "row", gap: 12 }}>
                <View
                  style={{
                    width: 58,
                    paddingTop: 18,
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 19,
                      fontWeight: "700",
                      color: C.primary,
                    }}
                  >
                    {DateTime.fromISO(o.due_at).setZone(zone).toFormat("HH:mm")}
                  </Text>
                  <T muted>
                    {DateTime.fromISO(o.due_at).setZone(zone).toFormat("dd/MM")}
                  </T>
                  <View
                    style={{
                      width: 1,
                      backgroundColor: C.border,
                      flex: 1,
                      minHeight: 20,
                      marginTop: 8,
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Card>
                    <View style={{ gap: 4 }}>
                      <H>{o.medicine}</H>
                      <T muted>{o.dose}</T>
                    </View>
                    {o.cancelled || o.status ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <Icon
                          name={
                            o.status === "taken"
                              ? "checkmark"
                              : "remove-outline"
                          }
                          size={28}
                          tone={o.status === "taken" ? C.soft : C.bg}
                        />
                        <Text
                          style={{
                            color: o.status === "taken" ? C.primary : C.muted,
                            fontSize: 14,
                            fontWeight: "600",
                          }}
                        >
                          {o.cancelled
                            ? "Đã hủy lịch"
                            : o.status === "taken"
                              ? "Đã uống"
                              : "Đã bỏ qua"}
                        </Text>
                      </View>
                    ) : +new Date(o.due_at) >
                      occurrences.dataUpdatedAt + 60000 ? (
                      <T muted>Chưa đến giờ xác nhận</T>
                    ) : (
                      <View style={{ gap: 8 }}>
                        {(["taken", "skipped"] as const).map((status) => (
                          <Button
                            key={status}
                            secondary={status === "skipped"}
                            icon={status === "taken" ? "checkmark" : undefined}
                            title={
                              status === "taken" ? "Đã uống" : "Bỏ qua lần này"
                            }
                            disabled={action.busy}
                            onPress={() =>
                              action.run(
                                async () => {
                                  await api(`/occurrences/${o.id}/log`, {
                                    method: "POST",
                                    body: { status },
                                  });
                                  await changed();
                                },
                                status === "taken"
                                  ? "Đã ghi nhận uống thuốc"
                                  : "Đã ghi nhận bỏ qua",
                              )
                            }
                          />
                        ))}
                      </View>
                    )}
                  </Card>
                </View>
              </View>
            ))}
          </State>
        </>
      ) : (
        <State query={schedules}>
          {!schedules.data?.length && (
            <Empty
              title="Chưa có lịch thuốc"
              description="Thêm tên thuốc, hướng dẫn đã được kê và giờ uống. Ginkgo sẽ giúp bạn nhớ lịch."
              icon="calendar-outline"
            />
          )}
          {schedules.data?.map((s) => (
            <Card key={s.id}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Icon name="medical-outline" tone={C.peach} color="#976744" />
                <View style={{ flex: 1 }}>
                  <H>{s.medicine}</H>
                  <T muted>{s.active ? "Đang theo dõi" : "Đã hủy"}</T>
                </View>
              </View>
              <T>{s.dose}</T>
              <Row>
                {s.times.map((time) => (
                  <View
                    key={time}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: C.bg,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: C.primary, fontWeight: "600" }}>
                      {time}
                    </Text>
                  </View>
                ))}
              </Row>
              <T muted>
                {s.weekdays.length === 7
                  ? "Hằng ngày"
                  : s.weekdays
                      .map((n) => (n === 7 ? "CN" : `T${n + 1}`))
                      .join(" · ")}
                {"\n"}Từ {DateTime.fromISO(s.start_date).toFormat("dd/MM/yyyy")}
                {s.end_date
                  ? ` đến ${DateTime.fromISO(s.end_date).toFormat("dd/MM/yyyy")}`
                  : ""}{" "}
                · {s.timezone}
              </T>
              {s.active && (
                <Row>
                  <Button
                    secondary
                    title="Sửa lịch"
                    icon="create-outline"
                    onPress={() =>
                      router.push({
                        pathname: "/schedule",
                        params: { record: JSON.stringify(s) },
                      })
                    }
                  />
                  <Button
                    secondary
                    danger
                    title={confirm === s.id ? "Xác nhận hủy" : "Hủy lịch"}
                    disabled={action.busy}
                    onPress={() => {
                      if (confirm !== s.id) {
                        setConfirm(s.id);
                        return;
                      }
                      void action.run(async () => {
                        await api(`/schedules/${s.id}`, { method: "DELETE" });
                        await clearReminders();
                        await changed();
                        setConfirm("");
                      }, "Đã hủy lịch và cập nhật nhắc trên thiết bị");
                    }}
                  />
                </Row>
              )}
            </Card>
          ))}
        </State>
      )}
      <Disclosure
        title="Thông báo trên thiết bị"
        subtitle="Cấp quyền và cập nhật nhắc thuốc"
        icon="notifications-outline"
      >
        <T muted>
          Nhắc cục bộ trong 14 ngày tới, tối đa 60 lần. Mở app thường xuyên và
          kết nối lại sau khi sửa lịch từ thiết bị khác.
        </T>
        <Button
          secondary
          title="Bật / cập nhật thông báo"
          disabled={action.busy}
          onPress={() =>
            action.run(async () => {
              const all = await api<Occurrence[]>("/occurrences");
              setNotice(await syncReminders(all, true));
            }, "")
          }
        />
        {!!notice && <Notice message={notice} />}
      </Disclosure>
      <T muted>
        Chỉ xác nhận khi đã uống. Không tự đổi liều hoặc uống bù dựa trên ứng
        dụng.
      </T>
    </Page>
  );
}
