import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { DateTime, IANAZone } from "luxon";
import * as Crypto from "expo-crypto";
import { api, changed } from "../src/api";
import { clearReminders } from "../src/notifications";
import { DatePickerSelection, DatePickerSheet } from "../src/date-picker";
import { TimePickerSheet } from "../src/time-picker";
import { partOfDay, scheduleTone } from "../src/palette";
import { Profile, Schedule } from "../src/types";
import {
  Button,
  Card,
  C,
  Disclosure,
  Feedback,
  Field,
  Header,
  H,
  Page,
  useAction,
} from "../src/ui";

const dateLabel = (value: string) =>
  DateTime.fromISO(value, { zone: "utc" }).toFormat("dd/MM/yyyy");

export default function ScheduleEditor() {
  const params = useLocalSearchParams<{ record?: string }>();
  const existing: Schedule | undefined = params.record
    ? JSON.parse(params.record)
    : undefined;
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Profile>("/me") });
  const [id] = useState(existing?.id || Crypto.randomUUID());
  const [medicine, setMedicine] = useState(existing?.medicine || "");
  const [dose, setDose] = useState(existing?.dose || "");
  const [times, setTimes] = useState(existing?.times || ["08:00"]);
  const [weekdays, setWeekdays] = useState(
    existing?.weekdays || [1, 2, 3, 4, 5, 6, 7],
  );
  const [start, setStart] = useState(existing?.start_date || "");
  const [end, setEnd] = useState(existing?.end_date || "");
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<"start" | "end" | null>(null);
  const timezone = existing?.timezone || me.data?.timezone || "Asia/Ho_Chi_Minh";
  const today = DateTime.now().setZone(timezone).toISODate()!;
  const effectiveStart = start || today;
  const action = useAction();

  const changeWeekdays = (day: number) => {
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const applyDate = (selected: DatePickerSelection) => {
    if (typeof selected !== "string") return;
    if (datePickerTarget === "start") setStart(selected);
    if (datePickerTarget === "end") setEnd(selected);
    setDatePickerTarget(null);
  };

  return (
    <Page>
      <Header
        back
        size="large"
        title={existing ? "Sửa lịch thuốc" : "Thêm lịch thuốc"}
        subtitle="Thiết lập lịch nhắc theo hướng dẫn của bạn."
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
        <Text style={{ color: "#3F4A47", fontSize: 14, lineHeight: 21 }}>
          Ứng dụng không tự đề xuất liều hoặc cách uống thuốc.
        </Text>
      </Card>

      <Card>
        <H>Giờ nhắc uống</H>
        {times.map((time, index) => {
          const timeInfo = partOfDay(time || "08:00");
          return (
            <View key={`time-${index}`} style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: "700", marginBottom: 6 }}>
                    Lần {index + 1}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn giờ uống lần ${index + 1}, hiện tại ${time || "chưa chọn"}`}
                    onPress={() => setTimePickerIndex(index)}
                    style={{
                      minHeight: 56,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 16,
                      borderWidth: 1,
                      borderColor: scheduleTone.border,
                      borderRadius: 16,
                      backgroundColor: scheduleTone.soft,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name={timeInfo.icon} size={22} color={timeInfo.fg} />
                      <Text style={{ color: C.text, fontSize: 24, fontWeight: "700" }}>
                        {time || "Chọn giờ"}
                      </Text>
                      {!!time && (
                        <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>
                          {timeInfo.label}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="time-outline" size={22} color={scheduleTone.deep} />
                  </Pressable>
                </View>
                {times.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Xóa giờ nhắc lần ${index + 1}`}
                    onPress={() => setTimes((current) => current.filter((_, item) => item !== index))}
                    style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 23 }}
                  >
                    <Ionicons name="close-circle" color={C.error} size={26} />
                  </Pressable>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {["07:00", "08:00", "12:00", "18:00", "21:00"].map((quickTime) => (
                  <Pressable
                    key={quickTime}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn ${quickTime} cho lần ${index + 1}`}
                    accessibilityState={{ selected: time === quickTime }}
                    onPress={() =>
                      setTimes((current) =>
                        current.map((item, itemIndex) => itemIndex === index ? quickTime : item),
                      )
                    }
                    style={{
                      flex: 1,
                      minHeight: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      backgroundColor: time === quickTime ? scheduleTone.deep : "#FFFFFF",
                      borderWidth: time === quickTime ? 0 : 1,
                      borderColor: scheduleTone.border,
                    }}
                  >
                    <Text style={{ color: time === quickTime ? "#FFFFFF" : C.text, fontSize: 13, fontWeight: "700" }}>
                      {quickTime}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
        {times.length < 8 && (
          <Button
            secondary
            accent={scheduleTone.deep}
            soft={scheduleTone.soft}
            icon="add-circle-outline"
            title="Thêm giờ uống"
            onPress={() => setTimes((current) => [...current, "08:00"])}
          />
        )}
        <View style={{ gap: 10 }}>
          <H>Lặp lại</H>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { label: "Hằng ngày", values: [1, 2, 3, 4, 5, 6, 7] },
              { label: "Thứ 2 – Thứ 6", values: [1, 2, 3, 4, 5] },
            ].map((preset) => {
              const selected = preset.values.length === weekdays.length &&
                preset.values.every((day) => weekdays.includes(day));
              return (
                <Pressable
                  key={preset.label}
                  accessibilityRole="button"
                  accessibilityLabel={preset.label}
                  accessibilityState={{ selected }}
                  onPress={() => setWeekdays(preset.values)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    backgroundColor: selected ? scheduleTone.deep : scheduleTone.soft,
                  }}
                >
                  <Text style={{ color: selected ? "#FFFFFF" : C.text, fontSize: 14, fontWeight: "700" }}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const selected = weekdays.includes(day);
              const label = day === 7 ? "CN" : `T${day + 1}`;
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={`Lặp vào ${day === 7 ? "Chủ nhật" : `thứ ${day + 1}`}`}
                  accessibilityState={{ selected }}
                  onPress={() => changeWeekdays(day)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    backgroundColor: selected ? scheduleTone.deep : "#FFFFFF",
                    borderWidth: selected ? 0 : 1,
                    borderColor: scheduleTone.border,
                  }}
                >
                  <Text style={{ color: selected ? "#FFFFFF" : C.text, fontSize: 13, fontWeight: "700" }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Disclosure
        title="Nâng cao · Thời gian áp dụng"
        subtitle={`Bắt đầu ${dateLabel(effectiveStart)}${end ? ` · Kết thúc ${dateLabel(end)}` : " · Không kết thúc"}`}
        icon="calendar-outline"
      >
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>Ngày bắt đầu</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Chọn ngày bắt đầu, hiện tại ${dateLabel(effectiveStart)}`}
            onPress={() => setDatePickerTarget("start")}
            style={{
              minHeight: 54,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: scheduleTone.border,
              borderRadius: 14,
              backgroundColor: "#FFFFFF",
            }}
          >
            <Ionicons name="calendar" size={22} color={scheduleTone.deep} />
            <Text style={{ color: C.text, fontSize: 16, fontWeight: "600" }}>{dateLabel(effectiveStart)}</Text>
          </Pressable>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>Ngày kết thúc (không bắt buộc)</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={end ? `Chọn ngày kết thúc, hiện tại ${dateLabel(end)}` : "Chọn ngày kết thúc"}
              onPress={() => setDatePickerTarget("end")}
              style={{
                flex: 1,
                minHeight: 54,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: scheduleTone.border,
                borderRadius: 14,
                backgroundColor: "#FFFFFF",
              }}
            >
              <Ionicons name="calendar-outline" size={22} color={scheduleTone.deep} />
              <Text style={{ color: C.text, fontSize: 16, fontWeight: "600" }}>
                {end ? dateLabel(end) : "Không đặt ngày kết thúc"}
              </Text>
            </Pressable>
            {!!end && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xóa ngày kết thúc"
                onPress={() => setEnd("")}
                style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close-circle-outline" color={C.error} size={24} />
              </Pressable>
            )}
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>Múi giờ</Text>
          <Text style={{ color: "#3F4A47", fontSize: 15 }}>{timezone}</Text>
          <Text style={{ color: "#3F4A47", fontSize: 13, lineHeight: 19 }}>
            Giờ uống lặp theo múi giờ này.
          </Text>
        </View>
      </Disclosure>

      <Feedback action={action} />
      <Button
        icon="checkmark"
        title={action.busy ? "Đang lưu…" : "Lưu lịch nhắc"}
        disabled={action.busy}
        accent={scheduleTone.deep}
        onPress={() =>
          action.run(async () => {
            if (!medicine.trim() || !dose.trim())
              throw new Error("Nhập tên thuốc và hướng dẫn đã được kê");
            if (
              !times.every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) ||
              new Set(times).size !== times.length
            )
              throw new Error("Giờ uống cần đúng dạng HH:mm và không trùng nhau");
            if (!weekdays.length) throw new Error("Chọn ít nhất một ngày lặp");
            if (
              !/^\d{4}-\d{2}-\d{2}$/.test(effectiveStart) ||
              !DateTime.fromISO(effectiveStart).isValid ||
              (end &&
                (!/^\d{4}-\d{2}-\d{2}$/.test(end) ||
                  !DateTime.fromISO(end).isValid ||
                  end < effectiveStart))
            )
              throw new Error("Kiểm tra ngày bắt đầu và kết thúc");
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
                start_date: effectiveStart,
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
      <Text style={{ color: "#3F4A47", fontSize: 14, lineHeight: 21 }}>
        Sửa lịch sẽ cập nhật các lần nhắc chưa xác nhận. Lịch sử uống thuốc đã
        ghi vẫn được giữ.
      </Text>

      {timePickerIndex !== null && (
        <TimePickerSheet
          key={timePickerIndex}
          visible
          value={times[timePickerIndex] || "08:00"}
          title="Chọn giờ nhắc uống"
          tone={scheduleTone}
          onCancel={() => setTimePickerIndex(null)}
          onConfirm={(selectedTime) => {
            setTimes((current) =>
              current.map((item, index) => index === timePickerIndex ? selectedTime : item),
            );
            setTimePickerIndex(null);
          }}
        />
      )}
      {datePickerTarget !== null && (
        <DatePickerSheet
          key={datePickerTarget}
          visible
          mode="single"
          value={datePickerTarget === "end" ? end || effectiveStart : effectiveStart}
          today={today}
          minDate={datePickerTarget === "end" ? effectiveStart : undefined}
          maxDate={datePickerTarget === "start" ? end || undefined : undefined}
          tone={scheduleTone}
          title={datePickerTarget === "end" ? "Chọn ngày kết thúc" : "Chọn ngày bắt đầu"}
          onCancel={() => setDatePickerTarget(null)}
          onConfirm={applyDate}
        />
      )}
    </Page>
  );
}
