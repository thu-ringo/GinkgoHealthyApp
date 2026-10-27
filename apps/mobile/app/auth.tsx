import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Path } from "react-native-svg";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, useAuth } from "../src/api";
import {
  Feedback,
  Notice,
  Page,
  TextLink,
  useAction,
} from "../src/ui";
import { useReducedMotion } from "../src/use-reduced-motion";

const authColors = {
  primary: "#087F5B",
  dark: "#075B45",
  light: "#E9F7F0",
  text: "#20332B",
  secondary: "#61746B",
  border: "#DCE8E2",
  inputBorder: "#CBDDD2",
  error: "#C62843",
};

function AuthField({
  label,
  icon,
  error,
  trailing,
  ...inputProps
}: TextInputProps & {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  error?: string;
  trailing?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: authColors.text, fontSize: 15, fontWeight: "600" }}>
        {label}
      </Text>
      <View
        style={{
          minHeight: 60,
          flexDirection: "row",
          alignItems: "center",
          borderWidth: focused ? 1.5 : 1,
          borderColor: error
            ? authColors.error
            : focused
              ? authColors.primary
              : authColors.inputBorder,
          borderRadius: 15,
          paddingLeft: 16,
          paddingRight: 8,
          backgroundColor: "#FFFFFF",
        }}
      >
        <Ionicons
          name={icon}
          size={22}
          color={error ? authColors.error : focused ? authColors.primary : authColors.secondary}
        />
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          placeholderTextColor="#75847D"
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          style={{
            flex: 1,
            minWidth: 0,
            height: 58,
            paddingHorizontal: 12,
            color: authColors.text,
            fontSize: 16,
          }}
        />
        {trailing}
      </View>
      {!!error && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Ionicons name="alert-circle" size={15} color={authColors.error} />
          <Text
            accessibilityRole="alert"
            style={{ color: authColors.error, fontSize: 13, lineHeight: 18 }}
          >
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

function GoogleMark() {
  return (
    <Svg width={30} height={30} viewBox="0 0 48 48" accessibilityLabel="Google">
      <Path
        fill="#4285F4"
        d="M48 24.5c0-1.6-.14-3.15-.4-4.65H24v9.02h13.47c-.58 2.96-2.27 5.47-4.79 7.16v5.96h7.75C45.07 37.44 48 31.52 48 24.5z"
      />
      <Path
        fill="#34A853"
        d="M24 49c6.48 0 11.93-2.15 15.9-5.84l-7.75-5.96c-2.15 1.44-4.9 2.3-8.15 2.3-6.26 0-11.57-4.23-13.47-9.91H2.52v6.15C6.48 43.98 14.7 49 24 49z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 29.59a14.4 14.4 0 0 1 0-9.18v-6.15H2.52a24 24 0 0 0 0 21.48l8.01-6.15z"
      />
      <Path
        fill="#EA4335"
        d="M24 9.5c3.53 0 6.7 1.21 9.21 3.6l6.9-6.9C35.91 2.34 30.46 0 24 0 14.7 0 6.48 5.02 2.52 14.26l8.01 6.15C12.43 13.73 17.74 9.5 24 9.5z"
      />
    </Svg>
  );
}

function SocialButton({
  provider,
  onPress,
  reduceMotion,
}: {
  provider: "google" | "facebook" | "apple";
  onPress: () => void;
  reduceMotion: boolean;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const animateTo = (value: number) => {
    if (reduceMotion) return;
    Animated.timing(scale, {
      toValue: value,
      duration: 140,
      useNativeDriver: true,
    }).start();
  };
  const label = {
    google: "Google",
    facebook: "Facebook",
    apple: "Apple",
  }[provider];
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đăng nhập bằng ${label}`}
        onPress={onPress}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        style={({ pressed }) => ({
          width: 58,
          height: 58,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: pressed ? "#AFCDBD" : authColors.border,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        {provider === "google" ? (
          <GoogleMark />
        ) : (
          <Ionicons
            name={provider === "facebook" ? "logo-facebook" : "logo-apple"}
            size={32}
            color={provider === "facebook" ? "#1877F2" : "#000000"}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

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
    [showPassword, setShowPassword] = useState(false),
    [socialMessage, setSocialMessage] = useState("");
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
  const reduceMotion = useReducedMotion();
  const [formTransition] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (mode !== "login" && mode !== "register") return;
    if (reduceMotion) {
      formTransition.setValue(1);
      return;
    }
    formTransition.setValue(0);
    Animated.timing(formTransition, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [formTransition, mode, reduceMotion]);
  const switchMode = (next: Mode) => {
    setMode(next);
    setOtpMessage("");
    setSocialMessage("");
    setShowPassword(false);
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
    <Page horizontalPadding={24}>
      <View
        style={{
          width: "100%",
          maxWidth: 440,
          alignSelf: "center",
          gap: 20,
        }}
      >
        <View style={{ alignItems: "center", gap: 8, paddingTop: 4 }}>
          <Image
            source={require("../assets/Ginkgo.png")}
            accessibilityLabel="Logo lá bạch quả Ginkgo"
            resizeMode="cover"
            style={{
              width: 70,
              height: 70,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: authColors.border,
            }}
          />
          <Text
            style={{
              color: authColors.dark,
              fontSize: 29,
              lineHeight: 35,
              fontWeight: "800",
              letterSpacing: -0.5,
            }}
          >
            Ginkgo
          </Text>
          <Text
            style={{
              color: authColors.secondary,
              fontSize: 14,
              lineHeight: 20,
              textAlign: "center",
            }}
          >
            Chăm sóc sức khỏe mỗi ngày
          </Text>
        </View>

        {(mode === "login" || mode === "register") && (
          <View
            accessibilityRole="tablist"
            style={{
              minHeight: 54,
              flexDirection: "row",
              padding: 4,
              borderRadius: 16,
              backgroundColor: authColors.light,
            }}
          >
            {(["login", "register"] as const).map((tab) => {
              const selected = mode === tab;
              const title = tab === "login" ? "Đăng nhập" : "Tạo tài khoản";
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => switchMode(tab)}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 46,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? authColors.primary : "transparent",
                    opacity: pressed ? 0.82 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: selected ? "#FFFFFF" : authColors.dark,
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    {title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Animated.View
          style={{
            gap: 18,
            opacity:
              mode === "login" || mode === "register"
                ? formTransition
                : 1,
            transform: [
              {
                translateY:
                  mode === "login" || mode === "register"
                    ? formTransition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      })
                    : 0,
              },
            ],
          }}
        >
          <View style={{ gap: 8 }}>
            <Text
              accessibilityRole="header"
              style={{
                color: authColors.text,
                fontSize: 25,
                lineHeight: 32,
                fontWeight: "800",
                letterSpacing: -0.3,
              }}
            >
              {mode === "verify"
                ? "Xác minh số điện thoại"
                : mode === "reset"
                  ? "Lấy lại mật khẩu"
                  : mode === "login"
                    ? "Chào mừng trở lại!"
                    : "Bắt đầu cùng Ginkgo"}
            </Text>
            <Text
              style={{
                color: authColors.secondary,
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {mode === "verify"
                ? "Yêu cầu mã xác minh, sau đó nhập 6 số để hoàn tất đăng ký."
                : mode === "reset"
                  ? "Xác minh số điện thoại và tạo mật khẩu mới cho tài khoản."
                  : mode === "login"
                    ? "Đăng nhập để tiếp tục theo dõi sức khỏe của bạn."
                    : "Tạo tài khoản để theo dõi và chăm sóc sức khỏe mỗi ngày."}
            </Text>
          </View>

          <View
            style={{
              padding: 20,
              gap: 17,
              borderRadius: 20,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: authColors.border,
            }}
          >
            {(mode === "verify" || mode === "reset") && (
              <Text
                style={{
                  color: authColors.text,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                {mode === "verify" ? "Chỉ còn một bước nữa" : "Đặt mật khẩu mới"}
              </Text>
            )}
            <Controller
              control={control}
              name="phone"
              render={({ field, fieldState }) => (
                <AuthField
                  label="Số điện thoại"
                  placeholder="0901 234 567"
                  icon="call-outline"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            {mode !== "verify" && (
              <View style={{ gap: 8 }}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <AuthField
                      label={mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}
                      placeholder="Ít nhất 10 ký tự"
                      icon="lock-closed-outline"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                      trailing={
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                          }
                          accessibilityState={{ selected: showPassword }}
                          onPress={() => setShowPassword((value) => !value)}
                          style={{
                            width: 44,
                            height: 44,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Ionicons
                            name={
                              showPassword
                                ? "eye-off-outline"
                                : "eye-outline"
                            }
                            size={22}
                            color={authColors.secondary}
                          />
                        </Pressable>
                      }
                    />
                  )}
                />
                <Text
                  style={{
                    color: authColors.secondary,
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  Mật khẩu cần có từ 10 đến 128 ký tự.
                </Text>
                {mode === "login" && (
                  <TextLink
                    title="Quên mật khẩu?"
                    onPress={() => switchMode("reset")}
                  />
                )}
              </View>
            )}
            {(mode === "verify" || mode === "reset") && (
              <>
                <Pressable
                  accessibilityRole="button"
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
                  style={({ pressed }) => ({
                    minHeight: 52,
                    borderRadius: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: authColors.light,
                    opacity: pressed || action.busy ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: authColors.dark,
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    Yêu cầu mã xác minh
                  </Text>
                </Pressable>
                {!!otpMessage && <Notice message={otpMessage} />}
                <Controller
                  control={control}
                  name="code"
                  render={({ field, fieldState }) => (
                    <AuthField
                      label="Mã xác minh"
                      placeholder="Nhập 6 số"
                      icon="keypad-outline"
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <Text
                  style={{
                    color: authColors.secondary,
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  Mã có hiệu lực 5 phút. Chờ ít nhất 60 giây trước khi yêu cầu lại.
                </Text>
              </>
            )}

            <Feedback action={action} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                action.busy
                  ? "Đang xử lý"
                  : {
                      login: "Đăng nhập",
                      register: "Tạo tài khoản",
                      verify: "Xác minh tài khoản",
                      reset: "Lưu mật khẩu mới",
                    }[mode]
              }
              accessibilityState={{ disabled: action.busy, busy: action.busy }}
              disabled={action.busy}
              onPress={submit}
              style={({ pressed }) => ({
                minHeight: 58,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                borderRadius: 16,
                backgroundColor: authColors.primary,
                opacity: action.busy ? 0.8 : 1,
                transform: [{ scale: pressed && !action.busy ? 0.98 : 1 }],
              })}
            >
              {action.busy && <ActivityIndicator size="small" color="#FFFFFF" />}
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 17,
                  fontWeight: "700",
                }}
              >
                {action.busy
                  ? "Đang xử lý…"
                  : {
                      login: "Đăng nhập",
                      register: "Tạo tài khoản",
                      verify: "Xác minh tài khoản",
                      reset: "Lưu mật khẩu mới",
                    }[mode]}
              </Text>
            </Pressable>

            {mode === "login" && (
              <Pressable
                accessibilityRole="button"
                onPress={() => switchMode("verify")}
                style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Text
                  style={{
                    color: authColors.primary,
                    fontSize: 14,
                    fontWeight: "600",
                    textAlign: "center",
                  }}
                >
                  Đã đăng ký nhưng chưa xác minh?
                </Text>
              </Pressable>
            )}
            {(mode === "register" || mode === "verify" || mode === "reset") && (
              <TextLink
                title="← Quay về đăng nhập"
                onPress={() => switchMode("login")}
              />
            )}
          </View>

          {mode === "login" && (
            <View style={{ alignItems: "center", gap: 16 }}>
              <View
                style={{
                  width: "100%",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 2,
                }}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: "#DFE8E1" }} />
                <Text
                  style={{
                    color: authColors.secondary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Hoặc đăng nhập với
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: "#DFE8E1" }} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 20 }}>
                {(["google", "facebook", "apple"] as const).map((provider) => (
                  <SocialButton
                    key={provider}
                    provider={provider}
                    reduceMotion={reduceMotion}
                    onPress={() =>
                      setSocialMessage(
                        "Phương thức đăng nhập này chưa được hỗ trợ.",
                      )
                    }
                  />
                ))}
              </View>
              {!!socialMessage && (
                <Text
                  accessibilityRole="alert"
                  style={{
                    color: authColors.secondary,
                    fontSize: 13,
                    lineHeight: 19,
                    textAlign: "center",
                  }}
                >
                  {socialMessage}
                </Text>
              )}
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 8,
              paddingHorizontal: 8,
              paddingBottom: 8,
            }}
          >
            <Ionicons
              name="shield-checkmark-outline"
              color={authColors.secondary}
              size={18}
            />
            <Text
              style={{
                flex: 1,
                color: authColors.secondary,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              Dữ liệu là của bạn. Chỉ chia sẻ với trợ lý khi bạn đồng ý.
            </Text>
          </View>
        </Animated.View>
      </View>
    </Page>
  );
}
