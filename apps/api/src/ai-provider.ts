export type AiMessage = { role: string; content: string };
// Expose only our own messages. Provider error text can contain credentials or input.
export class AiProviderError extends Error {
  constructor(public readonly userMessage: string) {
    super("AI_PROVIDER_UNAVAILABLE");
    this.name = "AiProviderError";
  }
}
function providerErrorMessage(
  status: number,
  code: unknown,
  type: unknown,
): string {
  if (code === "credit_balance_exhausted")
    return "Tài khoản OpenAI của ứng dụng đã hết số dư API. Hãy kiểm tra Billing và nạp thêm credits.";
  if (
    code === "project_spend_limit_exceeded" ||
    code === "organization_spend_limit_exceeded"
  )
    return "Dịch vụ AI đã đạt hạn mức chi tiêu. Hãy kiểm tra hạn mức của project hoặc tổ chức OpenAI.";
  if (
    code === "organization_usage_limit_exceeded" ||
    code === "insufficient_quota" ||
    type === "insufficient_quota"
  )
    return "Dịch vụ AI không đủ hạn mức sử dụng. Hãy kiểm tra Billing và Limits của OpenAI.";
  if (status === 401)
    return "Khóa OpenAI của ứng dụng không hợp lệ hoặc đã bị thu hồi. Hãy kiểm tra cấu hình backend.";
  if (status === 403)
    return "OpenAI từ chối quyền truy cập. Hãy kiểm tra quyền của project và khu vực được hỗ trợ.";
  if (status === 404 || code === "model_not_found")
    return "Model AI không tồn tại hoặc project chưa có quyền truy cập. Hãy kiểm tra OPENAI_MODEL.";
  if (status === 429)
    return "Trợ lý đang nhận quá nhiều yêu cầu. Hãy chờ một lúc rồi thử lại.";
  if (status === 400)
    return "Cấu hình yêu cầu AI chưa được OpenAI chấp nhận. Hãy kiểm tra model và cấu hình backend.";
  if (status >= 500)
    return "Dịch vụ OpenAI đang gặp sự cố. Vui lòng thử lại sau.";
  return "Không kết nối được trợ lý. Vui lòng thử lại.";
}
// Isolated provider transport: no DB/user lookup and no tools that can mutate user data.
export async function requestAnswer(
  options: {
    model: string;
    key: string;
    instructions: string;
    input: AiMessage[];
    signal: AbortSignal;
  },
  transport: typeof fetch = fetch,
): Promise<string> {
  const response = await transport("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      store: false,
      max_output_tokens: 900,
      instructions: options.instructions,
      input: options.input,
    }),
    signal: options.signal,
  });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const error =
      data && typeof data === "object" && "error" in data
        ? (data as { error?: { code?: unknown; type?: unknown } }).error
        : undefined;
    throw new AiProviderError(
      providerErrorMessage(response.status, error?.code, error?.type),
    );
  }
  const data: any = await response.json();
  const content = (data.output || [])
    .flatMap((o: any) => o.content || [])
    .filter((c: any) => c.type === "output_text")
    .map((c: any) => c.text)
    .join("\n");
  if (!content || options.signal.aborted)
    throw new Error("AI_EMPTY_OR_CANCELLED");
  return content;
}
