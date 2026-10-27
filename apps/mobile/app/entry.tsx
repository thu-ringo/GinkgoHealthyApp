import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { DateTime } from "luxon";
import * as Crypto from "expo-crypto";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, changed } from "../src/api";
import { Entry, HealthData, kinds, Profile } from "../src/types";
import { metricColors, metricValue } from "../src/metric-meta";
import { DatePickerSheet } from "../src/date-picker";
import { TimePickerSheet } from "../src/time-picker";
import {
  Button,
  Card,
  Chip,
  C,
  Feedback,
  Field,
  Icon,
  kindIcons,
  moodLevelIcons,
  Page,
  Row,
  T,
  useAction,
} from "../src/ui";
import { useReducedMotion } from "../src/use-reduced-motion";
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
  const [initialKind] = useState(kind);
  const [initialValue] = useState(value);
  const [initialSecondary] = useState(secondary);
  const [initialNote] = useState(note);
  const profile = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Profile>("/me"),
  }),
    zone = profile.data?.timezone || "Asia/Ho_Chi_Minh";
  const health = useQuery({
  queryKey: ["health-data"],
  queryFn: () => api<HealthData>("/health-data"),
  });
  const [dateDraft, setDate] = useState<string>(),
  [timeDraft, setTime] = useState<string>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<"record" | "sleepStart" | "sleepEnd" | null>(null);
  const [preset, setPreset] = useState<"now" | "hour" | "yesterday" | null>(existing ? null : "now");
  const [noteOpen, setNoteOpen] = useState(!!existing?.note || existing?.kind === "note");
  const [sleepStart, setSleepStart] = useState(() => {
    if (existing?.kind !== "sleep" || existing.value == null) return "";
    return DateTime.fromISO(existing.measured_at)
      .setZone("Asia/Ho_Chi_Minh")
      .minus({ minutes: existing.value })
      .toFormat("HH:mm");
  });
  const [sleepEnd, setSleepEnd] = useState(() =>
    existing?.kind === "sleep"
      ? DateTime.fromISO(existing.measured_at)
          .setZone("Asia/Ho_Chi_Minh")
          .toFormat("HH:mm")
      : "",
  );
  const [sleepDurationOverride, setSleepDurationOverride] = useState("");
  const [manualSleepDurationOpen, setManualSleepDurationOpen] = useState(false);
  const sleepTimesEdited = useRef(false);
  const [sleepTimesChanged, setSleepTimesChanged] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);
  const measured = DateTime.fromISO(existing?.measured_at || createdAt).setZone(
    zone,
  ),
    date = dateDraft ?? measured.toISODate()!,
    time = timeDraft ?? measured.toFormat("HH:mm");
  const saveInProgress = useRef(false);
  const savedSuccessfully = useRef(false);
  const closingPrompt = useRef(false);
  const action = useAction();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const allowRemoval = useRef(false);
  const pendingExit = useRef<(() => void) | null>(null);
  const [exitPromptVisible, setExitPromptVisible] = useState(false);
  const [sheetOpacity] = useState(() => new Animated.Value(0));
  const [sheetTranslateY] = useState(() => new Animated.Value(360));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const runAction = useRef(action.run);
  const labels: Record<string, string> = {
    weight: "Cân nặng (kg)",
    water: "Lượng nước uống (ml)",
    heart_rate: "Nhịp tim (bpm)",
    blood_pressure: "Huyết áp tâm thu (mmHg)",
    mood: "Tâm trạng (1–5)",
  };
  const latestMetric = health.data?.metrics.find((metric) => metric.kind === kind);
  const entryKinds = [
    "weight",
    "water",
    "sleep",
    "heart_rate",
    "blood_pressure",
    "mood",
    "note",
  ] as const;
  const entryCellWidth = gridWidth ? (gridWidth - 24) / 4 : undefined;
  const palette = metricColors[kind as keyof typeof metricColors] ?? {
    icon: C.primary,
    background: C.soft,
    border: C.border,
  };
  const hasUnsavedChanges =
    kind !== initialKind ||
    value !== initialValue ||
    secondary !== initialSecondary ||
    note !== initialNote ||
    dateDraft !== undefined ||
    timeDraft !== undefined ||
    sleepTimesChanged ||
    sleepDurationOverride !== "";

  const sleepMinutes = getSleepDuration(sleepStart, sleepEnd);
  const overriddenSleepMinutes =
    Number.isFinite(Number(sleepDurationOverride.replace(",", "."))) &&
    Number(sleepDurationOverride.replace(",", ".")) > 0
      ? Math.round(Number(sleepDurationOverride.replace(",", ".")) * 60)
      : null;
  const recordedSleepMinutes = overriddenSleepMinutes ?? sleepMinutes;
  const measuredDateTime = DateTime.fromISO(`${date}T${time}`, { zone });
  const futureTimeError =
    measuredDateTime.isValid &&
    measuredDateTime > DateTime.now().setZone(zone)
      ? "Không thể chọn thời điểm trong tương lai."
      : "";

  const validateEntry = useCallback(() => {
    const errors: Record<string, string> = {};
    const d = DateTime.fromISO(`${date}T${time}`, { zone });
    if (
      !d.isValid ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    )
      errors.dateTime = "Chọn ngày và giờ ghi nhận hợp lệ.";
    else if (d > DateTime.now().setZone(zone))
      errors.dateTime = "Không thể chọn thời điểm trong tương lai.";
    const numeric =
      kind === "sleep"
        ? recordedSleepMinutes == null
          ? Number.NaN
          : recordedSleepMinutes / 60
        : Number(value.replace(",", "."));
    if (
      kind !== "note" &&
      (!Number.isFinite(numeric) || numeric <= 0)
    ) {
      errors.value =
        kind === "sleep"
          ? "Chọn giờ bắt đầu và giờ thức dậy hợp lệ."
          : "Nhập giá trị lớn hơn 0.";
      if (kind === "sleep") errors.sleep = errors.value;
    }
    if (kind === "mood" && (!Number.isInteger(numeric) || numeric > 5))
      errors.value = "Chọn mức tâm trạng từ 1 đến 5.";
    if (
      kind === "blood_pressure" &&
      (!secondary.trim() ||
        !Number.isFinite(Number(secondary)) ||
        Number(secondary) <= 0)
    )
      errors.secondary = "Nhập huyết áp tâm trương hợp lệ.";
    setFieldErrors(errors);
    return Object.values(errors)[0] ?? "";
  }, [date, kind, recordedSleepMinutes, secondary, time, value, zone]);

  const saveEntry = useCallback(async () => {
    if (saveInProgress.current)
      throw new Error("Bản ghi đang được lưu. Vui lòng đợi.");
    saveInProgress.current = true;
    try {
    const validationError = validateEntry();
    if (validationError) throw new Error(validationError);
    const d = DateTime.fromISO(`${date}T${time}`, { zone });
    const numeric =
      kind === "sleep"
        ? recordedSleepMinutes == null
          ? Number.NaN
          : recordedSleepMinutes / 60
        : Number(value.replace(",", "."));
    await api(`/entries/${id}`, {
      method: "PUT",
      body: {
        id,
        kind,
        value:
          kind === "note"
            ? null
            : kind === "sleep"
                ? recordedSleepMinutes
              : numeric,
        secondary: kind === "blood_pressure" ? Number(secondary) : null,
        unit: kinds[kind].unit,
        measured_at: d.toUTC().toISO(),
        source: "manual",
        note,
      },
    });
    await changed();
    } finally {
      saveInProgress.current = false;
    }
  }, [date, id, kind, note, recordedSleepMinutes, secondary, time, validateEntry, value, zone]);

  useEffect(() => {
    runAction.current = action.run;
  }, [action.run]);

  useEffect(() => {
    if (existing?.kind !== "sleep" || existing.value == null || sleepTimesEdited.current)
      return;
    const end = DateTime.fromISO(existing.measured_at).setZone(zone);
    setSleepEnd(end.toFormat("HH:mm"));
    setSleepStart(end.minus({ minutes: existing.value }).toFormat("HH:mm"));
  }, [existing?.kind, existing?.measured_at, existing?.value, zone]);

  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event) => {
        if (allowRemoval.current) {
          allowRemoval.current = false;
          return;
        }
        if (!hasUnsavedChanges || savedSuccessfully.current) return;
        event.preventDefault();
        if (pendingExit.current) return;
        pendingExit.current = () => navigation.dispatch(event.data.action);
        Keyboard.dismiss();
        sheetOpacity.setValue(0);
        sheetTranslateY.setValue(360);
        setExitPromptVisible(true);
      }),
    [hasUnsavedChanges, navigation, sheetOpacity, sheetTranslateY],
  );

  const clearFieldError = (key: string) => {
    setFieldErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const closePrompt = (afterClose?: () => void) => {
    if (closingPrompt.current) return;
    closingPrompt.current = true;
    if (reduceMotion) {
      setExitPromptVisible(false);
      closingPrompt.current = false;
      afterClose?.();
      return;
    }
    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 360,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        closingPrompt.current = false;
        return;
      }
      setExitPromptVisible(false);
      closingPrompt.current = false;
      afterClose?.();
    });
  };

  const animatePromptIn = () => {
    if (reduceMotion) {
      sheetOpacity.setValue(1);
      sheetTranslateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: false,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const cancelExit = () => {
    if (action.busy) return;
    pendingExit.current = null;
    closePrompt();
  };

  const leaveScreen = (afterSuccessfulSave = false) => {
    if (action.busy && !afterSuccessfulSave) return;
    const exit = pendingExit.current;
    if (!exit) return;
    allowRemoval.current = true;
    closePrompt(() => {
      pendingExit.current = null;
      exit();
    });
  };

  const saveAndExit = async () => {
    if (action.busy || saveInProgress.current) return;
    action.clear();
    if (validateEntry()) {
      pendingExit.current = null;
      closePrompt();
      return;
    }
    await runAction.current(async () => {
      await saveEntry();
      savedSuccessfully.current = true;
      leaveScreen(true);
    }, "Đã lưu bản ghi");
  };

  return (
    <Page horizontalPadding={16} backgroundColor="#F8FBF9">
      <View style={{ minHeight: 56, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          style={{ width: 48, height: 48, alignItems: "flex-start", justifyContent: "center" }}
        >
          <Ionicons name="arrow-back" size={24} color="#20332B" />
        </Pressable>
        <Text accessibilityRole="header" style={{ flex: 1, color: "#20332B", fontSize: 21, fontWeight: "700", textAlign: "center" }}>
          {existing ? "Sửa bản ghi" : "Thêm bản ghi"}
        </Text>
        <View style={{ width: 48 }} />
      </View>
      <Modal
        transparent
        visible={exitPromptVisible}
        onRequestClose={cancelExit}
        onShow={animatePromptIn}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: "#000000",
              opacity: sheetOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.45],
              }),
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng xác nhận"
              onPress={cancelExit}
              style={{ flex: 1 }}
            />
          </Animated.View>
          <Animated.View
            style={{
              width: "100%",
              maxWidth: 440,
              maxHeight: "85%",
              paddingTop: 14,
              paddingHorizontal: 24,
              paddingBottom: Math.max(insets.bottom, 24),
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              backgroundColor: "#FFFFFF",
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <ScrollView
              style={{ flexShrink: 1 }}
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: "center", gap: 0 }}
            >
              <View
                accessibilityElementsHidden
                style={{
                  width: 40,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: "#C9D2CF",
                  marginBottom: 18,
                }}
              />
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#E9F7F0",
                  marginBottom: 14,
                }}
              >
                <Ionicons name="save-outline" size={32} color="#087F5B" />
              </View>
              <Text
                accessibilityRole="header"
                style={{
                  color: "#20332B",
                  fontSize: 22,
                  lineHeight: 28,
                  fontWeight: "800",
                  textAlign: "center",
                }}
              >
                Lưu bản ghi?
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  marginBottom: 22,
                  color: "#61746B",
                  fontSize: 15,
                  lineHeight: 23,
                  textAlign: "center",
                }}
              >
                Bạn có muốn lưu những thay đổi trước khi thoát không?
              </Text>
              {!!action.error && (
                <Text
                  accessibilityRole="alert"
                  style={{
                    width: "100%",
                    marginBottom: 12,
                    color: "#B42332",
                    fontSize: 14,
                    lineHeight: 20,
                    textAlign: "center",
                  }}
                >
                  {action.error}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={action.busy ? "Đang lưu bản ghi" : "Lưu và thoát"}
                accessibilityState={{ disabled: action.busy, busy: action.busy }}
                disabled={action.busy}
                onPress={() => void saveAndExit()}
                style={({ pressed }) => ({
                  width: "100%",
                  minHeight: 56,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  borderRadius: 16,
                  backgroundColor: "#087F5B",
                  opacity: action.busy ? 0.78 : 1,
                  transform: [{ scale: pressed && !action.busy ? 0.98 : 1 }],
                })}
              >
                {action.busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                )}
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
                  {action.busy ? "Đang lưu…" : "Lưu và thoát"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thoát không lưu"
                accessibilityState={{ disabled: action.busy }}
                disabled={action.busy}
                onPress={() => leaveScreen()}
                style={({ pressed }) => ({
                  width: "100%",
                  minHeight: 55,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  marginTop: 11,
                  borderRadius: 16,
                  backgroundColor: "#FCEAE8",
                  opacity: pressed || action.busy ? 0.72 : 1,
                })}
              >
                <Ionicons name="trash-outline" size={21} color="#B42332" />
                <Text style={{ color: "#B42332", fontSize: 16, fontWeight: "700" }}>
                  Thoát không lưu
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ở lại"
                accessibilityState={{ disabled: action.busy }}
                disabled={action.busy}
                onPress={cancelExit}
                style={({ pressed }) => ({
                  width: "100%",
                  minHeight: 53,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  marginTop: 11,
                  borderWidth: 1.5,
                  borderColor: "#C9E3D5",
                  borderRadius: 16,
                  backgroundColor: "#EFF7F2",
                  opacity: pressed || action.busy ? 0.72 : 1,
                })}
              >
                <Ionicons name="arrow-back" size={20} color="#087F5B" />
                <Text style={{ color: "#087F5B", fontSize: 16, fontWeight: "700" }}>
                  Ở lại
                </Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
      <View
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        style={{ gap: 8 }}
      >
        {[entryKinds.slice(0, 4), entryKinds.slice(4)].map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {row.map((key) => {
              const color = metricColors[key] ?? {
                icon: C.primary,
                background: C.soft,
                border: C.border,
              };
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={kinds[key].label}
                  accessibilityState={{ selected: kind === key }}
                  onPress={() => {
                    setKind(key);
                    setValue("");
                    setSecondary("");
                    setFieldErrors({});
                    setSleepStart("");
                    setSleepEnd("");
                    setSleepDurationOverride("");
                    setManualSleepDurationOpen(false);
                    setNoteOpen(key === "note" || !!note);
                    action.clear();
                  }}
                  style={{
                    width: entryCellWidth,
                    minHeight: 100,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    padding: 8,
                    borderRadius: 17,
                    backgroundColor: color.background,
                    borderWidth: kind === key ? 2 : 1,
                    borderColor: kind === key ? color.icon : color.border,
                  }}
                >
                  <Ionicons
                    name={kindIcons[key]}
                    size={31}
                    color={color.icon}
                  />
                  <Text
                    numberOfLines={2}
                    style={{
                      color: color.icon,
                      fontSize: kind === key ? 14 : 13,
                      lineHeight: 17,
                      textAlign: "center",
                      fontWeight: kind === key ? "700" : "600",
                    }}
                  >
                    {kinds[key].label.replace(" (1–5)", "")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Card style={entryCardStyle}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Icon
            name={kindIcons[kind]}
            size={48}
            tone={palette.background}
            color={palette.icon}
            circular
          />
          <Text style={{ color: palette.icon, fontSize: 20, fontWeight: "700" }}>
            {kinds[kind]?.label.replace(" (1–5)", "")}
          </Text>
        </View>
        {kind === "weight" && (
          <T muted>Theo dõi thay đổi cân nặng của bạn theo thời gian.</T>
        )}
        {kind === "heart_rate" && (
          <T muted>Ghi lại nhịp tim do bạn tự đo; đây không phải chẩn đoán y khoa.</T>
        )}
        {["weight", "water", "heart_rate"].includes(kind) && (
          <NumericField
            label={labels[kind]}
            value={value}
            onChange={(next) => {
              setValue(next);
              clearFieldError("value");
            }}
            error={fieldErrors.value}
            unit={
              kind === "weight"
                ? "kg"
                : kind === "water"
                  ? "ml"
                  : "bpm"
            }
            step={kind === "weight" ? 0.1 : kind === "water" ? 50 : 1}
            placeholder="Nhập giá trị"
          />
        )}
        {kind === "water" && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>Chọn nhanh</Text>
            <Row>
              {[150, 250, 350, 500].map((amount) => (
                <Chip
                  key={amount}
                  title={`${amount} ml`}
                  selected={value === String(amount)}
                  onPress={() => {
                    setValue(String(amount));
                    clearFieldError("value");
                  }}
                />
              ))}
            </Row>
          </View>
        )}
        {kind === "sleep" && (
          <View style={{ gap: 10 }}>
            <T muted>Chọn giờ ngủ và giờ thức dậy để tính tổng thời lượng.</T>
            <Pressable
              accessibilityRole="button"
              onPress={() => setTimePickerTarget("sleepStart")}
              style={dateTimeRowStyle}
            >
              <Ionicons name="moon-outline" size={23} color="#6951B8" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#61746B", fontSize: 13 }}>Giờ bắt đầu ngủ</Text>
                <Text style={dateTimeTextStyle}>{sleepStart || "Chọn giờ"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setTimePickerTarget("sleepEnd")}
              style={dateTimeRowStyle}
            >
              <Ionicons name="sunny-outline" size={23} color="#6951B8" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#61746B", fontSize: 13 }}>Giờ thức dậy</Text>
                <Text style={dateTimeTextStyle}>{sleepEnd || "Chọn giờ"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
            <Text style={{ color: "#20332B", fontSize: 15, fontWeight: "700" }}>
              Tổng thời gian: {recordedSleepMinutes == null ? "—" : formatSleepDuration(recordedSleepMinutes)}
            </Text>
            {!!fieldErrors.sleep && !manualSleepDurationOpen && (
              <Text accessibilityRole="alert" style={{ color: "#C62843", fontSize: 13 }}>
                {fieldErrors.sleep}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: manualSleepDurationOpen }}
              onPress={() => {
                if (manualSleepDurationOpen) {
                  setSleepDurationOverride("");
                  setManualSleepDurationOpen(false);
                  clearFieldError("sleep");
                } else {
                  setManualSleepDurationOpen(true);
                }
              }}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ color: "#287A56", fontSize: 14, fontWeight: "600" }}>
                {manualSleepDurationOpen ? "Dùng thời lượng tự tính" : "Điều chỉnh tổng thời gian"}
              </Text>
            </Pressable>
            {manualSleepDurationOpen && (
              <NumericField
                label="Tổng thời gian ngủ (giờ)"
                value={sleepDurationOverride}
                onChange={(next) => {
                  setSleepDurationOverride(next);
                  clearFieldError("sleep");
                }}
                unit="giờ"
                step={0.5}
                placeholder="Ví dụ: 7,5"
                error={fieldErrors.sleep}
              />
            )}
          </View>
        )}
        {kind === "mood" && (
          <>
            <T>Hôm nay bạn cảm thấy thế nào?</T>
            <Row>
              {["Rất tệ", "Không tốt", "Bình thường", "Tốt", "Rất tốt"].map(
                (label, i) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={`${i + 1}, ${label}`}
                    accessibilityState={{ selected: value === String(i + 1) }}
                    onPress={() => {
                      setValue(String(i + 1));
                      clearFieldError("value");
                    }}
                    style={{
                      minHeight: 72,
                      minWidth: 76,
                      paddingHorizontal: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      borderRadius: 18,
                      backgroundColor:
                        value === String(i + 1) ? palette.background : C.white,
                      borderWidth: value === String(i + 1) ? 2 : 1,
                      borderColor:
                        value === String(i + 1) ? palette.icon : C.border,
                    }}
                  >
                    <Ionicons
                      name={moodLevelIcons[i]}
                      size={24}
                      color={palette.icon}
                    />
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {i + 1} · {label}
                    </Text>
                  </Pressable>
                ),
              )}
            </Row>
            {!!fieldErrors.value && (
              <Text accessibilityRole="alert" style={{ color: "#C62843", fontSize: 13 }}>
                {fieldErrors.value}
              </Text>
            )}
          </>
        )}
        {kind === "blood_pressure" && (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <NumericField
              label="Huyết áp tâm thu (mmHg)"
              value={value}
              onChange={(next) => {
                setValue(next);
                clearFieldError("value");
              }}
              unit="mmHg"
              step={1}
              placeholder="120"
              error={fieldErrors.value}
            />
            <Text style={{ color: C.muted, fontSize: 24, paddingBottom: 12 }}>
              /
            </Text>
            <NumericField
              label="Huyết áp tâm trương (mmHg)"
              value={secondary}
              onChange={(next) => {
                setSecondary(next);
                clearFieldError("secondary");
              }}
              unit="mmHg"
              step={1}
              placeholder="80"
              error={fieldErrors.secondary}
            />
          </View>
        )}
        {latestMetric?.value != null && kind !== "note" && kind !== "sleep" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dùng lại giá trị lần trước"
            onPress={() => {
              setValue(String(latestMetric.value));
              if (kind === "blood_pressure" && latestMetric.secondary != null)
                setSecondary(String(latestMetric.secondary));
            }}
          >
            <Text style={{ color: C.primary, fontSize: 14, fontWeight: "600" }}>
              Lần trước: {metricValue(kind, latestMetric.value, latestMetric.secondary)}{" "}
              {kind === "mood" ? "/ 5" : kinds[kind].unit} · chạm để điền
            </Text>
          </Pressable>
        )}
        {kind !== "note" && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: noteOpen }}
            onPress={() => setNoteOpen(!noteOpen)}
            style={{ minHeight: 40, justifyContent: "center" }}
          >
            <Text style={{ color: C.primary, fontSize: 14, fontWeight: "600" }}>
              {noteOpen ? "− Ẩn ghi chú" : "+ Thêm ghi chú"}
            </Text>
          </Pressable>
        )}
        {(noteOpen || kind === "note") && (
          <Field
            label="Ghi chú"
            placeholder={kind === "note" ? "Hôm nay bạn muốn ghi lại điều gì?" : "Một vài điều về hôm nay…"}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={2000}
            style={kind === "note" ? { minHeight: 120, fontSize: 15, padding: 14 } : undefined}
          />
        )}
      </Card>
      <Card style={entryCardStyle}>
        <Text style={{ color: "#20332B", fontSize: 19, fontWeight: "700" }}>
          Thời điểm ghi nhận
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[
            { id: "now" as const, label: "Bây giờ" },
            { id: "hour" as const, label: "1 giờ trước" },
            { id: "yesterday" as const, label: "Hôm qua" },
          ].map((choice) => {
            const selected = preset === choice.id;
            return (
            <Pressable
              key={choice.id}
              accessibilityRole="button"
              accessibilityLabel={choice.label}
              accessibilityState={{ selected }}
              onPress={() => {
                const now = DateTime.now().setZone(zone);
                const selected =
                  choice.id === "hour"
                    ? now.minus({ minutes: 60 })
                    : choice.id === "yesterday"
                      ? now.minus({ days: 1 })
                      : now;
                setDate(selected.toISODate()!);
                setTime(selected.toFormat("HH:mm"));
                setPreset(choice.id);
                clearFieldError("dateTime");
              }}
              style={{
                minHeight: 44,
                paddingHorizontal: 16,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 22,
                backgroundColor: selected ? "#287A56" : "#FFFFFF",
                borderWidth: 1,
                borderColor: selected ? "#287A56" : "#DFE8E1",
              }}
            >
              <Text style={{ color: selected ? "#FFFFFF" : "#155C43", fontSize: 14, fontWeight: selected ? "700" : "600" }}>
                {choice.label}
              </Text>
            </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setDatePickerOpen(true)}
          style={dateTimeRowStyle}
        >
          <Ionicons name="calendar-outline" size={22} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#61746B", fontSize: 13 }}>Ngày</Text>
            <Text style={dateTimeTextStyle}>
              {date === DateTime.now().setZone(zone).toISODate() ? "Hôm nay, " : ""}
              {DateTime.fromISO(date, { zone: "utc" }).toFormat("dd/MM/yyyy")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTimePickerTarget("record")}
          style={dateTimeRowStyle}
        >
          <Ionicons name="time-outline" size={22} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#61746B", fontSize: 13 }}>Giờ</Text>
            <Text style={dateTimeTextStyle}>{time}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>
        {datePickerOpen && (
          <DatePickerSheet
            visible
            mode="single"
            value={date}
            today={DateTime.now().setZone(zone).toISODate()!}
            maxDate={DateTime.now().setZone(zone).toISODate()!}
            tone={{ deep: "#287A56", soft: "#E8F5EE", border: "#DFE8E1" }}
            title="Chọn ngày ghi nhận"
            onCancel={() => setDatePickerOpen(false)}
            onConfirm={(selected) => {
              if (typeof selected !== "string") return;
              setDate(selected);
              setPreset(null);
              clearFieldError("dateTime");
              setDatePickerOpen(false);
            }}
          />
        )}
        {timePickerTarget && (
          <TimePickerSheet
            key={`${timePickerTarget}-${timePickerTarget === "record" ? time : timePickerTarget === "sleepStart" ? sleepStart : sleepEnd}`}
            visible
            value={timePickerTarget === "record" ? time : timePickerTarget === "sleepStart" ? sleepStart || "22:00" : sleepEnd || "06:00"}
            title={timePickerTarget === "record" ? "Chọn giờ ghi nhận" : timePickerTarget === "sleepStart" ? "Giờ bắt đầu ngủ" : "Giờ thức dậy"}
            tone={{ deep: timePickerTarget === "record" ? "#287A56" : "#6951B8", soft: timePickerTarget === "record" ? "#E8F5EE" : "#EEEBF5", border: "#DFE8E1" }}
            showDayParts={timePickerTarget === "record"}
            onCancel={() => setTimePickerTarget(null)}
            onConfirm={(selected) => {
              if (timePickerTarget === "record") {
                setTime(selected);
                setPreset(null);
                clearFieldError("dateTime");
              } else if (timePickerTarget === "sleepStart") {
                sleepTimesEdited.current = true;
                setSleepTimesChanged(true);
                setSleepStart(selected);
                setSleepDurationOverride("");
                clearFieldError("sleep");
              } else {
                sleepTimesEdited.current = true;
                setSleepTimesChanged(true);
                setSleepEnd(selected);
                setSleepDurationOverride("");
                clearFieldError("sleep");
              }
              setTimePickerTarget(null);
            }}
          />
        )}
        {!!(fieldErrors.dateTime || futureTimeError) && (
          <Text accessibilityRole="alert" style={{ color: "#C62843", fontSize: 14 }}>
            {fieldErrors.dateTime || futureTimeError}
          </Text>
        )}
        <T muted>Thời gian theo {zone}. Không thể chọn thời điểm trong tương lai.</T>
      </Card>
      <Feedback action={action} />
      <Button
        icon="checkmark"
        disabled={action.busy}
        minHeight={56}
        primaryColor="#287A56"
        title={action.busy ? "Đang lưu…" : "Lưu bản ghi"}
        onPress={() =>
          action.run(async () => {
            await saveEntry();
            allowRemoval.current = true;
            savedSuccessfully.current = true;
            router.back();
          }, "Đã lưu bản ghi")
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

const dateTimeRowStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 12,
  minHeight: 64,
  paddingHorizontal: 12,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 14,
  backgroundColor: C.white,
};
const entryCardStyle = {
  padding: 16,
  borderRadius: 17,
  borderColor: "#DFE8E1",
  gap: 14,
};
const dateTimeTextStyle = {
  flex: 1,
  color: C.text,
  fontSize: 16,
  fontWeight: "600" as const,
};

function getSleepDuration(start: string, end: string): number | null {
  const validTime = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const startParts = validTime.exec(start);
  const endParts = validTime.exec(end);
  if (!startParts || !endParts || start === end) return null;
  const startMinutes = Number(startParts[1]) * 60 + Number(startParts[2]);
  const endMinutes = Number(endParts[1]) * 60 + Number(endParts[2]);
  return endMinutes > startMinutes
    ? endMinutes - startMinutes
    : endMinutes + 24 * 60 - startMinutes;
}

function formatSleepDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours ? `${hours} giờ` : ""}${hours && remainder ? " " : ""}${remainder ? `${remainder} phút` : ""}`;
}

function NumericField({
  label,
  value,
  onChange,
  unit,
  step,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  step: number;
  placeholder: string;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const adjust = (direction: -1 | 1) => {
    const current = Number(value.replace(",", ".")) || 0;
    const precision = step % 1 ? 1 : 0;
    onChange(Math.max(0, current + direction * step).toFixed(precision));
  };
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
      <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>
        {label}
      </Text>
      <View
        style={{
          minHeight: 54,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          borderWidth: 1.5,
          borderColor: error ? "#C62843" : focused ? C.primary : C.border,
          borderRadius: 14,
          backgroundColor: C.white,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Giảm ${label}`}
          onPress={() => adjust(-1)}
          style={{ width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="remove-circle-outline" size={23} color={C.primary} />
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#687570"
          keyboardType="decimal-pad"
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            minWidth: 30,
            paddingHorizontal: 4,
            paddingVertical: 8,
            color: C.text,
            fontSize: 22,
            fontWeight: "700",
            textAlign: "center",
          }}
        />
        {!!unit && (
          <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>
            {unit}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tăng ${label}`}
          onPress={() => adjust(1)}
          style={{ width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="add-circle-outline" size={23} color={C.primary} />
        </Pressable>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: "#C62843", fontSize: 13, lineHeight: 18 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
