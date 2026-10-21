import { Platform } from "react-native";
import * as Notifications from "./local-notifications";
import type { Occurrence } from "./types";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
let chain = Promise.resolve();
let generation = 0;
export async function clearReminders() {
  generation++;
  const work = async () => {
    if (Platform.OS !== "web")
      await Notifications.cancelAllScheduledNotificationsAsync().catch(
        () => {},
      );
  };
  const result = chain.then(work, work);
  chain = result;
  await result;
}
export async function syncReminders(rows: Occurrence[], request = false) {
  if (Platform.OS === "web")
    return "Thông báo nhắc cần ứng dụng trên điện thoại.";
  const current = generation;
  const work = async () => {
    if (current !== generation) return "Lịch nhắc đã thay đổi.";
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync("medicines", {
        name: "Nhắc thuốc",
        importance: Notifications.AndroidImportance.HIGH,
      });
    let p = await Notifications.getPermissionsAsync();
    if (!p.granted && request)
      p = await Notifications.requestPermissionsAsync();
    if (!p.granted) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return "Chưa có quyền thông báo. Bạn vẫn có thể xác nhận trong Lịch nhắc.";
    }
    const desired = rows
      .filter(
        (o) => !o.status && !o.cancelled && +new Date(o.due_at) > Date.now(),
      )
      .slice(0, 60);
    const ids = new Set(desired.map((o) => o.id));
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of pending)
      if (!ids.has(n.identifier))
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
    const existing = new Set(pending.map((n) => n.identifier));
    for (const o of desired)
      if (current === generation && !existing.has(o.id))
        await Notifications.scheduleNotificationAsync({
          identifier: o.id,
          content: {
            title: "Đến giờ uống thuốc",
            body: `${o.medicine} · ${o.dose}`,
            data: { occurrenceId: o.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(o.due_at),
            channelId: "medicines",
          },
        });
    return `Đã cập nhật ${desired.length} lần nhắc trên thiết bị (tối đa 60).`;
  };
  const result = chain.then(work, work);
  chain = result.then(
    () => {},
    () => {},
  );
  return result;
}
