import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/api";
import { syncReminders } from "../../src/notifications";
import { Occurrence } from "../../src/types";
import { C } from "../../src/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const q = useQuery({
    queryKey: ["reminder-horizon"],
    queryFn: ({ signal }) => api<Occurrence[]>("/occurrences", { signal }),
    refetchInterval: 60000,
  });
  useEffect(() => {
    if (q.data) void syncReminders(q.data).catch(() => {});
  }, [q.data]);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: C.white,
          borderTopColor: "#E9EDE6",
          height: 64 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 9,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 3 },
      }}
    >
      {[
        ["index", "Hôm nay", "leaf-outline"],
        ["journal", "Nhật ký", "book-outline"],
        ["reminders", "Lịch nhắc", "alarm-outline"],
        ["assistant", "Trợ lý", "chatbubble-ellipses-outline"],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon as any} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
