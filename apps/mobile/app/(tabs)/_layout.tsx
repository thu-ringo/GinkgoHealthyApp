import React, { useEffect } from "react";
import { Tabs, usePathname } from "expo-router";
import type { BottomTabBarButtonProps } from "expo-router/build/react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform, Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/api";
import { syncReminders } from "../../src/notifications";
import { Occurrence } from "../../src/types";
import { C } from "../../src/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = [
  ["index", "Hôm nay", "leaf", "leaf-outline"],
  ["journal", "Nhật ký", "book", "book-outline"],
  ["assistant", "Trợ lý", "chatbubble-ellipses", "chatbubble-ellipses-outline"],
  ["reminders", "Lịch nhắc", "alarm", "alarm-outline"],
  ["explore", "Khám phá", "compass", "compass-outline"],
] as const;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const assistantFocused =
    pathname === "/assistant" || pathname.endsWith("/assistant");
  const q = useQuery({
    queryKey: ["reminder-horizon"],
    queryFn: ({ signal }) => api<Occurrence[]>("/occurrences", { signal }),
    refetchInterval: 60000,
  });
  useEffect(() => {
    if (q.data) void syncReminders(q.data).catch(() => {});
  }, [q.data]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarLabelPosition: "below-icon",
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: "#4B5754",
          tabBarStyle: {
            backgroundColor: C.white,
            borderTopWidth: 0,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            height: 62 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 3,
            elevation: 10,
            shadowColor: "#173F30",
            shadowOpacity: 0.1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -3 },
            width: "100%",
            maxWidth: Platform.OS === "web" ? 680 : undefined,
            alignSelf: "center",
            overflow: "visible",
          },
          tabBarItemStyle: { flex: 1, minWidth: 0 },
        }}
      >
        {tabs.map(([name, title, activeIcon, inactiveIcon]) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarLabel: ({ focused }) => (
                <Text
                  numberOfLines={1}
                  style={{
                    color: focused ? C.primary : "#4B5754",
                    fontSize: 12,
                    fontWeight: focused ? "700" : "500",
                    marginTop: name === "assistant" ? -14 : 1,
                  }}
                >
                  {title}
                </Text>
              ),
              tabBarIcon: ({ focused }) =>
                name === "assistant" ? (
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      marginTop: -18,
                      borderRadius: 29,
                      borderWidth: 4,
                      borderColor: C.white,
                      backgroundColor: focused ? "#285F45" : C.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: C.primary,
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 6,
                    }}
                  >
                    <Ionicons
                      name="chatbubble-ellipses"
                      color={C.white}
                      size={26}
                    />
                  </View>
                ) : (
                  <View
                    style={{
                      width: 60,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 18,
                      backgroundColor: focused ? C.soft : "transparent",
                    }}
                  >
                    <Ionicons
                      name={focused ? activeIcon : inactiveIcon}
                      color={focused ? C.primary : "#4B5754"}
                      size={24}
                    />
                  </View>
                ),
              ...(name === "assistant"
                ? {
                    tabBarButton: (props: BottomTabBarButtonProps) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Trợ lý"
                        accessibilityState={{
                          ...props.accessibilityState,
                          selected: assistantFocused,
                        }}
                        onPress={props.onPress}
                        onLongPress={props.onLongPress}
                        style={{
                          flex: 1,
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "visible",
                        }}
                      >
                        {props.children}
                      </Pressable>
                    ),
                  }
                : {}),
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}
