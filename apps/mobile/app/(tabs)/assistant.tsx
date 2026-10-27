import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import { useQuery } from "@tanstack/react-query";
import { api, changed } from "../../src/api";
import { Button, C, H, Notice, Page, State, T, useAction } from "../../src/ui";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  shared_health: boolean;
  created_at?: string;
};

const suggestions = [
  {
    icon: "water-outline" as const,
    title: "Uống nước đều hơn",
    prompt: "Làm sao để nhớ uống nước đều hơn?",
    color: "#087FC1",
    background: "#E8F5FF",
  },
  {
    icon: "moon-outline" as const,
    title: "Ngủ đúng giờ",
    prompt: "Tôi muốn xây dựng thói quen ngủ đúng giờ.",
    color: "#6951B8",
    background: "#F0EDFC",
  },
  {
    icon: "heart-outline" as const,
    title: "Thói quen khỏe mạnh",
    prompt: "Gợi ý một vài thói quen nhỏ để sống khỏe hơn.",
    color: "#217A55",
    background: "#E9F6EF",
  },
  {
    icon: "chatbubble-ellipses-outline" as const,
    title: "Hỏi về sức khỏe",
    prompt: "Làm thế nào để theo dõi các chỉ số sức khỏe hằng ngày?",
    color: "#D13758",
    background: "#FDECF0",
  },
];

