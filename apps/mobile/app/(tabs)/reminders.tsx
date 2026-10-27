import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { router } from "expo-router";
import { DateTime } from "luxon";
import { useQuery } from "@tanstack/react-query";
import { api, changed } from "../../src/api";
import { clearReminders, syncReminders } from "../../src/notifications";
import { Occurrence, Profile, Schedule } from "../../src/types";
import {
  Button,
  Card,
  C,
  Disclosure,
  Empty,
  Feedback,
  BrandHeader,
  H,
  Notice,
  Page,
  State,
  T,
  useAction,
} from "../../src/ui";
import { DateRange } from "../../src/date-range";
import { partOfDay, remindTone, scheduleTone, status } from "../../src/palette";

type LogStatus = "taken" | "skipped";
const skippedDisplay = { fg: "#59635F", bg: "#DDE2DF" };
const cancelledDisplay = { fg: "#365C68", bg: "#E3EEF1" };

function formatRemaining(dueAt: string, now: DateTime) {
  const minutes = Math.max(0, Math.ceil(DateTime.fromISO(dueAt).diff(now, "minutes").minutes));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `Còn ${hours} giờ ${remainingMinutes} phút` : `Còn ${remainingMinutes} phút`;
}

function formatOverdue(dueAt: string, now: DateTime) {
  const minutes = Math.max(0, Math.floor(now.diff(DateTime.fromISO(dueAt), "minutes").minutes));
  if (minutes < 1) return "Đến giờ";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `Quá giờ ${hours} giờ ${rest} phút` : `Quá giờ ${minutes} phút`;
}

function occurrenceTime(occurrence: Occurrence, zone: string) {
  return DateTime.fromISO(occurrence.due_at).setZone(zone).toFormat("HH:mm");
}

function SectionHeading({
  title,
  count,
  background = remindTone.soft,
}: {
  title: string;
  count: number;
  background?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: C.text, fontSize: 20, lineHeight: 28, fontWeight: "700", flex: 1 }}>
        {title}
      </Text>
      <View style={{ minWidth: 36, minHeight: 32, paddingHorizontal: 10, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: background }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>{count}</Text>
      </View>
    </View>
  );
}

