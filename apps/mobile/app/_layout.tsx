import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, queryClient, useAuth } from "../src/api";
import { BrandMark, C, Page, Title, T } from "../src/ui";
function Routes() {
  const a = useAuth();
  if (!a.ready)
    return (
      <Page>
        <BrandMark size={64} />
        <Title>Ginkgo</Title>
        <T>Đang mở không gian của bạn…</T>
      </Page>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Protected guard={!a.signedIn}>
        <Stack.Screen name="auth" />
      </Stack.Protected>
      <Stack.Protected guard={a.signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="entry" options={{ presentation: "modal" }} />
        <Stack.Screen name="schedule" options={{ presentation: "modal" }} />
        <Stack.Screen name="health-data" />
        <Stack.Screen name="metric" />
      </Stack.Protected>
    </Stack>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Routes />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
