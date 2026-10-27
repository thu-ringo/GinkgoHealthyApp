import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useReducedMotion } from "../src/use-reduced-motion";
import { useAuth } from "../src/api";
import { useOnboardingState } from "../src/onboarding-state";

const screens = [
  {
    title: "Chăm sóc sức khỏe mỗi ngày",
    description:
      "Theo dõi các chỉ số quan trọng để hiểu cơ thể bạn tốt hơn và sống khỏe mạnh hơn.",
    image: require("../assets/onboarding/onboarding_health_daily_art.png"),
    imageLabel: "Người phụ nữ thư giãn ngoài trời cùng các biểu tượng sức khỏe",
  },
  {
    title: "Những thói quen nhỏ, tạo nên thay đổi lớn",
    description:
      "Uống nước đầy đủ, ngủ ngon, theo dõi cân nặng và nhịp tim để xây dựng cuộc sống cân bằng hơn.",
    image: require("../assets/onboarding/onboarding_healthy_habits_art.png"),
    imageLabel: "Điện thoại hiển thị bảng theo dõi các chỉ số sức khỏe",
  },
  {
    title: "Sống khỏe hơn mỗi ngày cùng Ginkgo",
    description:
      "Ghi nhận, theo dõi và duy trì những thói quen tốt để chăm sóc sức khỏe mỗi ngày.",
    image: require("../assets/onboarding/onboarding_ginkgo_lifestyle_art.png"),
    imageLabel: "Người phụ nữ thư giãn trong công viên cùng các thẻ sức khỏe",
  },
];

export default function Onboarding() {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const auth = useAuth();
  const onboarding = useOnboardingState();
  const [pageWidth, setPageWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const [scrollX] = useState(() => new Animated.Value(0));
  const [dotProgress] = useState(() =>
    screens.map((_, index) => new Animated.Value(index === 0 ? 1 : 0)),
  );
  const width = pageWidth || Math.min(windowWidth, 520);
  const pageHeight = Math.max(windowHeight - insets.top - insets.bottom, 480);
  const artHeight = Math.min(Math.max(pageHeight * 0.32, 140), 450);

  const updateIndex = (index: number) => {
    const next = Math.max(0, Math.min(screens.length - 1, index));
    setActiveIndex(next);
    if (reduceMotion) {
      dotProgress.forEach((value, dotIndex) =>
        value.setValue(dotIndex === next ? 1 : 0),
      );
      return;
    }
    Animated.parallel(
      dotProgress.map((value, dotIndex) =>
        Animated.timing(value, {
          toValue: dotIndex === next ? 1 : 0,
          duration: 220,
          useNativeDriver: false,
        }),
      ),
    ).start();
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onboarding.complete();
      router.replace(auth.signedIn ? "/(tabs)" : "/auth");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể lưu trạng thái giới thiệu. Vui lòng thử lại.",
      );
      setBusy(false);
    }
  };

  const goNext = () => {
    if (activeIndex === screens.length - 1) {
      void finish();
      return;
    }
    const next = activeIndex + 1;
    updateIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: !reduceMotion });
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== activeIndex) updateIndex(index);
  };

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      <View
        onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 520,
          alignSelf: "center",
        }}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: "stretch" }}
        >
          {screens.map((screen, index) => (
            <Animated.View
              key={screen.title}
              style={{
                width,
                minHeight: pageHeight,
                paddingHorizontal: 24,
                paddingTop: 8,
                paddingBottom: 14,
                justifyContent: "space-between",
                opacity: reduceMotion
                  ? 1
                  : scrollX.interpolate({
                      inputRange: [
                        (index - 1) * width,
                        index * width,
                        (index + 1) * width,
                      ],
                      outputRange: [0.68, 1, 0.68],
                      extrapolate: "clamp",
                    }),
              }}
            >
              <View style={{ minHeight: 44, alignItems: "flex-end", justifyContent: "center" }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Bỏ qua giới thiệu"
                  disabled={busy}
                  onPress={() => void finish()}
                  style={({ pressed }) => ({
                    minWidth: 64,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed || busy ? 0.65 : 1,
                  })}
                >
                  <Text style={{ color: "#075B45", fontSize: 15, fontWeight: "600" }}>
                    Bỏ qua
                  </Text>
                </Pressable>
              </View>

              <View style={{ gap: 12, paddingTop: 12 }}>
                <Text
                  accessibilityRole="header"
                  style={{
                    color: "#14233D",
                    fontSize: 32,
                    lineHeight: 39,
                    fontWeight: "800",
                    letterSpacing: -0.5,
                  }}
                >
                  {screen.title}
                </Text>
                <Text
                  style={{
                    color: "#355765",
                    fontSize: 16,
                    lineHeight: 24,
                  }}
                >
                  {screen.description}
                </Text>
              </View>

              <View
                style={{
                  width: "100%",
                  height: artHeight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  source={screen.image}
                  accessibilityLabel={screen.imageLabel}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                />
              </View>

              <View style={{ gap: 22 }}>
                <View
                  accessibilityRole="adjustable"
                  accessibilityLabel={`Trang ${index + 1} trong ${screens.length}`}
                  style={{
                    minHeight: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                  }}
                >
                  {screens.map((item, dotIndex) => {
                    const widthAnimation = dotProgress[dotIndex].interpolate({
                      inputRange: [0, 1],
                      outputRange: [9, 22],
                    });
                    const colorAnimation = dotProgress[dotIndex].interpolate({
                      inputRange: [0, 1],
                      outputRange: ["#DCE7E2", "#087F5B"],
                    });
                    return (
                      <Animated.View
                        key={item.title}
                        style={{
                          width: widthAnimation,
                          height: 9,
                          borderRadius: 5,
                          backgroundColor: colorAnimation,
                        }}
                      />
                    );
                  })}
                </View>
                {!!error && (
                  <Text
                    accessibilityRole="alert"
                    style={{
                      color: "#A43C35",
                      fontSize: 13,
                      lineHeight: 19,
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    index === screens.length - 1 ? "Bắt đầu sử dụng Ginkgo" : "Tiếp theo"
                  }
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={goNext}
                  style={({ pressed }) => ({
                    height: 58,
                    width: "100%",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    borderRadius: 29,
                    backgroundColor: "#087F5B",
                    opacity: busy ? 0.65 : 1,
                    transform: [
                      { scale: pressed && !reduceMotion && !busy ? 0.98 : 1 },
                    ],
                  })}
                >
                  <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
                    {busy
                      ? "Đang lưu…"
                      : index === screens.length - 1
                        ? "Bắt đầu"
                        : "Tiếp theo"}
                  </Text>
                  {!busy && (
                    <Ionicons
                      name={index === screens.length - 1 ? "arrow-forward" : "arrow-forward"}
                      size={21}
                      color="#FFFFFF"
                    />
                  )}
                </Pressable>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
