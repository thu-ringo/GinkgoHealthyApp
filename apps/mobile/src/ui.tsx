import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TextInputProps,
  Image,
  ImageSourcePropType,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
export const C = {
  bg: "#FAFBF8",
  primary: "#327C59",
  text: "#202B29",
  muted: "#687570",
  accent: "#F2A995",
  sage: "#77B991",
  border: "#DEE4DC",
  soft: "#E8F3EA",
  white: "#FFFFFF",
  error: "#A43C35",
  blue: "#E8F2F6",
  lavender: "#EEEBF5",
  peach: "#FAEEE3",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: {
    padding: 20,
    gap: 22,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.8,
  },
  h2: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: "600",
    color: C.text,
    letterSpacing: -0.3,
  },
  body: { fontSize: 16, lineHeight: 24, color: C.text },
  muted: { fontSize: 14, lineHeight: 21, color: C.muted },
  card: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: "#E9EDE6",
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  field: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: "#F8FAF7",
    fontSize: 16,
    color: C.text,
  },
  label: { fontSize: 14, fontWeight: "600", color: C.text },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: C.white },
  line: { height: 1, backgroundColor: C.border },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: C.primary,
    letterSpacing: 1.2,
  },
  big: { fontSize: 38, fontWeight: "600", color: C.text, letterSpacing: -1 },
});
export function Page({
  children,
  footer,
  autoScroll = false,
  horizontalPadding,
  backgroundColor = C.bg,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  autoScroll?: boolean;
  horizontalPadding?: number;
  backgroundColor?: string;
}) {
  const scroll = useRef<ScrollView>(null);
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.page, { backgroundColor }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          onContentSizeChange={() => {
            if (autoScroll) scroll.current?.scrollToEnd({ animated: true });
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            horizontalPadding != null ? { paddingHorizontal: horizontalPadding } : null,
          ]}
        >
          {children}
        </ScrollView>
        {footer && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 12,
              borderTopWidth: 1,
              borderTopColor: C.border,
              backgroundColor: C.bg,
            }}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function T({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return <Text style={muted ? styles.muted : styles.body}>{children}</Text>;
}
export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}
export function H({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.h2}>
      {children}
    </Text>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof View>["style"];
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}
export function Field({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={C.muted}
        style={[
          styles.field,
          focused && { borderColor: C.primary, borderWidth: 1.5 },
          props.multiline ? { minHeight: 100, textAlignVertical: "top" } : null,
          style,
        ]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {error && (
        <Text accessibilityRole="alert" style={{ color: C.error }}>
          {error}
        </Text>
      )}
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
  danger = false,
  minHeight = 48,
  accent = C.primary,
  soft = C.soft,
  primaryColor = C.primary,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  danger?: boolean;
  minHeight?: number;
  accent?: string;
  soft?: string;
  primaryColor?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { minHeight },
        !secondary && !danger && { backgroundColor: primaryColor },
        { flexDirection: "row", gap: 8 },
        secondary && { backgroundColor: soft },
        danger && { backgroundColor: "#F8E9E5" },
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={19}
          color={danger ? C.error : secondary ? accent : C.white}
        />
      )}
      <Text
        style={[
          styles.buttonText,
          secondary && { color: accent },
          danger && { color: C.error },
          { flexShrink: 1, textAlign: "center" },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export const kindIcons: Record<string, IconName> = {
  water: "water",
  sleep: "moon",
  weight: "scale",
  blood_pressure: "speedometer",
  heart_rate: "heart",
  mood: "happy",
  note: "create-outline",
};
export const moodLevelIcons: readonly IconName[] = [
  "sad",
  "sad-outline",
  "happy-outline",
  "happy-outline",
  "happy",
];
export function Icon({
  name,
  tone = C.soft,
  color = C.primary,
  size = 42,
  circular = false,
}: {
  name: IconName;
  tone?: string;
  color?: string;
  size?: number;
  circular?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: circular ? size / 2 : size * 0.34,
        backgroundColor: tone,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={size * 0.5} color={color} />
    </View>
  );
}
export function TextLink({
  title,
  onPress,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: "center",
        opacity: pressed ? 0.55 : 1,
        paddingHorizontal: 4,
      })}
    >
      <Text
        style={{
          color: danger ? C.error : C.primary,
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Header({
  title,
  subtitle,
  back = false,
  action,
  size,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
  size?: "large" | "compact";
}) {
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            style={{
              alignSelf: "flex-start",
              minWidth: 48,
              minHeight: 48,
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {back ? (
            <Text
              accessibilityRole="header"
              style={{
                fontSize: size === "large" ? 34 : 22,
                lineHeight: size === "large" ? 42 : 29,
                fontWeight: size === "large" ? "700" : "600",
                color: C.text,
              }}
            >
              {title}
            </Text>
          ) : size === "compact" ? (
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 24,
                lineHeight: 32,
                fontWeight: "700",
                color: C.text,
              }}
            >
              {title}
            </Text>
          ) : size === "large" ? (
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 34,
                lineHeight: 42,
                fontWeight: "700",
                color: C.text,
                letterSpacing: -0.8,
              }}
            >
              {title}
            </Text>
          ) : (
            <Title>{title}</Title>
          )}
        </View>
        {action}
      </View>
      {subtitle && (
        <Text
          style={{
            color: size === "large" ? "#3F4A47" : C.muted,
            fontSize: size === "large" ? 16 : size === "compact" ? 13 : 14,
            lineHeight: size === "large" ? 24 : size === "compact" ? 19 : 21,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
export function BrandHeader({
  title,
  subtitle,
  action,
  logoSource,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  logoSource?: ImageSourcePropType;
}) {
  return (
    <View
      style={{
        minHeight: 72,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Image
        source={logoSource ?? require("../assets/Ginkgo.png")}
        accessibilityLabel="Logo lá bạch quả Ginkgo"
        style={{ width: 52, height: 52, borderRadius: 16 }}
        resizeMode="contain"
      />
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          accessibilityRole="header"
          style={{ color: "#075B45", fontSize: 29, fontWeight: "800" }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{ color: "#62817D", fontSize: 14, lineHeight: 19 }}
        >
          {subtitle}
        </Text>
      </View>
      {action}
    </View>
  );
}
export function Section({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <View style={{ flex: 1 }}>
        <H>{title}</H>
      </View>
      {action}
    </View>
  );
}
export function Chip({
  title,
  selected = false,
  onPress,
  icon,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: selected ? C.primary : C.white,
        borderWidth: 1,
        borderColor: selected ? C.primary : C.border,
        opacity: pressed ? 0.65 : 1,
        maxWidth: "100%",
      })}
    >
      {icon && (
        <Ionicons name={icon} color={selected ? C.white : C.muted} size={18} />
      )}
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: selected ? C.white : C.muted,
          flexShrink: 1,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Art({ height = 150 }: { height?: number }) {
  return (
    <Image
      source={require("../assets/wellness-ritual.png")}
      accessible={false}
      resizeMode="cover"
      style={{ width: "100%", height, borderRadius: 22 }}
    />
  );
}
export function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: C.soft,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Image
        source={require("../assets/Ginkgo.png")}
        resizeMode="cover"
        accessible={false}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.32,
        }}
      />
    </View>
  );
}
export function Empty({
  title,
  description,
  icon = "leaf-outline",
  iconColor = C.primary,
  iconTone = C.soft,
  iconSize = 60,
  action,
  art = false,
}: {
  title: string;
  description: string;
  icon?: IconName;
  iconColor?: string;
  iconTone?: string;
  iconSize?: number;
  action?: React.ReactNode;
  art?: boolean;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 24, gap: 14 }}>
      {art ? (
        <Art height={150} />
      ) : (
        <Icon
          name={icon}
          size={iconSize}
          color={iconColor}
          tone={iconTone}
        />
      )}
      <H>{title}</H>
      <Text style={[styles.muted, { textAlign: "center", maxWidth: 290 }]}>
        {description}
      </Text>
      {action}
    </View>
  );
}
export function Disclosure({
  title,
  subtitle,
  icon = "options-outline",
  children,
  defaultOpen = false,
  accent,
  soft,
  textColor,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
  soft?: string;
  textColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accentColor = accent ?? C.primary;
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 48,
        }}
      >
        <Icon name={icon} color={accentColor} tone={soft ?? C.soft} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: textColor ?? C.text,
            }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{ color: textColor ?? C.muted, fontSize: 14 }}
            >
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={accentColor}
        />
      </Pressable>
      {open && <View style={{ gap: 16, paddingTop: 8 }}>{children}</View>}
    </Card>
  );
}
export function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return (
    <View
      accessibilityRole={error ? "alert" : "text"}
      style={{
        padding: 14,
        borderRadius: 12,
        backgroundColor: error ? "#F8E9E5" : C.soft,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          lineHeight: 21,
          color: error ? C.error : C.primary,
        }}
      >
        {message}
      </Text>
    </View>
  );
}
export function State({
  query,
  empty,
  children,
}: {
  query: any;
  empty?: boolean;
  children: React.ReactNode;
}) {
  if (query.isPending)
    return (
      <View style={{ gap: 10 }}>
        <ActivityIndicator color={C.primary} />
        <T muted>Đang tải dữ liệu…</T>
      </View>
    );
  if (query.error)
    return (
      <Card>
        <Notice error message={query.error.message} />
        <Button secondary title="Thử tải lại" onPress={() => query.refetch()} />
      </Card>
    );
  if (empty)
    return (
      <Card>
        <H>Chưa có dữ liệu</H>
        <T muted>
          Thêm bản ghi đầu tiên để bắt đầu theo dõi thói quen của bạn.
        </T>
      </Card>
    );
  return <>{children}</>;
}
export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  return {
    busy,
    error,
    success,
    clear: () => {
      setError("");
      setSuccess("");
    },
    run: async (fn: () => Promise<void>, message = "Đã lưu thay đổi") => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      setError("");
      setSuccess("");
      try {
        await fn();
        setSuccess(message);
      } catch (e: any) {
        setError(e.message || "Không thể thực hiện. Thử lại sau.");
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
  };
}
export function Feedback({ action }: { action: ReturnType<typeof useAction> }) {
  return (
    <>
      {!!action.error && <Notice error message={action.error} />}
      {!!action.success && <Notice message={action.success} />}
    </>
  );
}
