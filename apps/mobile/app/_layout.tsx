import React from "react";
import { Stack } from "expo-router";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useReducedMotion } from "../src/use-reduced-motion";
import { AuthProvider, queryClient, useAuth } from "../src/api";
import { BrandMark, Button, C, Page, Title, T } from "../src/ui";
import {
  OnboardingStateProvider,
  useOnboardingState,
} from "../src/onboarding-state";
function Routes() {
  const a = useAuth();
  const onboarding = useOnboardingState();
  const reducedMotion = useReducedMotion();
  if (!a.ready || onboarding.completed == null)
    return (
      <Page>
        <BrandMark size={64} />
        <Title>{onboarding.error ? "Chưa thể mở Ginkgo" : "Ginkgo"}</Title>
        <T>
          {onboarding.error || "Đang mở không gian của bạn…"}
        </T>
        {!!onboarding.error && (
          <Button title="Thử lại" onPress={onboarding.retry} />
        )}
      </Page>
    );
  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        maxWidth: Platform.OS === "web" ? 680 : undefined,
        alignSelf: "center",
        backgroundColor: C.bg,
      }}
    >
      <Stack
        initialRouteName={
          onboarding.completed
            ? a.signedIn
              ? "(tabs)"
              : "auth"
            : "onboarding"
        }
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Protected guard={onboarding.completed === false}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected
          guard={onboarding.completed === true && !a.signedIn}
        >
          <Stack.Screen name="auth" />
        </Stack.Protected>
        <Stack.Protected
          guard={onboarding.completed === true && a.signedIn}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile" options={{ presentation: "modal" }} />
          <Stack.Screen
            name="entry"
            options={{
              presentation: "modal",
              animation: reducedMotion ? "none" : "slide_from_right",
              animationDuration: reducedMotion ? 0 : 280,
            }}
          />
          <Stack.Screen name="schedule" options={{ presentation: "modal" }} />
          <Stack.Screen name="health-data" />
          <Stack.Screen name="metric" />
          <Stack.Screen name="records" />
          <Stack.Screen
            name="article/[id]"
            options={{
              animation: reducedMotion ? "none" : "slide_from_right",
              animationDuration: 280,
            }}
          />
        </Stack.Protected>
      </Stack>
    </View>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OnboardingStateProvider>
            <StatusBar style="dark" />
            <Routes />
          </OnboardingStateProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
