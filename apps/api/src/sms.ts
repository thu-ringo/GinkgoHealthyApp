import { ServiceUnavailableException } from "@nestjs/common";
export interface SmsProvider {
  send(phone: string, code: string): Promise<void>;
}
export class DevSms implements SmsProvider {
  async send() {
    if (
      process.env.NODE_ENV === "production" ||
      process.env.DEV_OTP_ENABLED !== "true" ||
      !/^\d{6}$/.test(process.env.DEV_OTP_CODE || "")
    )
      throw new ServiceUnavailableException("SMS dev chưa được bật rõ ràng");
  }
}
export class TwilioSms implements SmsProvider {
  async send(phone: string, code: string) {
    const {
      TWILIO_ACCOUNT_SID: sid,
      TWILIO_AUTH_TOKEN: secret,
      TWILIO_FROM: from,
    } = process.env;
    if (!sid || !secret || !from)
      throw new ServiceUnavailableException("SMS chưa được cấu hình");
    try {
      const r = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${secret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: phone,
            From: from,
            Body: `Ginkgo: ma xac minh ${code}. Het han sau 5 phut. Khong chia se ma nay.`,
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!r.ok) throw new Error();
    } catch {
      throw new ServiceUnavailableException(
        "Không gửi được SMS. Vui lòng thử lại sau.",
      );
    }
  }
}
export const sms: SmsProvider =
  process.env.SMS_PROVIDER === "dev" ? new DevSms() : new TwilioSms();
