import React, { useRef, useState } from "react";
import { Text, View, Switch } from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { api, changed } from "../../src/api";
import {
  Button,
  Chip,
  C,
  Disclosure,
  Empty,
  Feedback,
  Field,
  Header,
  Notice,
  Page,
  State,
  styles,
  T,
  useAction,
} from "../../src/ui";
type Message = {
  id: string;
  role: string;
  content: string;
  shared_health: boolean;
};
export default function Assistant() {
  const q = useQuery({
    queryKey: ["messages"],
    queryFn: ({ signal }) => api<Message[]>("/ai/messages", { signal }),
  });
  const [content, setContent] = useState(""),
    [share, setShare] = useState(false),
    [deleting, setDeleting] = useState(false);
  const action = useAction(),
    request = useRef<string | null>(null),
    abort = useRef<AbortController | null>(null);
  const send = () =>
    action.run(async () => {
      const id = request.current || Crypto.randomUUID();
      request.current = id;
      abort.current = new AbortController();
      await api("/ai/messages", {
        method: "POST",
        body: { id, content, shareHealth: share },
        signal: abort.current.signal,
      });
      setContent("");
      request.current = null;
      setShare(false);
      await changed();
    }, "");
  const composer = (
    <View style={{ gap: 10 }}>
      <Feedback action={action} />
      {action.busy && <Notice message="Trợ lý đang trả lời…" />}
      <Field
        label="Bạn muốn hỏi điều gì?"
        value={content}
        onChangeText={(text) => {
          setContent(text);
          request.current = null;
        }}
        editable={!action.busy}
        multiline
        style={{ minHeight: 64, maxHeight: 110 }}
        maxLength={2000}
        placeholder="Viết câu hỏi của bạn…"
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Switch
          accessibilityLabel="Đồng ý chia sẻ tổng hợp hôm nay"
          value={share}
          disabled={action.busy}
          onValueChange={(value) => {
            setShare(value);
            request.current = null;
          }}
          trackColor={{ true: C.primary }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 13 }}>Chia sẻ tổng hợp</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
            {share ? "Bật cho lượt này" : "Đang tắt"}
          </Text>
        </View>
        {action.busy ? (
          <Button
            secondary
            title="Hủy"
            onPress={() => {
              const id = request.current;
              abort.current?.abort();
              if (id)
                void api(`/ai/requests/${id}`, { method: "DELETE" }).catch(
                  () => {},
                );
            }}
          />
        ) : (
          <Button
            title={action.error ? "Gửi lại" : "Gửi"}
            icon="arrow-up"
            disabled={!content.trim()}
            onPress={send}
          />
        )}
      </View>
      <Text style={{ fontSize: 12, lineHeight: 17, color: C.muted }}>
        Câu hỏi bạn nhập được gửi đến OpenAI khi bấm Gửi.
      </Text>
    </View>
  );
  return (
    <Page footer={composer} autoScroll={!!q.data?.length}>
      <Header
        title="Trợ lý của bạn"
        subtitle="Cùng tìm hiểu, cùng xây thói quen tốt."
      />
      <T muted>
        Hỗ trợ kiến thức và thói quen. Không chẩn đoán, kê đơn hay tự thay đổi
        dữ liệu.
      </T>
      <State query={q}>
        {!q.data?.length && (
          <View style={{ gap: 10 }}>
            <Empty
              title="Hôm nay bạn muốn hỏi gì?"
              description="Chọn một gợi ý, hoặc viết câu hỏi của riêng mình."
              icon="chatbubbles-outline"
            />
            {[
              "Làm sao để nhớ uống nước đều hơn?",
              "Tôi muốn xây dựng thói quen ngủ đúng giờ",
            ].map((prompt) => (
              <Chip
                key={prompt}
                title={prompt}
                onPress={() => {
                  setContent(prompt);
                  request.current = null;
                }}
              />
            ))}
          </View>
        )}
        {q.data?.map((m) => (
          <View
            key={m.id}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
              padding: 18,
              borderRadius: 20,
              backgroundColor: m.role === "user" ? "#DFEBE4" : C.white,
              gap: 8,
            }}
          >
            <Text style={styles.badge}>
              {m.role === "user" ? "BẠN" : "GINKGO"}
            </Text>
            <T>{m.content}</T>
            {m.shared_health && (
              <T muted>Đã đồng ý chia sẻ tổng hợp ở lượt này</T>
            )}
          </View>
        ))}
      </State>
      <Disclosure
        title="Bạn kiểm soát dữ liệu"
        subtitle="Thông tin chia sẻ và lịch sử"
        icon="shield-checkmark-outline"
      >
        <T muted>
          Khi bật chia sẻ, trợ lý nhận tổng hợp nước, ngủ, chỉ số theo ngày và
          lịch sử chat. Không gửi tên, điện thoại, ghi chú nhật ký hoặc danh
          sách thuốc. Tùy chọn trở về tắt sau mỗi lượt gửi thành công.
        </T>
        <Button
          secondary
          danger
          disabled={action.busy}
          title={
            deleting ? "Xác nhận xóa toàn bộ lịch sử" : "Xóa lịch sử trò chuyện"
          }
          onPress={() => {
            if (!deleting) {
              setDeleting(true);
              return;
            }
            void action.run(async () => {
              await api("/ai/messages", { method: "DELETE" });
              await changed();
              setDeleting(false);
            }, "Đã xóa lịch sử");
          }}
        />
      </Disclosure>
    </Page>
  );
}
