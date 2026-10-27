import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

type OnboardingState = {
  completed: boolean | null;
  error: string;
  retry: () => void;
  complete: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingState | null>(null);
const STORAGE_KEY = "ginkgo.onboarding.completed";

async function loadCompleted(): Promise<boolean> {
  const value =
    Platform.OS === "web"
      ? typeof window === "undefined"
        ? null
        : window.localStorage.getItem(STORAGE_KEY)
      : await SecureStore.getItemAsync(STORAGE_KEY);
  return value === "true";
}

async function saveCompleted(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window === "undefined")
      throw new Error("Không thể lưu trạng thái giới thiệu trên trình duyệt này.");
    window.localStorage.setItem(STORAGE_KEY, "true");
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, "true");
}

export function OnboardingStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadCompleted()
      .then((value) => {
        if (!active) return;
        setCompleted(value);
        setError("");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Không thể đọc trạng thái giới thiệu.",
        );
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setCompleted(null);
    setError("");
    setAttempt((value) => value + 1);
  }, []);

  const complete = useCallback(async () => {
    await saveCompleted();
    setCompleted(true);
    setError("");
  }, []);

  return (
    <OnboardingContext.Provider value={{ completed, error, retry, complete }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingState(): OnboardingState {
  const state = useContext(OnboardingContext);
  if (!state)
    throw new Error("OnboardingStateProvider is required for onboarding routes.");
  return state;
}
