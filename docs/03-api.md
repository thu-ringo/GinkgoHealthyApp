# Hợp đồng REST v1 (local)

Base URL `http://<IP-máy-tính>:3000`. JSON UTF-8. Protected endpoints yêu cầu `Authorization: Bearer <accessToken>`; không tin user_id từ client. GET/PUT/DELETE thành công 200; POST thành công 201. Lỗi `{message:string, issues?:[{path,message}]}`: 400 validation, 401 auth/phiên, 404 không tồn tại hoặc không thuộc sở hữu, 409 conflict, 429 giới hạn, 503 provider/chưa cấu hình; 500 thông điệp chung, không lộ nội dung DB.

| Method / path | Body hoặc query | Kết quả |
|---|---|---|
| GET /health | public | `{status:'ok'}` sau SELECT 1 |
| POST /auth/register | `{phone,password}` | thông điệp, chưa đăng nhập |
| POST /auth/otp/request | `{phone,purpose:'verify'\|'reset'}` | thông điệp provider hoặc dev rõ ràng |
| POST /auth/otp/verify | `{phone,purpose:'verify',code}` | xác minh rồi đăng nhập riêng |
| POST /auth/password/reset | `{phone,purpose:'reset',code,password}` | đổi mật khẩu, revoke mọi phiên |
| POST /auth/login | `{phone,password,device?}` | `{accessToken,refreshToken}` |
| POST /auth/refresh | `{refreshToken}` | cặp token mới; token cũ dùng lại revoke phiên |
| POST /auth/logout | protected | revoke phiên hiện tại |
| POST /auth/logout-all | protected | revoke mọi phiên |
| GET /auth/sessions | protected | `[{id,device,created_at,expires_at,current}]` |
| DELETE /auth/sessions/:id | protected | thu hồi phiên thuộc user |
| POST /auth/password/change | `{oldPassword,password}` | đổi mật khẩu và revoke mọi phiên |
| GET /me | protected | `{id,phone,name,timezone,water_goal,sleep_goal}` |
| PUT /me | `{name,timezone,water_goal,sleep_goal}` | hồ sơ mới |
| GET /me/export | protected | snapshot profile/entries/schedules/occurrences/messages |
| DELETE /me | `{password}` | xóa cascade tài khoản, OTP và health data |
| GET /entries | `from,to=YYYY-MM-DD`, tối đa 366 ngày | mảng Entry theo timezone profile, mới trước |
| PUT /entries/:id | Entry, UUID trong URL=body | upsert idempotent theo chủ sở hữu |
| DELETE /entries/:id | protected | xóa bản ghi của user |
| GET /stats | `from,to` | `{timezone,days:[Day]}` ngày thiếu=null |
| GET /today | protected | `{date,profile,summary:Day,entryCount}` |
| GET /schedules | protected | mảng Schedule gồm active/revision |
| PUT /schedules/:id | Schedule | tạo/sửa; thay occurrence tương lai chưa log |
| DELETE /schedules/:id | protected | inactive + cancel tương lai chưa log |
| GET /occurrences | `from,to`, tối đa 90 ngày; mặc định 14 ngày | mảng Occurrence + status/logged_at |
| POST /occurrences/:id/log | `{status:'taken'\|'skipped'}` | log duy nhất, lặp cùng status trả bản đã lưu |
| GET /ai/messages | protected | tối đa 100 tin nhắn gần nhất |
| POST /ai/messages | `{id:UUID,content,shareHealth:boolean}` | câu trả lời đã lưu, cùng id trả kết quả trước |
| DELETE /ai/requests/:id | protected | abort request đang chạy của user |
| DELETE /ai/messages | protected | abort và xóa lịch sử user |

Phone: E.164 `+84901234567`. Password 10–128 ký tự. Profile: name 1–80 ký tự; timezone IANA; water_goal 100–10000 ml, sleep_goal 60–1440 phút (giới hạn nhập kỹ thuật, không phải khuyến cáo y khoa).

```ts
type Entry = {
  id: string; kind: 'weight'|'blood_pressure'|'heart_rate'|'water'|'sleep'|'mood'|'note';
  value: number|null; secondary?: number|null; unit: string;
  measured_at: string; // ISO UTC/offset bắt buộc
  source: 'manual'; note: string; // tối đa 2000 ký tự
};
type Schedule = {
  id:string; medicine:string; dose:string;
  times:string[]; // HH:mm, 1–8 giờ khác nhau
  weekdays:number[]; // ISO 1..7
  start_date:string; end_date:string|null; timezone:string;
};
type Occurrence = {
  id:string; schedule_id:string; due_at:string; medicine:string; dose:string;
  cancelled:boolean; status:'taken'|'skipped'|null; logged_at:string|null;
};
type Day = {
  date:string; water:number|null; sleep:number|null; weight:number|null;
  heart_rate:number|null; blood_pressure:number|null; mood:number|null;
};
```

Units tương ứng: kg, mmHg, bpm, ml, min, level, text. Huyết áp gồm value=tâm thu và secondary=tâm trương; chart hiển thị tâm thu cuối ngày. Nước/ngủ cộng tổng, chỉ số khác lấy số cuối ngày. Mỗi khoảng tối đa 10000 bản ghi; nếu vượt trả 400 và yêu cầu chọn khoảng nhỏ hơn, không âm thầm cắt dữ liệu làm sai tổng (chưa pagination). Schedule timezone độc lập profile. UUID client giữ qua retry của PUT; log thuốc dùng occurrence ID làm idempotency key. AI không gửi lại history khi shareHealth=false để tránh vô tình gửi thông tin sức khỏe của lượt trước.

Socket.IO cùng host: handshake `{auth:{token:accessToken}}`. Sau khi xác thực và join phòng, server gửi `ready` và `changed:{topic:'sync'}` để client refetch nguồn chính, tránh khoảng trống giữa connect/fetch/join. Mutation gửi `changed:{topic}` đúng owner; client invalidate/fetch khi connect/foreground. Không bảo đảm delivery khi mất mạng và không dùng event làm nguồn dữ liệu.

Nguồn tích hợp: [OpenAI text generation](https://developers.openai.com/api/docs/guides/text), [Expo SDK 57 compatibility](https://docs.expo.dev/versions/v57.0.0/). Model lấy từ môi trường, không hardcode hoặc chọn model thay người triển khai.