function TodayOverview({
  rows,
  dueSoon,
  zone,
  now,
}: {
  rows: Occurrence[];
  dueSoon?: Occurrence;
  zone: string;
  now: DateTime;
}) {
  const eligible = rows.filter((row) => !row.cancelled);
  const taken = eligible.filter((row) => row.status === "taken").length;
  const skipped = eligible.filter((row) => row.status === "skipped").length;
  const complete = taken + skipped;
  const remaining = eligible.length - complete;
  const progress = eligible.length ? complete / eligible.length : 0;
  const dayTitle = now.setLocale("vi").toFormat("cccc, dd/LL/yyyy");

  return (
    <View style={{ minHeight: 180, borderRadius: 28, overflow: "hidden", padding: 20, justifyContent: "space-between" }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 180" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id="reminder-overview" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={remindTone.deep} />
            <Stop offset="1" stopColor="#2BA3AD" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="180" rx="28" fill="url(#reminder-overview)" />
        <Circle cx="370" cy="15" r="70" fill="#FFFFFF" opacity="0.08" />
        <Circle cx="15" cy="175" r="55" fill="#FFFFFF" opacity="0.07" />
        <Rect x="0" y="0" width="400" height="180" rx="28" fill="#000000" opacity="0.32" />
      </Svg>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700", textTransform: "capitalize" }}>
            {dayTitle}
          </Text>
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
            {complete}/{eligible.length} lần đã xong
          </Text>
        </View>
        <View accessibilityLabel={`Tiến độ ${complete} trên ${eligible.length} lần đã xong`} style={{ width: 76, height: 76, alignItems: "center", justifyContent: "center" }}>
          <Svg width={76} height={76} style={{ position: "absolute" }}>
            <Circle cx={38} cy={38} r={31} fill="none" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={7} />
            <Circle
              cx={38}
              cy={38}
              r={31}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 31 * progress} ${2 * Math.PI * 31}`}
              transform="rotate(-90 38 38)"
            />
          </Svg>
          <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "700" }}>{complete}/{eligible.length}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[
          { label: `${taken} đã uống`, icon: "checkmark-circle" as const },
          { label: `${skipped} bỏ qua`, icon: "close-circle" as const },
          { label: `${remaining} còn lại`, icon: "time" as const },
        ].map((chip) => (
          <View key={chip.label} style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)" }}>
            <Ionicons name={chip.icon} size={16} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>{chip.label}</Text>
          </View>
        ))}
      </View>
      {dueSoon && (
        <Text style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
          Tiếp theo {occurrenceTime(dueSoon, zone)} · {dueSoon.medicine} · {formatRemaining(dueSoon.due_at, now)}
        </Text>
      )}
    </View>
  );
}

function LogButton({
  label,
  icon,
  color,
  disabled,
  onPress,
}: {
  label: string;
  icon: "checkmark-circle" | "close-circle";
  color: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 16,
        backgroundColor: color,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color="#FFFFFF" />
      <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function OccurrenceCard({
  occurrence,
  zone,
  now,
  type,
  canConfirm,
  busy,
  onLog,
}: {
  occurrence: Occurrence;
  zone: string;
  now: DateTime;
  type: "due" | "upcoming" | "skipped" | "completed" | "cancelled";
  canConfirm: boolean;
  busy: boolean;
  onLog: (id: string, next: LogStatus) => void;
}) {
  const isDue = type === "due";
  const isUpcoming = type === "upcoming";
  const isSkipped = type === "skipped";
  const tone =
    type === "completed"
      ? status.taken
      : type === "cancelled"
        ? cancelledDisplay
        : isSkipped
          ? skippedDisplay
          : isDue
            ? status.due
            : status.upcoming;
  const stateLabel = occurrence.cancelled
    ? "Đã hủy lịch"
    : occurrence.status === "taken"
      ? "Đã uống"
      : occurrence.status === "skipped"
        ? "Đã bỏ qua"
        : isDue
          ? formatOverdue(occurrence.due_at, now)
          : formatRemaining(occurrence.due_at, now);

  return (
    <View style={{
      overflow: "hidden",
      borderRadius: 20,
      borderWidth: isDue ? 2 : 1,
      borderColor: isDue
        ? status.due.fg
        : tone.fg,
      backgroundColor: isDue
        ? status.due.bg
        : isUpcoming
          ? "#FFFFFF"
          : tone.bg,
    }}>
      {isDue && <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, backgroundColor: status.due.fg }} />}
      <View style={{ padding: 16, paddingLeft: isDue ? 22 : 16, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: isDue ? status.due.fg : tone.fg, fontSize: isDue ? 30 : isUpcoming ? 26 : 20, fontWeight: "700" }}>
              {occurrenceTime(occurrence, zone)}
            </Text>
            <Text style={{ color: C.text, fontSize: isDue ? 20 : isUpcoming ? 18 : 17, fontWeight: "700" }}>
              {occurrence.medicine}
            </Text>
            <Text style={{ color: C.text, fontSize: isDue ? 16 : 15, lineHeight: 21 }}>
              {occurrence.dose}
            </Text>
          </View>
          <View style={{
            width: isDue ? 56 : 44,
            height: isDue ? 56 : 44,
            borderRadius: 28,
            backgroundColor: isDue
              ? status.due.fg
              : tone.fg,
            alignItems: "center",
            justifyContent: "center",
          }}>
            {type === "completed" && occurrence.status === "taken" ? (
              <Ionicons name="checkmark" size={25} color="#FFFFFF" />
            ) : isSkipped ? (
              <Ionicons name="close" size={25} color="#FFFFFF" />
            ) : type === "cancelled" ? (
              <Ionicons name="close" size={24} color="#FFFFFF" />
            ) : isUpcoming ? (
              <Ionicons name="notifications" size={22} color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="pill" size={30} color="#FFFFFF" />
            )}
          </View>
        </View>
        <View style={{ alignSelf: "flex-start", minHeight: 32, paddingHorizontal: 10, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: tone.bg }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>
            {type === "completed" ? stateLabel : isUpcoming ? stateLabel : stateLabel}
          </Text>
        </View>
        {isDue && (
          canConfirm ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <LogButton label="Đã uống" icon="checkmark-circle" color={status.taken.fg} disabled={busy} onPress={() => onLog(occurrence.id, "taken")} />
              <LogButton label="Bỏ qua" icon="close-circle" color={status.skipped.fg} disabled={busy} onPress={() => onLog(occurrence.id, "skipped")} />
            </View>
          ) : (
            <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>Chưa đến giờ xác nhận</Text>
          )
        )}
        {isUpcoming && (
          <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>Chưa đến giờ xác nhận</Text>
        )}
      </View>
    </View>
  );
}

function TodayDoses({
  rows,
  queryUpdatedAt,
  zone,
  now,
  busy,
  onLog,
}: {
  rows: Occurrence[];
  queryUpdatedAt: number;
  zone: string;
  now: DateTime;
  busy: boolean;
  onLog: (id: string, next: LogStatus) => void;
}) {
  const active = rows.filter((row) => !row.cancelled && !row.status);
  const due = active
    .filter((row) => DateTime.fromISO(row.due_at).setZone(zone) <= now)
    .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at));
  const upcoming = active
    .filter((row) => DateTime.fromISO(row.due_at).setZone(zone) > now)
    .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at));
  const skipped = rows
    .filter((row) => row.status === "skipped" && !row.cancelled)
    .sort((a, b) => +new Date(b.due_at) - +new Date(a.due_at));
  const completed = rows
    .filter((row) => !row.cancelled && row.status === "taken")
    .sort((a, b) => +new Date(b.due_at) - +new Date(a.due_at));
  const cancelled = rows
    .filter((row) => row.cancelled)
    .sort((a, b) => +new Date(b.due_at) - +new Date(a.due_at));
  const canConfirm = (row: Occurrence) => +new Date(row.due_at) <= queryUpdatedAt + 60_000;

  return (
    <View style={{ gap: 18 }}>
      {due.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionHeading title="Cần uống ngay" count={due.length} background={status.due.bg} />
          {due.map((row) => (
            <OccurrenceCard key={row.id} occurrence={row} zone={zone} now={now} type="due" canConfirm={canConfirm(row)} busy={busy} onLog={onLog} />
          ))}
        </View>
      )}
      {upcoming.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionHeading title="Sắp tới hôm nay" count={upcoming.length} background={status.upcoming.bg} />
          {upcoming.map((row) => (
            <OccurrenceCard key={row.id} occurrence={row} zone={zone} now={now} type="upcoming" canConfirm={false} busy={busy} onLog={onLog} />
          ))}
        </View>
      )}
      {skipped.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionHeading title="Đã bỏ qua" count={skipped.length} background={skippedDisplay.bg} />
          {skipped.map((row) => (
            <OccurrenceCard key={row.id} occurrence={row} zone={zone} now={now} type="skipped" canConfirm={false} busy={busy} onLog={onLog} />
          ))}
        </View>
      )}
      {completed.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionHeading title="Đã hoàn thành" count={completed.length} background={status.taken.bg} />
          {completed.map((row) => (
            <OccurrenceCard key={row.id} occurrence={row} zone={zone} now={now} type="completed" canConfirm={false} busy={busy} onLog={onLog} />
          ))}
        </View>
      )}
      {cancelled.length > 0 && (
        <View style={{ gap: 10 }}>
          <SectionHeading title="Đã hủy lịch" count={cancelled.length} background={cancelledDisplay.bg} />
          {cancelled.map((row) => (
            <OccurrenceCard key={row.id} occurrence={row} zone={zone} now={now} type="cancelled" canConfirm={false} busy={busy} onLog={onLog} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function Reminders() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Profile>("/me") });
  const zone = me.data?.timezone || "Asia/Ho_Chi_Minh";
  const today = DateTime.now().setZone(zone).toISODate()!;
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rangeMode, setRangeMode] = useState<"today" | "last30days" | "custom">("today");
  const [scheduleFilter, setScheduleFilter] = useState<"active" | "cancelled">("active");
  const [cancelSchedule, setCancelSchedule] = useState<Schedule | null>(null);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"doses" | "schedules">("doses");
  const [nowValue, setNowValue] = useState(() => DateTime.now().toMillis());
  const now = DateTime.fromMillis(nowValue).setZone(zone);
  const activeFrom =
    rangeMode === "today"
      ? today
      : rangeMode === "last30days"
        ? DateTime.fromISO(today, { zone: "utc" }).minus({ days: 29 }).toISODate()!
        : from;
  const activeTo = rangeMode === "custom" ? to : today;
  const isToday = rangeMode === "today";
  useEffect(() => {
    const timer = setInterval(() => setNowValue(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const schedules = useQuery({
    queryKey: ["schedules"],
    queryFn: ({ signal }) => api<Schedule[]>("/schedules", { signal }),
  });
  const occurrences = useQuery({
    queryKey: ["occurrences", activeFrom, activeTo, zone],
    queryFn: ({ signal }) =>
      api<Occurrence[]>(`/occurrences?from=${activeFrom}&to=${activeTo}`, { signal }),
    refetchInterval: 30000,
  });
  const action = useAction();
  const todayRows = (occurrences.data || []).filter(
    (row) => DateTime.fromISO(row.due_at).setZone(zone).toISODate() === today,
  );
  const nextOccurrence = todayRows
    .filter((row) => !row.cancelled && !row.status && DateTime.fromISO(row.due_at).setZone(zone) > now)
    .sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at))[0];
  const historySections = useMemo(() => {
    const byDate = new Map<string, Occurrence[]>();
    for (const occurrence of occurrences.data ?? []) {
      const date = DateTime.fromISO(occurrence.due_at).setZone(zone).toISODate()!;
      const rows = byDate.get(date) ?? [];
      rows.push(occurrence);
      byDate.set(date, rows);
    }
    return [...byDate.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([date, data]) => ({
        date,
        data: data.sort((left, right) => +new Date(left.due_at) - +new Date(right.due_at)),
      }));
  }, [occurrences.data, zone]);
  const scheduleRows = schedules.data ?? [];
  const activeSchedules = scheduleRows.filter((schedule) => schedule.active);
  const cancelledSchedules = scheduleRows.filter((schedule) => !schedule.active);
  const visibleSchedules = scheduleFilter === "active" ? activeSchedules : cancelledSchedules;

  const logOccurrence = (id: string, next: LogStatus) => {
    void action.run(
      async () => {
        await api(`/occurrences/${id}/log`, {
          method: "POST",
          body: { status: next },
        });
        await changed();
      },
      next === "taken" ? "Đã ghi nhận uống thuốc" : "Đã ghi nhận bỏ qua",
    );
  };

  const pageHeader = (
    <>
      <BrandHeader
        title="Lịch nhắc"
        subtitle="Nhớ đúng giờ, theo hướng dẫn của bạn."
      />
      <View style={{ flexDirection: "row", gap: 8, padding: 4, borderRadius: 28, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: C.border }}>
        {[
          { id: "doses" as const, label: "Lần uống", icon: "alarm" as const, tone: remindTone.deep },
          { id: "schedules" as const, label: "Lịch thuốc", icon: "calendar" as const, tone: scheduleTone.deep },
        ].map((item) => {
          const selected = tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => setTab(item.id)}
              style={{
                flex: 1,
                minHeight: 56,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 24,
                backgroundColor: selected ? item.tone : "#FFFFFF",
              }}
            >
              {item.id === "schedules" ? (
                <MaterialCommunityIcons name="pill" size={24} color={selected ? "#FFFFFF" : C.text} />
              ) : (
                <Ionicons name={item.icon} size={24} color={selected ? "#FFFFFF" : C.text} />
              )}
              <Text style={{ color: selected ? "#FFFFFF" : C.text, fontSize: 16, fontWeight: "700" }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Feedback action={action} />
    </>
  );
  const dateRange = (
    <DateRange
      from={activeFrom}
      to={activeTo}
      variant="reminders"
      selectedMode={rangeMode}
      onModeChange={(mode) => {
        if (mode === "today" || mode === "last30days" || mode === "custom")
          setRangeMode(mode);
      }}
      today={today}
      maxDays={90}
      tone={remindTone.deep}
      soft={remindTone.soft}
      border={remindTone.border}
      onChange={(nextFrom, nextTo) => {
        setFrom(nextFrom);
        setTo(nextTo);
      }}
      presets={[
        { label: "Hôm nay", from: today, to: today },
        {
          label: "30 ngày",
          from: DateTime.fromISO(today, { zone: "utc" }).minus({ days: 29 }).toISODate()!,
          to: today,
        },
      ]}
    />
  );

  if (tab === "doses" && !isToday) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: C.bg }}>
        <SectionList
          sections={historySections}
          keyExtractor={(item) => item.id}
          initialNumToRender={12}
          windowSize={7}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ width: "100%", maxWidth: 720, alignSelf: "center", padding: 20, gap: 12 }}
          ListHeaderComponent={
            <View style={{ gap: 16, marginBottom: 4 }}>
              {pageHeader}
              {dateRange}
              <Card>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>
                  {occurrences.data?.length ?? 0} lần uống trong khoảng ngày
                </Text>
                <Text style={{ color: C.text, fontSize: 14, marginTop: 4 }}>
                  {occurrences.data?.filter((row) => row.status === "taken").length ?? 0}/{occurrences.data?.length ?? 0} lần đã uống
                </Text>
              </Card>
              {occurrences.isPending && <ActivityIndicator color={remindTone.deep} />}
              {occurrences.error && (
                <Card>
                  <Notice error message={occurrences.error.message} />
                  <Button secondary title="Thử tải lại" onPress={() => occurrences.refetch()} />
                </Card>
              )}
            </View>
          }
          renderSectionHeader={({ section }) => {
            const day = DateTime.fromISO(section.date, { zone: "utc" });
            return (
              <View style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: remindTone.soft, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: C.text, fontSize: 17, fontWeight: "700", textTransform: "capitalize" }}>
                  {day.setLocale("vi").toFormat("cccc, dd/LL/yyyy")}
                </Text>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>{section.data.length} lần uống</Text>
              </View>
            );
          }}
          renderItem={({ item }) => {
            const due = DateTime.fromISO(item.due_at).setZone(zone);
            const complete = item.cancelled || item.status !== null;
            const canLog = !complete && due.toMillis() <= occurrences.dataUpdatedAt + 60_000;
            const stateTone = item.cancelled
              ? status.cancelled
              : item.status === "taken"
                ? status.taken
                : item.status === "skipped"
                  ? skippedDisplay
                  : canLog
                    ? status.due
                    : status.upcoming;
            const stateLabel = item.cancelled
              ? "Đã hủy lịch"
              : item.status === "taken"
                ? "Đã uống"
                : item.status === "skipped"
                  ? "Đã bỏ qua"
                  : canLog
                    ? formatOverdue(item.due_at, now)
                    : "Chưa đến giờ xác nhận";
            return (
              <Card key={item.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ color: remindTone.deep, fontSize: 22, fontWeight: "700", minWidth: 58 }}>
                    {due.toFormat("HH:mm")}
                  </Text>
                  <View style={{ flex: 1, gap: 3 }}>
                    <H>{item.medicine}</H>
                    <Text style={{ color: C.text, fontSize: 15 }}>{item.dose}</Text>
                  </View>
                  <View style={{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: stateTone.bg }}>
                    <Text style={{ color: stateTone.fg, fontSize: 13, fontWeight: "700" }}>{stateLabel}</Text>
                  </View>
                </View>
                {canLog ? (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {([
                      { label: "Đã uống", next: "taken" as const, color: status.taken.fg, icon: "checkmark-circle" as const },
                      { label: "Bỏ qua", next: "skipped" as const, color: status.skipped.fg, icon: "close-circle" as const },
                    ]).map((button) => (
                      <LogButton
                        key={button.next}
                        label={button.label}
                        icon={button.icon}
                        color={button.color}
                        disabled={action.busy}
                        onPress={() => logOccurrence(item.id, button.next)}
                      />
                    ))}
                  </View>
                ) : null}
              </Card>
            );
          }}
          ListEmptyComponent={
            !occurrences.isPending && !occurrences.error ? (
              <Empty
                title="Chưa có lần uống trong khoảng này"
                description="Tạo lịch thuốc hoặc chọn khoảng ngày khác để xem các lần uống."
                icon="alarm-outline"
                action={<Button title="Tạo lịch đầu tiên" onPress={() => router.push("/schedule")} accent={remindTone.deep} />}
              />
            ) : null
          }
          ListFooterComponent={
            <View style={{ gap: 12, marginTop: 12 }}>
              <Disclosure title="Thông báo trên thiết bị" subtitle="Cấp quyền và cập nhật nhắc thuốc" icon="notifications-outline">
                <T muted>
                  Nhắc cục bộ trong 14 ngày tới, tối đa 60 lần. Mở app thường xuyên và kết nối lại sau khi sửa lịch từ thiết bị khác.
                </T>
                <Button secondary title="Bật / cập nhật thông báo" disabled={action.busy} onPress={() => action.run(async () => {
                  const all = await api<Occurrence[]>("/occurrences");
                  setNotice(await syncReminders(all, true));
                }, "")} />
                {!!notice && <Notice message={notice} />}
              </Disclosure>
              <T muted>Chỉ xác nhận khi đã uống. Không tự đổi liều hoặc uống bù dựa trên ứng dụng.</T>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <Page>
      {pageHeader}
      {tab === "doses" ? (
        <>
          {dateRange}
          {isToday ? (
            <State query={occurrences}>
              {!todayRows.length ? (
                <Empty
                  title="Chưa có lần uống trong ngày"
                  description="Tạo lịch thuốc để ghi nhận các lần uống trong ngày."
                  icon="alarm"
                  action={
                    <Button
                      title="Tạo lịch đầu tiên"
                      icon="add-circle"
                      accent={remindTone.deep}
                      onPress={() => router.push("/schedule")}
                    />
                  }
                />
              ) : (
                <>
                  <TodayOverview rows={todayRows} dueSoon={nextOccurrence} zone={zone} now={now} />
                  <TodayDoses
                    rows={todayRows}
                    queryUpdatedAt={occurrences.dataUpdatedAt}
                    zone={zone}
                    now={now}
                    busy={action.busy}
                    onLog={logOccurrence}
                  />
                </>
              )}
            </State>
          ) : (
            <State query={occurrences}>
              {!occurrences.data?.length && (
                <Empty
                  title="Chưa có lần uống trong khoảng này"
                  description="Tạo lịch thuốc hoặc chọn khoảng ngày khác để xem các lần uống."
                  icon="alarm-outline"
                  action={
                    <Button
                      title="Tạo lịch đầu tiên"
                      onPress={() => router.push("/schedule")}
                      accent={remindTone.deep}
                    />
                  }
                />
              )}
              {occurrences.data?.map((occurrence) => (
                <View key={occurrence.id} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ width: 58, paddingTop: 18, alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: 19, fontWeight: "700", color: C.primary }}>
                      {occurrenceTime(occurrence, zone)}
                    </Text>
                    <T muted>
                      {DateTime.fromISO(occurrence.due_at).setZone(zone).toFormat("dd/MM")}
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
                        <H>{occurrence.medicine}</H>
                        <T muted>{occurrence.dose}</T>
                      </View>
                      {occurrence.cancelled || occurrence.status ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <Ionicons
                            name={
                              occurrence.status === "taken"
                                ? "checkmark"
                                : "remove-outline"
                            }
                            size={24}
                            color={occurrence.status === "taken" ? C.primary : C.muted}
                          />
                          <Text
                            style={{
                              color:
                                occurrence.status === "taken" ? C.primary : C.muted,
                              fontSize: 14,
                              fontWeight: "600",
                            }}
                          >
                            {occurrence.cancelled
                              ? "Đã hủy lịch"
                              : occurrence.status === "taken"
                                ? "Đã uống"
                                : "Đã bỏ qua"}
                          </Text>
                        </View>
                      ) : +new Date(occurrence.due_at) > occurrences.dataUpdatedAt + 60_000 ? (
                        <T>Chưa đến giờ xác nhận</T>
                      ) : (
                        <View style={{ gap: 8 }}>
                          <Button
                            icon="checkmark"
                            title="Đã uống"
                            disabled={action.busy}
                            onPress={() => logOccurrence(occurrence.id, "taken")}
                          />
                          <Button
                            secondary
                            title="Bỏ qua lần này"
                            disabled={action.busy}
                            onPress={() => logOccurrence(occurrence.id, "skipped")}
                          />
                        </View>
                      )}
                    </Card>
                  </View>
                </View>
              ))}
            </State>
          )}
        </>
      ) : (
        <>
          <View style={{ minHeight: 112, justifyContent: "center", padding: 18, borderRadius: 24, overflow: "hidden" }}>
            <Svg width="100%" height="100%" viewBox="0 0 400 112" preserveAspectRatio="none" style={{ position: "absolute", top: 0, left: 0 }}>
              <Defs>
                <LinearGradient id="schedule-overview" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={scheduleTone.deep} />
                  <Stop offset="1" stopColor="#6B75E0" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="400" height="112" rx="24" fill="url(#schedule-overview)" />
              <Circle cx="370" cy="8" r="58" fill="#FFFFFF" opacity="0.1" />
            </Svg>
            <Text style={{ color: "#FFFFFF", fontSize: 20, lineHeight: 28, fontWeight: "700" }}>
              {activeSchedules.length} lịch đang theo dõi · {activeSchedules.reduce((sum, item) => sum + item.times.length, 0)} lần/ngày
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thêm lịch thuốc"
            onPress={() => router.push("/schedule")}
            style={{ minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 28, backgroundColor: scheduleTone.deep }}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Thêm lịch thuốc</Text>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8, padding: 4, borderRadius: 20, backgroundColor: scheduleTone.soft }}>
            {[
              { id: "active" as const, label: `Đang theo dõi (${activeSchedules.length})` },
              { id: "cancelled" as const, label: `Đã hủy (${cancelledSchedules.length})` },
            ].map((item) => {
              const selected = scheduleFilter === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  onPress={() => setScheduleFilter(item.id)}
                  style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: selected ? scheduleTone.deep : "transparent" }}
                >
                  <Text style={{ color: selected ? "#FFFFFF" : C.text, fontSize: 14, fontWeight: "700" }}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <State query={schedules}>
            {!visibleSchedules.length && (
              <Empty
                title={scheduleFilter === "active" ? "Chưa có lịch thuốc đang theo dõi" : "Chưa có lịch thuốc đã hủy"}
                description={scheduleFilter === "active" ? "Thêm tên thuốc, hướng dẫn đã được kê và giờ uống." : "Các lịch thuốc đã hủy sẽ xuất hiện tại đây."}
                icon="calendar-outline"
              />
            )}
            {visibleSchedules.map((schedule) => (
              <View key={schedule.id} style={{ padding: 16, gap: 14, borderRadius: 24, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: scheduleTone.border }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: scheduleTone.deep, alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name="pill" size={30} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text accessibilityRole="header" style={{ color: C.text, fontSize: 20, fontWeight: "700" }}>{schedule.medicine}</Text>
                    <Text style={{ color: C.text, fontSize: 15 }}>{schedule.dose}</Text>
                  </View>
                  <Text style={{ color: schedule.active ? status.taken.fg : status.cancelled.fg, backgroundColor: schedule.active ? status.taken.bg : status.cancelled.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, fontWeight: "700" }}>
                    {schedule.active ? "Đang theo dõi" : "Đã hủy"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {schedule.times.map((time) => {
                    const timeTone = partOfDay(time);
                    return (
                      <View key={time} style={{ minHeight: 42, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 12, borderRadius: 16, backgroundColor: timeTone.bg }}>
                        <Ionicons name={timeTone.icon} size={19} color={timeTone.fg} />
                        <Text style={{ color: timeTone.fg, fontSize: 16, fontWeight: "700" }}>{time}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label, index) => {
                    const selected = schedule.weekdays.includes(index + 1);
                    return (
                      <View key={label} style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: selected ? scheduleTone.deep : "#FFFFFF", borderWidth: selected ? 0 : 1, borderColor: scheduleTone.border }}>
                        <Text style={{ color: selected ? "#FFFFFF" : C.text, fontSize: 12, fontWeight: "700" }}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                  <Ionicons name="calendar-outline" size={19} color={scheduleTone.deep} />
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>
                    Từ {DateTime.fromISO(schedule.start_date, { zone: "utc" }).toFormat("dd/MM/yyyy")}
                    {schedule.end_date ? ` · Đến ${DateTime.fromISO(schedule.end_date, { zone: "utc" }).toFormat("dd/MM/yyyy")}` : " · Không kết thúc"}
                  </Text>
                </View>
                {schedule.active && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Sửa lịch thuốc ${schedule.medicine}`}
                      onPress={() => router.push({ pathname: "/schedule", params: { record: JSON.stringify(schedule) } })}
                      style={{ flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 16, backgroundColor: scheduleTone.soft }}
                    >
                      <Ionicons name="create-outline" size={20} color={scheduleTone.deep} />
                      <Text style={{ color: scheduleTone.deep, fontSize: 15, fontWeight: "700" }}>Sửa lịch</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Hủy lịch thuốc ${schedule.medicine}`}
                      accessibilityState={{ disabled: action.busy }}
                      disabled={action.busy}
                      onPress={() => setCancelSchedule(schedule)}
                      style={{ flex: 1, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 16, borderWidth: 1, borderColor: status.skipped.fg }}
                    >
                      <Ionicons name="close-circle-outline" size={20} color={status.skipped.fg} />
                      <Text style={{ color: status.skipped.fg, fontSize: 15, fontWeight: "700" }}>Hủy lịch</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </State>
        </>
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
        Chỉ xác nhận khi đã uống. Không tự đổi liều hoặc uống bù dựa trên ứng dụng.
      </T>
      <Modal
        visible={Boolean(cancelSchedule)}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelSchedule(null)}
      >
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(22, 34, 31, 0.45)" }}>
          <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", padding: 22, gap: 14, borderRadius: 24, backgroundColor: "#FFFFFF" }}>
            <Text accessibilityRole="header" style={{ color: C.text, fontSize: 21, fontWeight: "700" }}>Hủy lịch thuốc?</Text>
            <Text style={{ color: C.text, fontSize: 16, lineHeight: 23 }}>
              Lịch “{cancelSchedule?.medicine}” sẽ ngừng tạo các lần nhắc tiếp theo. Lịch sử đã ghi nhận vẫn được giữ.
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Giữ lịch thuốc"
                onPress={() => setCancelSchedule(null)}
                style={{ flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 16, borderWidth: 1, borderColor: C.border }}
              >
                <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>Giữ lịch</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xác nhận hủy lịch thuốc"
                accessibilityState={{ disabled: action.busy }}
                disabled={action.busy}
                onPress={() => {
                  if (!cancelSchedule) return;
                  const target = cancelSchedule;
                  void action.run(async () => {
                    await api(`/schedules/${target.id}`, { method: "DELETE" });
                    await clearReminders();
                    await changed();
                    setCancelSchedule(null);
                  }, "Đã hủy lịch và cập nhật nhắc trên thiết bị");
                }}
                style={{ flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: status.skipped.fg, opacity: action.busy ? 0.55 : 1 }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Xác nhận hủy</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Page>
  );
}
