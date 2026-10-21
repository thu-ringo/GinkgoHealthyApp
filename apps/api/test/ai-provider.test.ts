import { test } from "node:test";
import assert from "node:assert/strict";
import { AiProviderError, requestAnswer } from "../src/ai-provider";
const options = () => ({
  model: "configured-model",
  key: "test-only-key",
  instructions: "Hỗ trợ thói quen, không chẩn đoán.",
  input: [{ role: "user", content: "Làm sao nhớ uống nước?" }],
  signal: new AbortController().signal,
});
test("AI transport dùng model cấu hình, không lưu phía provider và không gửi tools", async () => {
  const transport: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(init!.body as string);
    assert.equal(body.model, "configured-model");
    assert.equal(body.store, false);
    assert.equal(body.tools, undefined);
    assert.deepEqual(body.input, options().input);
    return new Response(
      JSON.stringify({
        output: [
          { content: [{ type: "output_text", text: "Hãy thử đặt nhắc nhẹ." }] },
        ],
      }),
    );
  };
  assert.equal(
    await requestAnswer(options(), transport),
    "Hãy thử đặt nhắc nhẹ.",
  );
});
test("AI upstream lỗi và phản hồi không có văn bản đều thất bại, không tạo nội dung giả", async () => {
  await assert.rejects(
    () =>
      requestAnswer(options(), async () => new Response("{}", { status: 429 })),
    /AI_PROVIDER_UNAVAILABLE/,
  );
  await assert.rejects(
    () => requestAnswer(options(), async () => new Response('{"output":[]}')),
    /AI_EMPTY_OR_CANCELLED/,
  );
});

test("AI phân biệt hết credits, hạn mức chi tiêu, quá tải, khóa và model sai", async () => {
  const cases = [
    {
      status: 429,
      code: "credit_balance_exhausted",
      type: "insufficient_quota",
      expected: /hết số dư API/,
    },
    {
      status: 429,
      code: "project_spend_limit_exceeded",
      type: "insufficient_quota",
      expected: /hạn mức chi tiêu/,
    },
    {
      status: 429,
      code: "rate_limit_exceeded",
      type: "rate_limit_error",
      expected: /quá nhiều yêu cầu/,
    },
    {
      status: 401,
      code: "invalid_api_key",
      type: "invalid_request_error",
      expected: /Khóa OpenAI/,
    },
    {
      status: 404,
      code: "model_not_found",
      type: "invalid_request_error",
      expected: /Model AI/,
    },
    {
      status: 503,
      code: "server_is_overloaded",
      type: "service_unavailable_error",
      expected: /đang gặp sự cố/,
    },
  ];
  for (const c of cases) {
    let calls = 0;
    await assert.rejects(
      () =>
        requestAnswer(options(), async () => {
          calls++;
          return new Response(
            JSON.stringify({ error: { code: c.code, type: c.type } }),
            { status: c.status },
          );
        }),
      (error: unknown) => {
        assert.ok(error instanceof AiProviderError);
        assert.match(error.userMessage, c.expected);
        return true;
      },
    );
    assert.equal(calls, 1, "Không tự retry lỗi provider");
  }
});

test("AI không trả nội dung lỗi thô chứa key hoặc dữ liệu nhạy cảm", async () => {
  for (const body of [
    JSON.stringify({
      error: { code: "unknown", message: "test-only-key PRIVATE_HEALTH_TEXT" },
    }),
    "not json",
  ]) {
    await assert.rejects(
      () =>
        requestAnswer(
          options(),
          async () => new Response(body, { status: 400 }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof AiProviderError);
        assert.doesNotMatch(
          error.userMessage + error.message,
          /test-only-key|PRIVATE_HEALTH_TEXT|not json/,
        );
        return true;
      },
    );
  }
});
test("AI hủy/timeout truyền AbortSignal và không trả nội dung thành công sau khi hủy", async () => {
  const controller = new AbortController();
  const transport: typeof fetch = async (_, init) => {
    assert.equal(init!.signal, controller.signal);
    controller.abort();
    return new Response(
      JSON.stringify({
        output: [{ content: [{ type: "output_text", text: "late response" }] }],
      }),
    );
  };
  await assert.rejects(
    () => requestAnswer({ ...options(), signal: controller.signal }, transport),
    /AI_EMPTY_OR_CANCELLED/,
  );
  await assert.rejects(
    () =>
      requestAnswer(options(), async () => {
        throw new DOMException("timeout", "TimeoutError");
      }),
    /timeout/,
  );
});
