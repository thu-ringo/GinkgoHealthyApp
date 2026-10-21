import React, { useState } from "react";
import { View, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { DateTime, IANAZone } from "luxon";
import * as Crypto from "expo-crypto";
import { api, changed } from "../src/api";
import { clearReminders } from "../src/notifications";
import { Profile, Schedule } from "../src/types";
import {
  Button,
  Card,
  C,
  Chip,
  Disclosure,
  Feedback,
  Field,
  Header,
  H,
  Page,
  Row,
  T,
  TextLink,
  useAction,
} from "../src/ui";
export default function ScheduleEditor() {
  const p = useLocalSearchParams<{ record?: string }>(),
    existing: Schedule | undefined = p.record
      ? JSON.parse(p.record)
      : undefined;
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Profile>("/me") });
  const [id] = useState(existing?.id || Crypto.randomUUID()),
    [medicine, setMedicine] = useState(existing?.medicine || ""),
    [dose, setDose] = useState(existing?.dose || ""),
    [times, setTimes] = useState(existing?.times || ["08:00"]),
    [weekdays, setWeekdays] = useState(
      existing?.weekdays || [1, 2, 3, 4, 5, 6, 7],
    ),
    [startDraft, setStart] = useState<string>(existing?.start_date || ""),
    [end, setEnd] = useState(existing?.end_date || ""),
    [zoneDraft, setZone] = useState(existing?.timezone || "");
  const timezone = zoneDraft || me.data?.timezone || "Asia/Ho_Chi_Minh",
    start = startDraft || DateTime.now().setZone(timezone).toISODate()!;
  const action = useAction();
  return (
    <Page>
      <Header
        back
        title={existing ? "Sửa lịch thuốc" : "Thêm lịch thuốc"}
        subtitle="Thiết lập một lần, nhắc bạn mỗi ngày."
      />
      <Card>
        <H>Thông tin thuốc</H>
        <Field
          label="Tên thuốc"
          placeholder="Nhập tên trên đơn hoặc bao bì"
          value={medicine}
          onChangeText={setMedicine}
          maxLength={100}
        />
        <Field
          label="Liều và hướng dẫn đã được kê"
          placeholder="Nhập đúng hướng dẫn của bạn"
          value={dose}
          onChangeText={setDose}
          maxLength={120}
        />
        <T muted>Ứng dụng không tự đề xuất liều hoặc cách uống thuốc.</T>
      </Card>
      <Card>
        <H>Giờ nhắc uống</H>
        {times.map((t, i) => (
          <View
            key={i}
            style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
          >
            <View style={{ flex: 1 }}>
              <Field
                label={`Lần ${i + 1} · HH:mm`}
                value={t}
                placeholder="08:00"
                maxLength={5}
                keyboardType="numbers-and-punctuation"
                onChangeText={(v) =>
                  setTimes((old) => old.map((x, n) => (n === i ? v : x)))
                }
              />
            </View>
            {times.length > 1 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xóa giờ nhắc lần ${i + 1}`}
                onPress={() => setTimes((old) => old.filter((_, n) => n !== i))}
                style={{
                  minWidth: 48,
                  minHeight: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 20,
                }}
              >
                <Ionicons
                  name="close-circle-outline"
                  color={C.error}
                  size={25}
                />
              </Pressable>
            )}
          </View>
        ))}
        {times.length < 8 && (
          <TextLink
            title="+ Thêm giờ uống"
            onPress={() => setTimes((old) => [...old, ""])}
          />
        )}
        <H>Lặp lại</H>
        <Row>
          <Chip
            title="Hằng ngày"
            selected={weekdays.length === 7}
            onPress={() => setWeekdays([1, 2, 3, 4, 5, 6, 7])}
          />
          <Chip
            title="Thứ 2 – Thứ 6"
            selected={weekdays.length === 5 && weekdays.every((n) => n <= 5)}
            onPress={() => setWeekdays([1, 2, 3, 4, 5])}
          />
        </Row>
        <Row>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Chip
              key={n}
              title={n === 7 ? "CN" : `T${n + 1}`}
              selected={weekdays.includes(n)}
              onPress={() =>
                setWeekdays(
                  weekdays.includes(n)
                    ? weekdays.filter((x) => x !== n)
                    : [...weekdays, n].sort(),
                )
              }
            />
          ))}
        </Row>
      </Card>
      <Disclosure
        title="Thời gian áp dụng"
        subtitle={`Bắt đầu ${DateTime.fromISO(start).toFormat("dd/MM/yyyy")}${end ? " · Có ngày kết thúc" : " · Chưa đặt kết thúc"}`}
        icon="calendar-outline"
      >
        <Field
          label="Ngày bắt đầu (YYYY-MM-DD)"
          value={start}
          onChangeText={setStart}
          maxLength={10}
        />
        <Field
          label="Ngày kết thúc (không bắt buộc)"
          placeholder="YYYY-MM-DD"
          value={end}
          onChangeText={setEnd}
          maxLength={10}
        />
        <Field
          label="Múi giờ của lịch"
          value={timezone}
          onChangeText={setZone}
          autoCapitalize="none"
        />
        <T muted>
          Giờ uống lặp theo múi giờ này. Khi đổi múi giờ, kiểm tra lại các giờ
          đã chọn.
        </T>
      </Disclosure>
      <Feedback action={action} />
      <Button
        icon="checkmark"
        title={action.busy ? "Đang lưu…" : "Lưu lịch nhắc"}
        disabled={action.busy}
        onPress={() =>
          action.run(async () => {
            if (!medicine.trim() || !dose.trim())
              throw new Error("Nhập tên thuốc và hướng dẫn đã được kê");
            if (
              !times.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) ||
              new Set(times).size !== times.length
            )
              throw new Error(
                "Giờ uống cần đúng dạng HH:mm và không trùng nhau",
              );
            if (!weekdays.length) throw new Error("Chọn ít nhất một ngày lặp");
            if (
              !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
              !DateTime.fromISO(start).isValid ||
              (end &&
                (!/^\d{4}-\d{2}-\d{2}$/.test(end) ||
                  !DateTime.fromISO(end).isValid ||
                  end < start))
            )
              throw new Error(
                "Kiểm tra ngày bắt đầu và kết thúc, định dạng YYYY-MM-DD",
              );
            if (!IANAZone.isValidZone(timezone))
              throw new Error("Múi giờ không hợp lệ");
            await api(`/schedules/${id}`, {
              method: "PUT",
              body: {
                id,
                medicine: medicine.trim(),
                dose: dose.trim(),
                times,
                weekdays,
                start_date: start,
                end_date: end || null,
                timezone,
              },
            });
            await clearReminders();
            await changed();
            router.back();
          })
        }
      />
      <T muted>
        Sửa lịch sẽ cập nhật các lần nhắc chưa xác nhận. Lịch sử uống thuốc đã
        ghi vẫn được giữ.
      </T>
    </Page>
  );
}