export default function Assistant() {
  const q = useQuery({
    queryKey: ["messages"],
    queryFn: ({ signal }) => api<Message[]>("/ai/messages", { signal }),
  });
  const [content, setContent] = useState("");
  const [share, setShare] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [cancelError, setCancelError] = useState("");
  const action = useAction();
  const deleteAction = useAction();
  const request = useRef<string | null>(null);

  const send = () => {
    const message = content.trim();
    if (!message || action.busy) return;

    void action.run(async () => {
      const id = request.current || Crypto.randomUUID();
      request.current = id;
      const controller = new AbortController();
      await api("/ai/messages", {
        method: "POST",
        body: { id, content: message, shareHealth: share },
        signal: controller.signal,
      });
      await changed();
      setContent("");
      setShare(false);
      request.current = null;
    }, "");
  };

  const cancel = () => {
    const id = request.current;
    if (id) {
      void api(`/ai/requests/${id}`, { method: "DELETE" })
        .then(() => setCancelError(""))
        .catch((error) =>
          setCancelError(
            error instanceof Error
              ? error.message
              : "Không thể dừng yêu cầu. Vui lòng thử lại.",
          ),
        );
    }
  };

  const copy = async (message: Message) => {
    try {
      await Clipboard.setStringAsync(message.content);
      setCopyStatus("Đã sao chép câu trả lời.");
    } catch {
      setCopyStatus("Không thể sao chép câu trả lời. Vui lòng thử lại.");
    }
  };

  const composer = (
    <View style={{ gap: 10 }}>
      {!!cancelError && <Notice error message={cancelError} />}
      {!!action.error && (
        <View style={{ gap: 8 }}>
          <Notice error message={action.error} />
          <Button
            secondary
            title="Thử lại"
            icon="refresh-outline"
            disabled={action.busy || !content.trim()}
            onPress={send}
          />
        </View>
      )}
      {action.busy && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={{ flex: 1, color: C.muted, fontSize: 14 }}>
            Trợ lý đang soạn câu trả lời…
          </Text>
          <Button secondary title="Dừng" onPress={cancel} />
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 12,
          borderRadius: 16,
          backgroundColor: C.white,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <Switch
          accessibilityLabel="Đồng ý chia sẻ dữ liệu sức khỏe cho lượt này"
          value={share}
          disabled={action.busy}
          onValueChange={(value) => {
            setShare(value);
            request.current = null;
          }}
          trackColor={{ true: C.primary }}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>
            Chia sẻ tổng hợp sức khỏe
          </Text>
          <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17 }}>
            {share
              ? "Đang bật cho lượt gửi này"
              : "Tùy chọn; mặc định đang tắt"}
          </Text>
        </View>
      </View>
      <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17 }}>
        Câu hỏi được gửi tới OpenAI khi bạn nhấn Gửi. Khi bật chia sẻ, gửi thêm
        tổng hợp chỉ số hôm nay và tối đa 12 tin nhắn gần đây. Không tự lấy tên,
        ghi chú nhật ký hoặc danh sách thuốc từ hồ sơ.
      </Text>
      <View
        style={{
          minHeight: 56,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 10,
          padding: 8,
          borderRadius: 18,
          backgroundColor: C.white,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <TextInput
          accessibilityLabel="Bạn muốn hỏi điều gì?"
          value={content}
          onChangeText={(text) => {
            setContent(text);
            request.current = null;
          }}
          editable={!action.busy}
          multiline
          maxLength={2000}
          placeholder="Viết câu hỏi của bạn…"
          placeholderTextColor={C.muted}
          textAlignVertical="top"
          style={{
            flex: 1,
            minHeight: 40,
            maxHeight: 112,
            paddingHorizontal: 10,
            paddingVertical: 9,
            color: C.text,
            fontSize: 16,
            lineHeight: 22,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gửi câu hỏi"
          accessibilityState={{
            disabled: action.busy || !content.trim(),
          }}
          disabled={action.busy || !content.trim()}
          onPress={send}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: C.primary,
            opacity: pressed || action.busy || !content.trim() ? 0.55 : 1,
          })}
        >
          <Ionicons name="arrow-up" size={22} color={C.white} />
        </Pressable>
      </View>
      <Text style={{ color: C.muted, fontSize: 11, lineHeight: 16 }}>
        Trợ lý chỉ cung cấp thông tin tham khảo, không thay thế tư vấn y tế.
      </Text>
    </View>
  );

  return (
    <Page footer={composer} autoScroll={!!q.data?.length}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 5 }}>
          <Text
            accessibilityRole="header"
            style={{
              color: "#075B45",
              fontSize: 29,
              lineHeight: 36,
              fontWeight: "800",
              letterSpacing: -0.5,
            }}
          >
            Trợ lý Ginkgo
          </Text>
          <Text style={{ color: "#62817D", fontSize: 14, lineHeight: 20 }}>
            Cùng tìm hiểu, cùng xây thói quen tốt.
          </Text>
        </View>
        <Image
          source={require("../../assets/Ginkgo.png")}
          accessibilityLabel="Logo Ginkgo"
          resizeMode="contain"
          style={{ width: 84, height: 60 }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          padding: 14,
          borderRadius: 16,
          backgroundColor: "#FFF7E8",
          borderWidth: 1,
          borderColor: "#F1E1BF",
        }}
      >
        <Ionicons name="information-circle-outline" size={21} color="#A56B18" />
        <Text style={{ flex: 1, color: "#705622", fontSize: 13, lineHeight: 19 }}>
          Nội dung chỉ mang tính tham khảo, không chẩn đoán hay kê đơn. Nếu có
          triệu chứng đáng lo, hãy liên hệ nhân viên y tế.
        </Text>
      </View>

      <State query={q}>
        {!q.data?.length ? (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 5 }}>
              <H>Bạn muốn bắt đầu từ đâu?</H>
              <T muted>Chọn gợi ý để điền vào ô chat, chưa gửi ngay.</T>
            </View>
            {[suggestions.slice(0, 2), suggestions.slice(2)].map(
              (row, rowIndex) => (
                <View key={rowIndex} style={{ flexDirection: "row", gap: 10 }}>
                  {row.map((suggestion) => {
                    const selected = content === suggestion.prompt;
                    return (
                      <Pressable
                        key={suggestion.title}
                        accessibilityRole="button"
                        accessibilityLabel={`Gợi ý: ${suggestion.title}`}
                        accessibilityState={{
                          selected,
                          disabled: action.busy,
                        }}
                        disabled={action.busy}
                        onPress={() => {
                          setContent(suggestion.prompt);
                          request.current = null;
                        }}
                        style={({ pressed }) => ({
                          flex: 1,
                          minHeight: 108,
                          justifyContent: "center",
                          gap: 9,
                          padding: 14,
                          borderRadius: 17,
                          backgroundColor: selected
                            ? suggestion.color
                            : suggestion.background,
                          borderWidth: selected ? 2 : 1,
                          borderColor: suggestion.color,
                          opacity: pressed || action.busy ? 0.72 : 1,
                        })}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: selected
                              ? "rgba(255,255,255,0.2)"
                              : "rgba(255,255,255,0.8)",
                          }}
                        >
                          <Ionicons
                            name={selected ? "checkmark" : suggestion.icon}
                            size={22}
                            color={selected ? C.white : suggestion.color}
                          />
                        </View>
                        <Text
                          style={{
                            color: selected ? C.white : suggestion.color,
                            fontSize: 14,
                            lineHeight: 19,
                            fontWeight: selected ? "800" : "700",
                          }}
                        >
                          {suggestion.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ),
            )}
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {q.data.map((message) => {
              const isUser = message.role === "user";
              return (
                <View
                  key={message.id}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "92%",
                    flexDirection: isUser ? "row" : "row-reverse",
                    alignItems: "flex-end",
                    gap: 8,
                  }}
                >
                  {!isUser && (
                    <Image
                      source={require("../../assets/Ginkgo.png")}
                      accessibilityLabel="Ginkgo"
                      resizeMode="contain"
                      style={{ width: 32, height: 32 }}
                    />
                  )}
                  <View
                    style={{
                      flexShrink: 1,
                      gap: 8,
                      padding: 15,
                      borderRadius: 18,
                      backgroundColor: isUser ? "#E5F2E9" : C.white,
                      borderWidth: 1,
                      borderColor: isUser ? "#CFE4D5" : C.border,
                    }}
                  >
                    <Text
                      style={{
                        color: C.primary,
                        fontSize: 11,
                        fontWeight: "800",
                        letterSpacing: 0.6,
                      }}
                    >
                      {isUser ? "BẠN" : "GINKGO"}
                    </Text>
                    <Text
                      selectable
                      style={{
                        color: C.text,
                        fontSize: 15,
                        lineHeight: 22,
                      }}
                    >
                      {message.content}
                    </Text>
                    {!!message.created_at && (
                      <Text style={{ color: C.muted, fontSize: 11 }}>
                        {new Date(message.created_at).toLocaleTimeString(
                          "vi-VN",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </Text>
                    )}
                    {message.shared_health && (
                      <Text style={{ color: C.muted, fontSize: 11 }}>
                        Đã chia sẻ tổng hợp sức khỏe ở lượt này
                      </Text>
                    )}
                    {!isUser && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Sao chép câu trả lời"
                        onPress={() => void copy(message)}
                        style={({ pressed }) => ({
                          alignSelf: "flex-start",
                          minHeight: 36,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Ionicons
                          name="copy-outline"
                          size={16}
                          color={C.primary}
                        />
                        <Text
                          style={{
                            color: C.primary,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Sao chép
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
            {action.busy && (
              <View
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: C.white,
                }}
              >
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={{ color: C.muted, fontSize: 13 }}>
                  Đang tạo câu trả lời…
                </Text>
              </View>
            )}
          </View>
        )}
      </State>

      {!!copyStatus && (
        <Notice message={copyStatus} />
      )}

      <View
        style={{
          gap: 10,
          padding: 16,
          borderRadius: 18,
          backgroundColor: C.white,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="shield-checkmark-outline" size={22} color={C.primary} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>
              Bạn kiểm soát dữ liệu
            </Text>
            <Text style={{ color: C.muted, fontSize: 12, lineHeight: 17 }}>
              Chia sẻ sức khỏe luôn tắt cho đến khi bạn chủ động bật.
            </Text>
          </View>
        </View>
        {!!deleteAction.error && <Notice error message={deleteAction.error} />}
        {!!deleteAction.success && <Notice message={deleteAction.success} />}
        <Button
          secondary
          danger
          disabled={deleteAction.busy || action.busy}
          title={
            deleting ? "Xác nhận xóa toàn bộ lịch sử" : "Xóa lịch sử trò chuyện"
          }
          onPress={() => {
            if (!deleting) {
              setDeleting(true);
              return;
            }
            void deleteAction.run(async () => {
              await api("/ai/messages", { method: "DELETE" });
              await changed();
              setDeleting(false);
            }, "Đã xóa lịch sử");
          }}
        />
        {deleting && (
          <Button
            secondary
            title="Hủy"
            onPress={() => setDeleting(false)}
          />
        )}
      </View>
    </Page>
  );
}
