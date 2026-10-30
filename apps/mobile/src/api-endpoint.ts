export function demoApiEndpoint(value: unknown): string {
  if (typeof value !== "string") throw new Error("Thiếu địa chỉ API demo");
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.trycloudflare\.com$/.test(url.hostname) ||
    url.username || url.password || url.port ||
    url.pathname !== "/" || url.search || url.hash
  ) throw new Error("Địa chỉ API demo không hợp lệ");
  return url.origin;
}
