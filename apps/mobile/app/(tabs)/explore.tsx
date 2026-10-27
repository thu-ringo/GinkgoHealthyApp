import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Linking,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { articles } from "../../src/articles";
import { BrandHeader } from "../../src/ui";
import { useReducedMotion } from "../../src/use-reduced-motion";

const palette = {
  dark: "#073F36",
  green: "#087B57",
  secondary: "#62817D",
  mint: "#EAF7F3",
  mintCard: "#EDF8F5",
  border: "#DFECE8",
  yellow: "#FFD75A",
  paleYellow: "#FFF0C7",
  badge: "#80520B",
  white: "#FFFFFF",
};

const topics = [
  { id: "Dinh dưỡng", icon: "food-apple" as const },
  { id: "Vận động", icon: "run" as const },
  { id: "Giấc ngủ", icon: "sleep" as const },
  { id: "Tinh thần", icon: "head-heart" as const },
];

function AnimatedArticleCard({
  children,
  reduceMotion,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: React.ReactNode;
  reduceMotion: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  style: object;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const animateTo = (value: number) => {
    Animated.timing(scale, {
      toValue: value,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={() => {
          if (!reduceMotion) animateTo(0.985);
        }}
        onPressOut={() => {
          if (!reduceMotion) animateTo(1);
        }}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function Explore() {
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [bellRotation] = useState(() => new Animated.Value(0));
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [ginkgoLinkError, setGinkgoLinkError] = useState("");
  const query = search.trim().toLocaleLowerCase("vi");
  const filteredArticles = useMemo(
    () =>
      articles.filter((article) => {
        const matchesTopic = !selectedTopic || article.category === selectedTopic;
        const searchable = [
          article.title,
          article.category,
          article.intro,
          ...article.parts.flatMap((part) => [
            part.heading,
            ...part.paragraphs,
            ...(part.bullets || []),
          ]),
        ]
          .join(" ")
          .toLocaleLowerCase("vi");
        return matchesTopic && (!query || searchable.includes(query));
      }),
    [query, selectedTopic],
  );
  const featured = filteredArticles.find((article) => article.id === "balanced-diet");
  const dailyArticles = filteredArticles.filter((article) => article.id !== "balanced-diet");
  const maxContentWidth = Math.min(screenWidth, 680);
  const tileWidth = (maxContentWidth - 32 - 12) / 2;
  const articleCardWidth = (maxContentWidth - 32 - 12) / 2;

  useEffect(() => {
    if (reduceMotion) {
      bellRotation.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bellRotation, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(bellRotation, {
          toValue: -1,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(bellRotation, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.delay(2600),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [bellRotation, reduceMotion]);
  const bellRotate = bellRotation.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-12deg", "12deg"],
  });

  const openArticle = (id: string) => router.push(`/article/${id}`);
  const clearFilters = () => {
    setSearch("");
    setSelectedTopic("");
  };
  const openGinkgoReference = () => {
    setGinkgoLinkError("");
    void Linking.openURL("https://www.nccih.nih.gov/health/ginkgo").catch(() =>
      setGinkgoLinkError("Không thể mở nguồn tham khảo trên thiết bị này."),
    );
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: palette.white }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 28,
          gap: 0,
        }}
      >
        <BrandHeader
          title="Khám phá"
          subtitle="Kiến thức nhỏ, sức khỏe tốt hơn mỗi ngày"
          action={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mở lịch nhắc"
              onPress={() => router.push("/reminders")}
              style={{
                width: 56,
                height: 56,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
                <Ionicons name="notifications" size={28} color={palette.dark} />
              </Animated.View>
              <View
                style={{
                  position: "absolute",
                  right: 10,
                  top: 9,
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: palette.yellow,
                }}
              />
            </Pressable>
          }
        />

        <View
          style={{
            minHeight: 50,
            marginTop: 18,
            paddingHorizontal: 18,
            borderRadius: 30,
            backgroundColor: palette.mint,
            borderWidth: 1,
            borderColor: palette.border,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Ionicons name="search" size={23} color={palette.secondary} />
          <TextInput
            accessibilityLabel="Tìm bài viết hoặc chủ đề sức khỏe"
            placeholder="Tìm bài viết, chủ đề sức khỏe"
            placeholderTextColor={palette.secondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            style={{
              flex: 1,
              minHeight: 48,
              color: palette.dark,
              fontSize: 16,
            }}
          />
          {!!search && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa nội dung tìm kiếm"
              onPress={() => setSearch("")}
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="close-circle" size={20} color={palette.secondary} />
            </Pressable>
          )}
        </View>

        <View accessibilityLabel="Danh mục sức khỏe" style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
          {topics.map((topic) => {
            const selected = selectedTopic === topic.id;
            return (
              <Pressable
                key={topic.id}
                accessibilityRole="button"
                accessibilityLabel={`Danh mục ${topic.id}`}
                accessibilityState={{ selected }}
                onPress={() => setSelectedTopic(selected ? "" : topic.id)}
                style={{
                  width: tileWidth,
                  minHeight: 104,
                  borderRadius: 18,
                  borderWidth: selected ? 2 : 1,
                  borderColor: palette.green,
                  backgroundColor: palette.mintCard,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 12,
                  paddingHorizontal: 14,
                }}
              >
                <View style={{ width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: selected ? "#D8EEE6" : "#DDF1E9" }}>
                <MaterialCommunityIcons
                  name={topic.icon}
                  size={38}
                  color={topic.id === "Giấc ngủ" ? "#8B6800" : palette.dark}
                />
                </View>
                <Text
                  numberOfLines={2}
                  style={{ flex: 1, color: palette.dark, fontSize: 16, lineHeight: 20, fontWeight: "700" }}
                >
                  {topic.id}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {featured && (
          <AnimatedArticleCard
            reduceMotion={reduceMotion}
            onPress={() => openArticle(featured.id)}
            accessibilityLabel={`Mở bài viết nổi bật: ${featured.title}`}
            style={{
              minHeight: 224,
              marginTop: 20,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: palette.border,
              overflow: "hidden",
              backgroundColor: "#F9F5EB",
            }}
          >
            <Image
              source={featured.image}
              resizeMode="cover"
              style={{ position: "absolute", width: "100%", height: "100%" }}
              accessibilityLabel="Món ăn cân bằng với rau xanh, cá và cơm"
            />
            <Svg
              pointerEvents="none"
              width="100%"
              height="100%"
              viewBox="0 0 400 224"
              preserveAspectRatio="none"
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              <Defs>
                <LinearGradient id="featured-copy-fade" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.98" />
                  <Stop offset="0.65" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="330" height="224" fill="url(#featured-copy-fade)" />
            </Svg>
            <View
              style={{
                position: "absolute",
                left: 18,
                top: 16,
                bottom: 16,
                width: "64%",
                justifyContent: "center",
                gap: 9,
              }}
            >
              <View
                style={{
                  alignSelf: "flex-start",
                  minHeight: 32,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  paddingHorizontal: 12,
                  borderRadius: 18,
                  backgroundColor: palette.paleYellow,
                }}
              >
                <Ionicons name="book" size={16} color={palette.badge} />
                <Text style={{ color: palette.badge, fontSize: 12, fontWeight: "700" }}>
                  NÊN ĐỌC
                </Text>
              </View>
              <Text
                numberOfLines={4}
                style={{
                  color: palette.dark,
                  fontSize: 23,
                  lineHeight: 29,
                  fontWeight: "700",
                }}
              >
                {featured.title}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Ionicons name="time-outline" size={17} color={palette.secondary} />
                <Text style={{ color: palette.secondary, fontSize: 14 }}>
                  {featured.readingTime}
                </Text>
              </View>
            </View>
          </AnimatedArticleCard>
        )}

        <View style={{ marginTop: 30, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text
              accessibilityRole="header"
              style={{ color: palette.dark, fontSize: 25, fontWeight: "700" }}
            >
              Sức khỏe mỗi ngày
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem tất cả bài viết"
              onPress={clearFilters}
              style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 8 }}
            >
              <Text style={{ color: palette.green, fontSize: 14, fontWeight: "600" }}>
                Xem tất cả
              </Text>
              <Ionicons name="chevron-forward" size={16} color={palette.green} />
            </Pressable>
          </View>
          {dailyArticles.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {dailyArticles.map((article) => (
                <AnimatedArticleCard
                  key={article.id}
                  reduceMotion={reduceMotion}
                  onPress={() => openArticle(article.id)}
                  accessibilityLabel={`Mở bài viết: ${article.title}`}
                  style={{
                    width: articleCardWidth,
                    minHeight: 250,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.white,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    source={article.image}
                    resizeMode="cover"
                    accessibilityLabel={article.title}
                    style={{ width: "100%", height: 126 }}
                  />
                  <Text
                    numberOfLines={4}
                    style={{
                      marginTop: 14,
                      paddingHorizontal: 14,
                      color: palette.dark,
                      fontSize: 17,
                      lineHeight: 23,
                      fontWeight: "700",
                    }}
                  >
                    {article.title}
                  </Text>
                  <View
                    style={{
                      minHeight: 54,
                      marginTop: "auto",
                      paddingHorizontal: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="time-outline" size={17} color={palette.secondary} />
                      <Text style={{ color: palette.secondary, fontSize: 14 }}>
                        {article.readingTime}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={21} color={palette.green} />
                  </View>
                </AnimatedArticleCard>
              ))}
            </View>
          ) : (
            <Text style={{ color: palette.secondary, fontSize: 14, lineHeight: 21 }}>
              Không tìm thấy bài viết phù hợp. Hãy thử chủ đề hoặc từ khóa khác.
            </Text>
          )}
        </View>

        {!query && !selectedTopic && (
          <View style={{ marginTop: 30, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text
                accessibilityRole="header"
                style={{ color: palette.dark, fontSize: 25, fontWeight: "700" }}
              >
                Góc Ginkgo
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem thêm từ Góc Ginkgo"
                onPress={openGinkgoReference}
                style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 8 }}
              >
                <Text style={{ color: palette.green, fontSize: 14, fontWeight: "600" }}>
                  Xem tất cả
                </Text>
                <Ionicons name="chevron-forward" size={16} color={palette.green} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Mở thông tin về lá bạch quả từ NCCIH"
              onPress={openGinkgoReference}
              style={{
                minHeight: 112,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: "#F1FAF7",
                overflow: "hidden",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Image
                source={require("../../assets/Ginkgo.png")}
                resizeMode="cover"
                accessibilityLabel="Lá bạch quả xanh"
                style={{ width: "38%", height: 112 }}
              />
              <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 7 }}>
                <Text
                  numberOfLines={2}
                  style={{ color: palette.dark, fontSize: 16, lineHeight: 22, fontWeight: "700" }}
                >
                  Lá bạch quả và sức khỏe: hiểu đúng trước khi sử dụng
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons name="leaf" size={17} color={palette.green} />
                  <Text style={{ color: palette.secondary, fontSize: 13 }}>
                    Thông tin từ nguồn y tế uy tín
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={21}
                color={palette.green}
                style={{ marginRight: 8 }}
              />
            </Pressable>
            {!!ginkgoLinkError && (
              <Text accessibilityRole="alert" style={{ color: palette.dark, fontSize: 13 }}>
                {ginkgoLinkError}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
