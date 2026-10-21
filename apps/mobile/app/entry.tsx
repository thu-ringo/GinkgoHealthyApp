import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { DateTime } from "luxon";
import * as Crypto from "expo-crypto";
import { useQuery } from "@tanstack/react-query";
import { api, changed } from "../src/api";
import { Entry, kinds, Profile } from "../src/types";
import {
  Button,
  Card,
  Chip,
  Disclosure,
  Feedback,
  Field,
  Header,
  H,
  Icon,
  kindIcons,
  Page,
  Row,
  T,
  useAction,
} from "../src/ui";
export default function EntryEditor() {
  const p = useLocalSearchParams<{ kind?: string; record?: string }>();
  const existing: Entry | undefined = p.record
    ? JSON.parse(p.record)
    : undefined;
  const [id] = useState(existing?.id || Crypto.randomUUID()),
    [createdAt] = useState(() => new Date().toISOString());
  const [kind, setKind] = useState(
    existing?.kind || (p.kind && kinds[p.kind] ? p.kind : "weight"),
  );
  const [value, setValue] = useState(
      existing?.value != null
        ? String(
            existing.kind === "sleep" ? existing.value / 60 : existing.value,
          )
        : "",
    ),
    [secondary, setSecondary] = useState(existing?.secondary?.toString() || ""),
    [note, setNote] = useState(existing?.note || "");
  const profile = useQuery({
      queryKey: ["me"],
      queryFn: () => api<Profile>("/me"),
    }),
    zone = profile.data?.timezone || "Asia/Ho_Chi_Minh";
  const [dateDraft, setDate] = useState<string>(),
    [timeDraft, setTime] = useState<string>();
  const measured = DateTime.fromISO(existing?.measured_at || createdAt).setZone(
      zone,
    ),
    date = dateDraft ?? measured.toISODate()!,
    time = timeDraft ?? measured.toFormat("HH:mm");
  const action = useAction();
  const labels: Record<string, string> = {
    weight: "Cân nặng (kg)",
    water: "Lượng nước (ml)",
    sleep: "Thời lượng ngủ (giờ)",
    heart_rate: "Nhịp tim (nhịp/phút)",
    blood_pressure: "Huyết áp tâm thu (mmHg)",
    mood: "Tâm trạng (1–5)",
  };
  return (
    <Page>
      <Header
        back
        title={existing ? "Sửa bản ghi" : "Ghi lại hôm nay"}
        subtitle="Chọn điều bạn muốn theo dõi."
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {Object.entries(kinds).map(([key, v]) => (
          <Chip
            key={key}
            title={v.label.replace(" (1–5)", "")}
            icon={kindIcons[key]}
            selected={kind === key}
            onPress={() => {
              setKind(key);
              setValue("");
              setSecondary("");
              action.clear();
            }}
          />
        ))}
      </ScrollView>
      <Card>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Icon name={kindIcons[kind]} size={48} />
          <H>{kinds[kind]?.label}</H>
        </View>
        {kind !== "note" && kind !== "mood" && (
          <Field
            label={labels[kind]}
            placeholder={kind === "sleep" ? "Ví dụ: 7,5" : "Nhập giá trị"}
            value={value}
            keyboardType="decimal-pad"
            onChangeText={setValue}
          />
        )}
        {kind === "water" && (
          <Row>
            {[150, 250, 500].map((n) => (
              <Chip
                key={n}
                title={`${n} ml`}
                selected={value === String(n)}
                onPress={() => setValue(String(n))}
              />
            ))}
          </Row>
        )}
        {kind === "mood" && (
          <>
            <T>Hôm nay bạn cảm thấy thế nào?</T>
            <Row>
              {["Rất buồn", "Buồn", "Bình thường", "Vui", "Rất vui"].map(
                (label, i) => (
                  <Chip
                    key={label}
                    title={`${i + 1} · ${label}`}
                    selected={value === String(i + 1)}
                    onPress={() => setValue(String(i + 1))}
                  />
                ),
              )}
            </Row>
          </>
        )}
        {kind === "blood_pressure" && (
          <Field
            label="Huyết áp tâm trương (mmHg)"
            value={secondary}
            keyboardType="decimal-pad"
            onChangeText={setSecondary}
          />
        )}
        <Field
          label={
            kind === "note"
              ? "Điều bạn muốn ghi lại"
              : "Ghi chú (không bắt buộc)"
          }
          placeholder="Một vài điều về hôm nay…"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={2000}
        />
      </Card>
      <Disclosure
        title="Thời điểm ghi nhận"
        subtitle={`${time} · ${DateTime.fromISO(date).toFormat("dd/MM/yyyy")}`}
        icon="time-outline"
      >
        <Field
          label="Ngày ghi nhận"
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
          maxLength={10}
        />
        <Field
          label="Giờ ghi nhận"
          placeholder="HH:mm"
          value={time}
          onChangeText={setTime}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />
        <T muted>Thời gian theo {zone}. Nguồn dữ liệu: nhập thủ công.</T>
      </Disclosure>
      <Feedback action={action} />
      <Button
        icon="checkmark"
        disabled={action.busy}
        title={action.busy ? "Đang lưu…" : "Lưu bản ghi"}
        onPress={() =>
          action.run(async () => {
            const d = DateTime.fromISO(`${date}T${time}`, { zone });
            if (
              !d.isValid ||
              !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
              !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
            )
              throw new Error("Nhập ngày YYYY-MM-DD và giờ HH:mm hợp lệ");
            const numeric = Number(value.replace(",", "."));
            if (kind !== "note" && (!value.trim() || !Number.isFinite(numeric)))
              throw new Error("Nhập giá trị hợp lệ");
            if (
              kind === "blood_pressure" &&
              (!secondary.trim() || !Number.isFinite(Number(secondary)))
            )
              throw new Error("Nhập huyết áp tâm trương hợp lệ");
            await api(`/entries/${id}`, {
              method: "PUT",
              body: {
                id,
                kind,
                value:
                  kind === "note"
                    ? null
                    : kind === "sleep"
                      ? Math.round(numeric * 60)
                      : numeric,
                secondary: kind === "blood_pressure" ? Number(secondary) : null,
                unit: kinds[kind].unit,
                measured_at: d.toUTC().toISO(),
                source: "manual",
                note,
              },
            });
            await changed();
            router.back();
          })
        }
      />
      <Text
        style={{
          fontSize: 13,
          lineHeight: 20,
          color: "#687570",
          textAlign: "center",
        }}
      >
        Ghi số đo từ thiết bị hoặc thông tin bạn tự theo dõi.
      </Text>
    </Page>
  );
}
