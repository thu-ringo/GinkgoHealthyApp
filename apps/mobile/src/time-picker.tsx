import React, { useMemo, useState } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Circle, Line } from "react-native-svg";
import { partOfDay } from "./palette";
import { useReducedMotion } from "./use-reduced-motion";

type Tone = { deep: string; soft: string; border: string };
type Mode = "hour" | "minute";

function toTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function TimePickerSheet({
  visible,
  value,
  title,
  tone,
  showDayParts = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  value: string;
  title: string;
  tone: Tone;
  showDayParts?: boolean;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const reducedMotion = useReducedMotion();
  const parsed = /^([01]\d|2[0-3]):[0-5]\d$/.exec(value);
  const initialHour = parsed ? Number(value.slice(0, 2)) : 8;
  const initialMinute = parsed ? Number(value.slice(3)) : 0;
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [mode, setMode] = useState<Mode>("hour");

  const center = 132;
  const radius = 94;
  const selectedValue = mode === "hour" ? (hour % 12 || 12) : minute;
  const handAngle =
    mode === "hour"
      ? ((hour % 12) * 30 - 90) * (Math.PI / 180)
      : (minute * 6 - 90) * (Math.PI / 180);
  const handEnd = {
    x: center + Math.cos(handAngle) * radius,
    y: center + Math.sin(handAngle) * radius,
  };
  const period = hour < 12 ? "SA" : "CH";

  const panResponder = useMemo(
    () => {
      const selectFromPoint = (x: number, y: number) => {
        const dx = x - center;
        const dy = y - center;
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        angle = (angle + 360) % 360;
        if (mode === "hour") {
          const faceHour = Math.round(angle / 30) % 12 || 12;
          const nextHour = (faceHour % 12) + (hour >= 12 ? 12 : 0);
          setHour(nextHour);
          setMode("minute");
        } else {
          const exactMinute = Math.round(angle / 6) % 60;
          setMinute(exactMinute);
        }
      };
      return PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
        onPanResponderGrant: (event) =>
          selectFromPoint(event.nativeEvent.locationX, event.nativeEvent.locationY),
        onPanResponderMove: (event) =>
          selectFromPoint(event.nativeEvent.locationX, event.nativeEvent.locationY),
      });
    },
    [mode, hour],
  );

  const setPeriod = (next: "SA" | "CH") => {
    setHour((current) => {
      const faceHour = current % 12;
      return faceHour + (next === "CH" ? 12 : 0);
    });
  };
  const setQuickMinute = (next: number) => {
    setMinute(next);
    setMode("minute");
  };

  const part = partOfDay(toTime(hour, minute));
  const dayPart =
    hour >= 5 && hour < 11
      ? "Sáng"
      : hour >= 11 && hour < 14
        ? "Trưa"
        : hour >= 14 && hour < 18
          ? "Chiều"
          : "Tối";
  const faceNumbers =
    mode === "hour"
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : Array.from({ length: 12 }, (_, index) => index * 5);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? "none" : "slide"}
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(22, 34, 31, 0.42)",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            alignSelf: "center",
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 28,
            gap: 18,
            alignItems: "center",
          }}
        >
          <Text
            accessibilityRole="header"
            style={{ alignSelf: "stretch", color: "#202B29", fontSize: 20, fontWeight: "700" }}
          >
            {title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chọn giờ, hiện tại ${String(hour).padStart(2, "0")}`}
              onPress={() => setMode("hour")}
              style={{
                minWidth: 84,
                minHeight: 64,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: mode === "hour" ? tone.deep : "transparent",
                backgroundColor: mode === "hour" ? tone.soft : "transparent",
              }}
            >
              <Text style={{ color: "#202B29", fontSize: 56, lineHeight: 64, fontWeight: "700" }}>
                {String(hour).padStart(2, "0")}
              </Text>
            </Pressable>
            <Text style={{ fontSize: 42, fontWeight: "700", color: "#202B29" }}>:</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chọn phút, hiện tại ${String(minute).padStart(2, "0")}`}
              onPress={() => setMode("minute")}
              style={{
                minWidth: 84,
                minHeight: 64,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: mode === "minute" ? tone.deep : "transparent",
                backgroundColor: mode === "minute" ? tone.soft : "transparent",
              }}
            >
              <Text style={{ color: "#202B29", fontSize: 56, lineHeight: 64, fontWeight: "700" }}>
                {String(minute).padStart(2, "0")}
              </Text>
            </Pressable>
            <View style={{ gap: 4 }}>
              {(["SA", "CH"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={value === "SA" ? "Buổi sáng, trước 12 giờ" : "Buổi chiều, từ 12 giờ"}
                  accessibilityState={{ selected: period === value }}
                  onPress={() => setPeriod(value)}
                  style={{
                    minWidth: 48,
                    minHeight: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    backgroundColor: period === value ? tone.deep : tone.soft,
                  }}
                >
                  <Text style={{ color: period === value ? "#FFFFFF" : "#202B29", fontSize: 14, fontWeight: "700" }}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View
            style={{
              minHeight: 40,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 14,
              borderRadius: 20,
              backgroundColor: part.bg,
            }}
          >
            <Ionicons name={part.icon} size={20} color={part.fg} />
            <Text style={{ color: "#202B29", fontSize: 15, fontWeight: "600" }}>
              {showDayParts ? dayPart : part.label}
            </Text>
          </View>
          {showDayParts && (
            <View style={{ width: "100%", flexDirection: "row", gap: 6 }}>
              {([
                { label: "Sáng", hour: 8 },
                { label: "Trưa", hour: 12 },
                { label: "Chiều", hour: 16 },
                { label: "Tối", hour: 20 },
              ] as const).map((suggestion) => {
                const selected = dayPart === suggestion.label;
                return (
                  <Pressable
                    key={suggestion.label}
                    accessibilityRole="button"
                    accessibilityLabel={`Gợi ý ${suggestion.label}, ${String(suggestion.hour).padStart(2, "0")}:00`}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setHour(suggestion.hour);
                      setMinute(0);
                    }}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 14,
                      backgroundColor: selected ? tone.deep : tone.soft,
                    }}
                  >
                    <Text style={{ color: selected ? "#FFFFFF" : "#202B29", fontSize: 14, fontWeight: "600" }}>
                      {suggestion.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <View
            accessibilityLabel="Mặt đồng hồ chọn giờ"
            {...panResponder.panHandlers}
            style={{
              width: 264,
              height: 264,
              borderRadius: 132,
              backgroundColor: tone.soft,
            }}
          >
            <Svg width={264} height={264} style={{ position: "absolute" }}>
              <Line
                x1={center}
                y1={center}
                x2={handEnd.x}
                y2={handEnd.y}
                stroke={tone.deep}
                strokeWidth={3}
              />
              <Circle cx={center} cy={center} r={4} fill={tone.deep} />
            </Svg>
            {faceNumbers.map((number, index) => {
              const angle = ((index * 30 - 90) * Math.PI) / 180;
              const x = center + Math.cos(angle) * radius;
              const y = center + Math.sin(angle) * radius;
              const label = mode === "minute" ? String(number).padStart(2, "0") : String(number);
              return (
                <Pressable
                  key={number}
                  accessibilityRole="button"
                  accessibilityLabel={mode === "hour" ? `Chọn giờ ${number}` : `Chọn phút ${label}`}
                  onPress={() => {
                    if (mode === "hour") {
                      setHour((hour >= 12 ? 12 : 0) + (number % 12));
                      setMode("minute");
                    } else {
                      setMinute(number);
                    }
                  }}
                  style={{
                    position: "absolute",
                    width: 40,
                    height: 40,
                    left: x - 20,
                    top: y - 20,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "transparent",
                  }}
                >
                  <Text style={{ color: "#202B29", fontSize: 15, fontWeight: "500" }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 40,
                height: 40,
                left: handEnd.x - 20,
                top: handEnd.y - 20,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: tone.deep,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
                {mode === "hour" ? selectedValue : String(selectedValue).padStart(2, "0")}
              </Text>
            </View>
          </View>
          <View style={{ width: "100%", gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { label: "Phút 00", value: 0 },
                { label: "Phút 15", value: 15 },
                { label: "Phút 30", value: 30 },
                { label: "Phút 45", value: 45 },
              ].map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => setQuickMinute(item.value)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 14,
                    backgroundColor: tone.soft,
                  }}
                >
                  <Text style={{ color: "#202B29", fontSize: 15, fontWeight: "600" }}>{String(item.value).padStart(2, "0")}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { label: "Giảm giờ", delta: -1, type: "hour" as const },
                { label: "Tăng giờ", delta: 1, type: "hour" as const },
                { label: "Giảm phút", delta: -1, type: "minute" as const },
                { label: "Tăng phút", delta: 1, type: "minute" as const },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => {
                    if (item.type === "hour") setHour((hour + item.delta + 24) % 24);
                    else setMinute((minute + item.delta + 60) % 60);
                  }}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: tone.border,
                    borderRadius: 14,
                  }}
                >
                  <Text style={{ color: "#202B29", fontSize: 14, fontWeight: "600" }}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ width: "100%", flexDirection: "row", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Hủy chọn giờ"
              onPress={onCancel}
              style={{
                flex: 1,
                minHeight: 54,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: tone.border,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: "#202B29", fontSize: 16, fontWeight: "700" }}>Hủy</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xác nhận giờ ${toTime(hour, minute)}`}
              onPress={() => onConfirm(toTime(hour, minute))}
              style={{
                flex: 1,
                minHeight: 54,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: tone.deep,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>Xong</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
