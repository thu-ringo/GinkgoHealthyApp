import React, { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { articleById } from "../../src/articles";

const colors = {
  dark: "#073F36",
  green: "#087B57",
  body: "#334D49",
  secondary: "#62817D",
  mint: "#EAF7F3",
  border: "#DFECE8",
  white: "#FFFFFF",
};

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = articleById[id];
  const [sourceError, setSourceError] = useState("");

  if (!article) {
    return (
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: colors.white }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ padding: 20, gap: 16 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.dark} />
          </Pressable>
          <Text style={{ color: colors.dark, fontSize: 20, fontWeight: "700" }}>
            Không tìm thấy bài viết
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: colors.white }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          height: 52,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => router.back()}
          style={{ width: 48, height: 48, alignItems: "flex-start", justifyContent: "center" }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.dark} />
        </Pressable>
        <Text style={{ color: colors.dark, fontSize: 16, fontWeight: "600" }}>
          Bài viết sức khỏe
        </Text>
        <View style={{ width: 48, height: 48, alignItems: "flex-end", justifyContent: "center" }}>
          <Ionicons name="bookmark-outline" size={22} color={colors.green} />
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 36,
        }}
      >
        <Image
          source={article.image}
          resizeMode="cover"
          accessibilityLabel={article.title}
          style={{ width: "100%", height: 210, borderRadius: 16 }}
        />
        <View
          style={{
            alignSelf: "flex-start",
            minHeight: 28,
            marginTop: 18,
            paddingHorizontal: 11,
            justifyContent: "center",
            borderRadius: 14,
            backgroundColor: colors.mint,
          }}
        >
          <Text style={{ color: colors.green, fontSize: 11, fontWeight: "700" }}>
            {article.category}
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          style={{
            marginTop: 10,
            color: colors.dark,
            fontSize: 23,
            lineHeight: 30,
            fontWeight: "700",
          }}
        >
          {article.title}
        </Text>
        <Text style={{ marginTop: 10, color: colors.body, fontSize: 14, lineHeight: 22 }}>
          {article.intro}
        </Text>
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="time-outline" size={16} color={colors.secondary} />
          <Text style={{ color: colors.secondary, fontSize: 13 }}>
            {article.readingTime}
          </Text>
        </View>
        <View style={{ height: 1, marginVertical: 20, backgroundColor: colors.border }} />

        {article.parts.map((part) => (
          <View key={part.heading} style={{ marginBottom: 22, gap: 12 }}>
            <Text
              accessibilityRole="header"
              style={{ color: colors.dark, fontSize: 18, lineHeight: 25, fontWeight: "700" }}
            >
              {part.heading}
            </Text>
            {part.paragraphs.map((paragraph, index) => (
              <Text
                key={`${part.heading}-paragraph-${index}`}
                style={{ color: colors.body, fontSize: 15, lineHeight: 25 }}
              >
                {paragraph}
              </Text>
            ))}
            {part.bullets?.map((bullet, index) => (
              <View
                key={`${part.heading}-bullet-${index}`}
                style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    marginTop: 9,
                    borderRadius: 4,
                    backgroundColor: colors.green,
                  }}
                />
                <Text style={{ flex: 1, color: colors.body, fontSize: 15, lineHeight: 25 }}>
                  {bullet}
                </Text>
              </View>
            ))}
            {part.image && (
              <Image
                source={part.image}
                resizeMode="cover"
                accessibilityLabel={part.imageLabel}
                style={{ width: "100%", height: 190, borderRadius: 14, marginTop: 2 }}
              />
            )}
          </View>
        ))}

        <View
          style={{
            padding: 16,
            borderRadius: 14,
            backgroundColor: colors.mint,
          }}
        >
          <Text style={{ color: colors.dark, fontSize: 15, lineHeight: 23, fontWeight: "600" }}>
            {article.highlight}
          </Text>
        </View>

        <View style={{ marginTop: 24, gap: 10 }}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.dark, fontSize: 18, fontWeight: "700" }}
          >
            Nguồn tham khảo
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Mở nguồn ${article.sourceName}`}
            onPress={() => {
              setSourceError("");
              void Linking.openURL(article.sourceUrl).catch(() =>
                setSourceError("Không thể mở liên kết nguồn trên thiết bị này."),
              );
            }}
            style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Text style={{ flex: 1, color: colors.green, fontSize: 14, lineHeight: 21 }}>
              {article.sourceName}
            </Text>
            <Ionicons name="open-outline" size={18} color={colors.green} />
          </Pressable>
          {!!sourceError && (
            <Text accessibilityRole="alert" style={{ color: colors.dark, fontSize: 14 }}>
              {sourceError}
            </Text>
          )}
          <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>
            {article.note}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
