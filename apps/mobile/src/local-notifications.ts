// SDK 57's barrel also loads push topic subscriptions, whose native module is
// absent from some Expo Go builds. Keep local reminders independent of push.
// These internal entry points must be rechecked when upgrading Expo SDK.
export { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
export {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
export { cancelAllScheduledNotificationsAsync } from "expo-notifications/build/cancelAllScheduledNotificationsAsync";
export { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
export { getAllScheduledNotificationsAsync } from "expo-notifications/build/getAllScheduledNotificationsAsync";
export { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
export { setNotificationChannelAsync } from "expo-notifications/build/setNotificationChannelAsync";
export { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
export { SchedulableTriggerInputTypes } from "expo-notifications/build/Notifications.types";
