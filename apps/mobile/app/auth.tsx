import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, useAuth } from "../src/api";
import {
  Art,
  Button,
  Card,
  Chip,
  Feedback,
  Field,
  H,
  BrandMark,
  Notice,
  Page,
  Row,
  styles,
  T,
  TextLink,
  Title,
  useAction,
  C,
} from "../src/ui";

const normalizePhone = (value: string) =>
  value.replace(/[\s.-]/g, "").replace(/^0/, "+84");
const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(
    z
      .string()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        "Nhập số điện thoại hợp lệ, ví dụ 0901234567",
      ),
  );
const passwordSchema = z
  .string()
  .min(10, "Mật khẩu cần ít nhất 10 ký tự")
  .max(128);
type Form = { phone: string; password: string; code: string };
type Mode = "login" | "register" | "verify" | "reset";
export default function Auth() {
  const [mode, setMode] = useState<Mode>("login"),
    [otpMessage, setOtpMessage] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  const schema = z.object({
    phone: phoneSchema,
    password: mode === "verify" ? z.string() : passwordSchema,
    code:
      mode === "verify" || mode === "reset"
        ? z.string().regex(/^\d{6}$/, "Nhập đủ 6 số của mã xác minh")
        : z.string(),
  });
  const { control, handleSubmit, getValues, trigger, clearErrors } =
    useForm<Form>({
      resolver: zodResolver(schema),
      defaultValues: { phone: "", password: "", code: "" },
    });
  const action = useAction(),
    auth = useAuth();
  const switchMode = (next: Mode) => {
    setMode(next);
    setOtpMessage("");
    action.clear();
    clearErrors();
  };
  const submit = handleSubmit((b) =>
    action.run(
      async () => {
        if (mode === "login")
          await auth.login(
            await api("/auth/login", {
              method: "POST",
              body: {
                phone: b.phone,
                password: b.password,
                device: "Ginkgo mobile",
              },
              public: true,
            }),
          );
        else if (mode === "register") {
          await api("/auth/register", {
            method: "POST",
            body: { phone: b.phone, password: b.password },
            public: true,
          });
          switchMode("verify");
        } else if (mode === "verify") {
          await api("/auth/otp/verify", {
            method: "POST",
            body: { phone: b.phone, code: b.code, purpose: "verify" },
            public: true,
          });
          switchMode("login");
        } else {
          await api("/auth/password/reset", {
            method: "POST",
            body: { ...b, purpose: "reset" },
            public: true,
          });
          switchMode("login");
        }
      },
      mode === "register"
        ? "Tài khoản đã được tạo. Hãy yêu cầu mã để xác minh số điện thoại."
        : mode === "login"
          ? ""
          : "Đã cập nhật. Bạn có thể đăng nhập.",
    ),
  );
  return (
    <Page>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingTop: 8,
        }}
      >
        <BrandMark size={42} />
        <Text style={[styles.badge, { fontSize: 22, letterSpacing: -0.4 }]}>
          Ginkgo
        </Text>
      </View>
      {mode === "register" && <Art height={115} />}
      <View style={{ gap: 8 }}>
        <Title>
          {mode === "verify"
            ? "Xác minh số điện thoại"
            : mode === "reset"
              ? "Lấy lại mật khẩu"
              : mode === "login"
                ? "Chào bạn trở lại."
                : "Bắt đầu cùng Ginkgo."}
        </Title>
        <T muted>
          {mode === "verify"
            ? "Yêu cầu mã xác minh, sau đó nhập 6 số để hoàn tất đăng ký."
            : mode === "reset"
              ? "Xác minh số điện thoại và tạo mật khẩu mới cho tài khoản."
              : "Nhật ký sức khỏe và những nhắc nhở nhỏ, luôn ở bên bạn."}
        </T>
      </View>
      <Card>
        {(mode === "login" || mode === "register") && (
          <Row>
            <Chip
              title="Đăng nhập"
              selected={mode === "login"}
              onPress={() => switchMode("login")}
            />
            <Chip
              title="Tạo tài khoản"
              selected={mode === "register"}
              onPress={() => switchMode("register")}
            />
          </Row>
        )}
        {(mode === "verify" || mode === "reset") && (
          <H>
            {mode === "verify" ? "Chỉ còn một bước nữa" : "Đặt mật khẩu mới"}
          </H>
        )}
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field
              label="Số điện thoại"
              placeholder="0901 234 567"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        {mode !== "verify" && (
          <View style={{ gap: 4 }}>
            <Controller
              control={control}
              name="password"
              render={({ field, fieldState }) => (
                <Field
                  label={mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}
                  placeholder="Ít nhất 10 ký tự"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowPassword(!showPassword)}
                style={{
                  minHeight: 48,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  color={C.muted}
                  size={18}
                />
                <T muted>{showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}</T>
              </Pressable>
              {mode === "login" && (
                <TextLink
                  title="Quên mật khẩu?"
                  onPress={() => switchMode("reset")}
                />
              )}
            </View>
          </View>
        )}
        {(mode === "verify" || mode === "reset") && (
          <>
            <Button
              secondary
              title="Yêu cầu mã xác minh"
              icon="chatbubble-outline"
              disabled={action.busy}
              onPress={async () => {
                if (!(await trigger("phone"))) return;
                await action.run(async () => {
                  const r = await api<{ message: string }>(
                    "/auth/otp/request",
                    {
                      method: "POST",
                      body: {
                        phone: normalizePhone(getValues("phone")),
                        purpose: mode === "reset" ? "reset" : "verify",
                      },
                      public: true,
                    },
                  );
                  setOtpMessage(r.message);
                }, "");
              }}
            />
            {!!otpMessage && <Notice message={otpMessage} />}
            <Controller
              control={control}
              name="code"
              render={({ field, fieldState }) => (
                <Field
                  label="Mã xác minh"
                  placeholder="Nhập 6 số"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <T muted>
              Mã có hiệu lực 5 phút. Chờ ít nhất 60 giây trước khi yêu cầu lại.
            </T>
          </>
        )}
        <Feedback action={action} />
        <Button
          icon="arrow-forward"
          title={
            action.busy
              ? "Đang xử lý…"
              : {
                  login: "Đăng nhập",
                  register: "Tạo tài khoản",
                  verify: "Xác minh tài khoản",
                  reset: "Lưu mật khẩu mới",
                }[mode]
          }
          disabled={action.busy}
          onPress={submit}
        />
        {mode === "login" ? (
          <TextLink
            title="Đã đăng ký nhưng chưa xác minh?"
            onPress={() => switchMode("verify")}
          />
        ) : (
          <TextLink
            title="← Quay về đăng nhập"
            onPress={() => switchMode("login")}
          />
        )}
      </Card>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <Ionicons name="shield-checkmark-outline" color={C.muted} size={18} />
        <View style={{ flex: 1 }}>
          <T muted>
            Dữ liệu là của bạn. Chỉ chia sẻ với trợ lý khi bạn đồng ý.
          </T>
        </View>
      </View>
    </Page>
  );
}
