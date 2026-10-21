import React, { useState } from "react";
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, changed, useAuth } from "../src/api";
import { Profile } from "../src/types";
import {
  Button,
  Card,
  Disclosure,
  Header,
  Feedback,
  Field,
  H,
  Notice,
  Page,
  State,
  T,
  useAction,
} from "../src/ui";
export default function ProfileScreen() {
  const q = useQuery({
      queryKey: ["me"],
      queryFn: ({ signal }) => api<Profile>("/me", { signal }),
    }),
    sessions = useQuery({
      queryKey: ["sessions"],
      queryFn: ({ signal }) => api<any[]>("/auth/sessions", { signal }),
    });
  const [draft, setDraft] = useState<
    Partial<Record<"name" | "zone" | "water" | "sleep", string>>
  >({});
  const name = draft.name ?? q.data?.name ?? "",
    zone = draft.zone ?? q.data?.timezone ?? "",
    water = draft.water ?? String(q.data?.water_goal ?? ""),
    sleep =
      draft.sleep ??
      (q.data?.sleep_goal != null ? String(q.data.sleep_goal / 60) : "");
  const setName = (value: string) => setDraft((d) => ({ ...d, name: value })),
    setZone = (value: string) => setDraft((d) => ({ ...d, zone: value })),
    setWater = (value: string) => setDraft((d) => ({ ...d, water: value })),
    setSleep = (value: string) => setDraft((d) => ({ ...d, sleep: value }));
  const [old, setOld] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(false);
  const action = useAction(),
    auth = useAuth();
  return (
    <Page>
      <Header
        back
        title="Hồ sơ của bạn"
        subtitle="Mục tiêu, quyền riêng tư và tài khoản."
      />
      <State query={q}>
        <T muted>{q.data?.phone}</T>
        <Card>
          <H>Hồ sơ & mục tiêu</H>
          <Field label="Tên bạn" value={name} onChangeText={setName} />
          <Field
            label="Múi giờ thống kê"
            value={zone}
            onChangeText={setZone}
            autoCapitalize="none"
          />
          <Field
            label="Mục tiêu nước (ml/ngày)"
            value={water}
            onChangeText={setWater}
            keyboardType="number-pad"
          />
          <Field
            label="Mục tiêu ngủ (giờ/ngày)"
            value={sleep}
            onChangeText={setSleep}
            keyboardType="decimal-pad"
          />
          <Button
            disabled={action.busy}
            title="Lưu hồ sơ"
            onPress={() =>
              action.run(async () => {
                await api("/me", {
                  method: "PUT",
                  body: {
                    name,
                    timezone: zone,
                    water_goal: Number(water),
                    sleep_goal: Math.round(
                      Number(sleep.replace(",", ".")) * 60,
                    ),
                  },
                });
                await changed();
              })
            }
          />
        </Card>
      </State>
      <Feedback action={action} />
      <Disclosure
        title="Quyền riêng tư & dữ liệu"
        subtitle="Xem cách bảo vệ và xuất dữ liệu"
        icon="shield-checkmark-outline"
      >
        <T muted>
          Nhật ký được đồng bộ với máy chủ. Khi đăng xuất, dữ liệu tạm trên app
          được xóa. Bản xuất chứa thông tin cá nhân; hãy chọn nơi lưu an toàn.
        </T>
        <Button
          secondary
          title="Xuất dữ liệu JSON"
          disabled={action.busy}
          onPress={() =>
            action.run(async () => {
              const data = await api("/me/export"),
                text = JSON.stringify(data, null, 2);
              if (Platform.OS === "web") {
                const blob = new Blob([text], { type: "application/json" }),
                  url = URL.createObjectURL(blob),
                  a = document.createElement("a");
                a.href = url;
                a.download = "ginkgo-export.json";
                a.click();
                URL.revokeObjectURL(url);
              } else {
                if (!(await Sharing.isAvailableAsync()))
                  throw new Error("Thiết bị không hỗ trợ chia sẻ tệp");
                const file = new FileSystem.File(
                  FileSystem.Paths.cache,
                  "ginkgo-export.json",
                );
                try {
                  file.write(text);
                  await Sharing.shareAsync(file.uri, {
                    mimeType: "application/json",
                  });
                } finally {
                  if (file.exists) file.delete();
                }
              }
            }, "Đã tạo bản xuất dữ liệu")
          }
        />
      </Disclosure>
      <Disclosure
        title="Thiết bị đăng nhập"
        subtitle="Xem và thu hồi các phiên của bạn"
        icon="phone-portrait-outline"
      >
        <State query={sessions}>
          {sessions.data?.map((s) => (
            <Card key={s.id}>
              <H>
                {s.device}
                {s.current ? " · Thiết bị này" : ""}
              </H>
              <T muted>
                Bắt đầu {new Date(s.created_at).toLocaleString("vi-VN")}
              </T>
              <Button
                secondary
                title="Thu hồi phiên"
                disabled={action.busy}
                onPress={() =>
                  action.run(async () => {
                    await api(`/auth/sessions/${s.id}`, { method: "DELETE" });
                    if (s.current) await auth.forget();
                    else await changed();
                  }, "Đã thu hồi phiên")
                }
              />
            </Card>
          ))}
        </State>
        <Button
          secondary
          title="Đăng xuất mọi thiết bị"
          disabled={action.busy}
          onPress={() =>
            action.run(async () => {
              await api("/auth/logout-all", { method: "POST" });
              await auth.forget();
            }, "")
          }
        />
      </Disclosure>
      <Disclosure
        title="Mật khẩu & tài khoản"
        subtitle="Đổi mật khẩu hoặc xóa tài khoản"
        icon="lock-closed-outline"
      >
        <Field
          label="Mật khẩu hiện tại (để đổi hoặc xóa tài khoản)"
          value={old}
          onChangeText={setOld}
          secureTextEntry
        />
        <Field
          label="Mật khẩu mới (ít nhất 10 ký tự)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button
          secondary
          title="Đổi mật khẩu và đăng xuất"
          disabled={action.busy}
          onPress={() =>
            action.run(async () => {
              await api("/auth/password/change", {
                method: "POST",
                body: { oldPassword: old, password },
              });
              await auth.forget();
            }, "")
          }
        />
        <T muted>
          Xóa tài khoản sẽ xóa hồ sơ, nhật ký, lịch thuốc, lịch sử AI và tất cả
          phiên. Không thể khôi phục từ ứng dụng.
        </T>
        {confirm && (
          <Notice
            error
            message="Bạn sắp xóa vĩnh viễn tài khoản và dữ liệu. Nhập mật khẩu hiện tại rồi xác nhận."
          />
        )}
        <Button
          secondary
          danger
          title={confirm ? "Xác nhận xóa vĩnh viễn" : "Xóa tài khoản"}
          disabled={action.busy}
          onPress={() => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            void action.run(async () => {
              await api("/me", { method: "DELETE", body: { password: old } });
              await auth.forget();
            }, "");
          }}
        />
      </Disclosure>
      <Button
        title="Đăng xuất"
        disabled={action.busy}
        onPress={() => action.run(auth.logout, "")}
      />
    </Page>
  );
}
