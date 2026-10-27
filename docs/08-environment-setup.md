# Ginkgo — điền .env và kết nối dịch vụ

Đối chiếu mã nguồn và tài liệu nhà cung cấp ngày 21/10/2026. Ginkgo là tên hiển thị mới của HealthyCheck. Database, bảng, khóa lưu phiên và định danh package cũ được giữ để tiếp tục dùng dữ liệu hiện có; không cần tạo lại database vì đổi tên app. Backend vẫn dùng MariaDB + TypeORM và migration.

## 1. Hai file khác nhau

- `<thu-muc-goc-du-an>\.env`: cấu hình backend, database và tất cả secret.
- `<thu-muc-goc-du-an>\apps\mobile\.env`: chỉ có địa chỉ API công khai cho điện thoại, không chứa khóa OpenAI/Twilio/JWT/OTP.

Nếu .env đã tồn tại, sửa file đó; không ghi đè bằng file mẫu. `.env.example` là bản hướng dẫn, không phải nguồn credentials dùng thật. Các file `.env` đã được gitignore.

## 2. Những giá trị tự chọn hoặc lấy từ máy mình

| Biến | Lấy ở đâu và điền thế nào |
|---|---|
| `NODE_ENV` | Để `development` khi chạy đồ án local. Không chuyển production chỉ để thử tính năng. |
| `PORT` | Chọn cổng backend còn trống, hiện là `3000`. Nếu đổi phải đổi cả API URL trên mobile. |
| `DATABASE_URL` | Từ tài khoản MariaDB bạn đã tạo, cùng host/port/database dùng trong HeidiSQL. Cấu hình Docker hiện tại là host `127.0.0.1`, port `3307`, user/database `healthycheck`. |
| `CORS_ORIGINS` | Địa chỉ trang web được phép gọi API, hiện `http://localhost:8081`. Đây là cổng Expo web, không phải cổng API. Expo Go native không cần thêm origin chỉ vì điện thoại có IP khác. |
| `JWT_SECRET` | Tự sinh ngẫu nhiên trên máy mình; ít nhất 32 ký tự. Dùng ký access token. |
| `OTP_PEPPER` | Tự sinh một chuỗi ngẫu nhiên khác với JWT secret; ít nhất 32 ký tự. Dùng HMAC bảo vệ OTP trên server. |
| `AI_DAILY_LIMIT` | Tự đặt số lượt AI tối đa cho mỗi người dùng/ngày UTC, ví dụ `20`. Không phải 20 USD hay hạn mức thanh toán OpenAI. Lượt chỉ được tính khi câu trả lời hoàn tất và lưu thành công; giới hạn theo phút vẫn áp dụng cho các yêu cầu gửi lên. |
| `TEST_DATABASE_URL` | Tài khoản kết nối database kiểm thử riêng, ví dụ `healthycheck_test`. Hậu tố `_test` là bắt buộc để chạy integration; không trỏ vào database dữ liệu người dùng. |
| `DEMO_SEED_ENABLED` | Để `false` nếu dùng tài khoản tự đăng ký. Chỉ đổi `true` khi muốn tạo tài khoản demo riêng. |
| `DEMO_PHONE` | Tự chọn số theo dạng quốc tế chưa được đăng ký trong database, dành riêng cho demo. Seed không gửi SMS. Giá trị mẫu không phải số của bạn. |
| `DEMO_PASSWORD` | Tự đặt mật khẩu ít nhất 10 ký tự nếu bật seed. Không cần điền khi không seed. |

Ví dụ URL database hiện tại:

```dotenv
DATABASE_URL=mysql://healthycheck:local_only_change_me@127.0.0.1:3307/healthycheck
TEST_DATABASE_URL=mysql://healthycheck:local_only_change_me@127.0.0.1:3307/healthycheck_test
```

`mysql://` là dạng URL được project chấp nhận cho MariaDB; TypeORM vẫn dùng driver `mariadb`. Nếu dùng MariaDB cài trực tiếp ở cổng 3306, thay host/port/user/password theo session HeidiSQL của bạn. HeidiSQL là công cụ quản lý, không tạo sẵn credentials cho server. Mật khẩu có ký tự đặc biệt trong URL phải được URL-encode. Với Docker có volume đã tạo, đổi `MARIADB_PASSWORD` trong .env không tự đổi mật khẩu tài khoản trong database; phải thay mật khẩu bằng SQL và cập nhật URL cho khớp, không xóa volume để đổi mật khẩu. Xem [hướng dẫn HeidiSQL](06-mariadb-heidisql.md).

Sinh hai secret bằng PowerShell tại thư mục dự án:

```powershell
node -e "const c=require('node:crypto');console.log('JWT_SECRET='+c.randomBytes(48).toString('hex'));console.log('OTP_PEPPER='+c.randomBytes(48).toString('hex'))"
```

Chép hai dòng kết quả vào `.env`, không chép kết quả vào tài liệu công khai. Các secret đã gửi trong chat nên được thay bằng giá trị mới trước khi dùng ở môi trường chia sẻ. Đổi JWT secret khiến access token cũ không còn hợp lệ; có thể cần đăng nhập lại. Đổi OTP pepper khiến mã OTP đang chờ xác minh không còn dùng được. Các thay đổi này không xóa nhật ký hoặc tài khoản.

Nếu muốn mở bản web bằng IP LAN, thêm đúng origin đang dùng, không có dấu cách:

```dotenv
CORS_ORIGINS=http://localhost:8081,http://<IPv4-may-tinh>:8081
```

Không dùng `*`, `exp://...` hoặc URL API `:3000` thay cho origin của trang web.

## 3. OTP kiểm thử, không gửi SMS

```dotenv
SMS_PROVIDER=dev
DEV_OTP_ENABLED=true
DEV_OTP_CODE=123456
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
```

Sau khi tạo tài khoản, bấm yêu cầu mã rồi nhập mã dev. Mã chỉ được lưu challenge khi đã yêu cầu; hết hạn sau 5 phút, dùng một lần; gửi lại cách ít nhất 60 giây. `DEV_OTP_CODE` là mã cố định bạn tự đặt gồm đúng 6 chữ số, không lấy từ Twilio. Dev provider bị chặn trong production. Không có tin nhắn tới điện thoại ở chế độ này.

## 4. SMS thật bằng Twilio

Adapter hiện dùng **Twilio Messaging REST API** (`Messages.json`), không dùng Twilio Verify. Vì vậy project không có `TWILIO_VERIFY_SERVICE_SID`; không điền Verify Service SID vào Account SID.

1. Đăng ký/đăng nhập [Twilio Console](https://console.twilio.com/). Tại trang tài khoản hoặc API Keys & Tokens, lấy **Account SID** (thường bắt đầu `AC`) và **Auth Token**. Dùng credentials thật của tài khoản khi muốn gửi thật; [test credentials](https://www.twilio.com/docs/iam/test-credentials) không chuyển SMS tới máy nhận.
2. Thiết lập một số gửi có SMS hoặc Alphanumeric Sender ID đã được cấp phép. `TWILIO_FROM` là **người gửi**, không phải số điện thoại nhận OTP. Số người nhận lấy từ số đăng ký trong Ginkgo.
3. Kiểm tra quyền gửi tới quốc gia đích, hạn mức/số dư và điều kiện tài khoản. Trial hiện có giới hạn người nhận, quốc gia và mẫu nội dung; adapter gửi OTP tùy biến nên không coi trial là bảo đảm dùng được. Đối chiếu [Twilio trial](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account).
4. Với số Việt Nam `+84`, kiểm tra đăng ký Sender ID và mẫu OTP. Nội dung phải chứa tên ứng dụng/thương hiệu phù hợp sender; có thể cần hồ sơ doanh nghiệp và thời gian duyệt. Xem [Twilio Vietnam SMS Guidelines](https://www.twilio.com/en-us/guidelines/vn/sms). Không chỉ mua số nước ngoài rồi mặc định gửi được vào Việt Nam.
5. Khi sender và tài khoản đã sẵn sàng, thay nhóm cấu hình dưới đây và khởi động lại API.

```dotenv
SMS_PROVIDER=twilio
DEV_OTP_ENABLED=false
TWILIO_ACCOUNT_SID=AC_THAY_BANG_ACCOUNT_SID_THAT
TWILIO_AUTH_TOKEN=THAY_BANG_AUTH_TOKEN_THAT
TWILIO_FROM=THAY_BANG_SENDER_DA_DUOC_DUYET
```

`TWILIO_FROM` có thể là số quốc tế hoặc tên gửi được phép tại quốc gia đích. Chỉ dùng `Ginkgo` nếu chính tên đó đã được phê duyệt. Mẫu hiện tại trong code: `Ginkgo: ma xac minh {code}. Het han sau 5 phut. Khong chia se ma nay.` Nếu provider yêu cầu mẫu khác, cần cập nhật adapter cho khớp mẫu được duyệt.

Thử với số thuộc quyền kiểm soát của bạn. Xem Messaging Logs/Debugger của Twilio để biết lỗi và trạng thái. API nhận request thành công chưa chứng minh SMS đã được giao; project chưa tích hợp delivery webhook. Phí và khả năng gửi cần kiểm tra trong tài khoản/provider. Nếu đăng ký brandname chưa khả thi cho đồ án, vẫn có thể dùng dev OTP và tích hợp AI thật; không mô tả dev OTP là SMS thật.

## 5. Trợ lý OpenAI thật

1. Đăng nhập [OpenAI Platform](https://platform.openai.com/), tạo/chọn project dành cho Ginkgo.
2. Vào [API keys](https://platform.openai.com/api-keys), tạo secret key cho project. Lưu ngay vào `.env` backend. Không gửi key trong chat hoặc đưa vào mobile. Xem [OpenAI quickstart](https://developers.openai.com/api/docs/quickstart).
3. Kiểm tra [Billing](https://platform.openai.com/settings/organization/billing/overview), credits và quyền sử dụng của project. Kiểm tra chi phí trên Platform, không xem `AI_DAILY_LIMIT` là giới hạn chi tiêu của nhà cung cấp.
4. Điền ID model có quyền truy cập **Responses API**. Ví dụ `gpt-4.1-mini` có tài liệu hỗ trợ Responses tại [trang model](https://developers.openai.com/api/docs/models/gpt-4.1-mini); đây là ví dụ tương thích, không cam kết mọi tài khoản đều được dùng.

```dotenv
OPENAI_API_KEY=THAY_BANG_SECRET_KEY_CUA_PROJECT
OPENAI_MODEL=gpt-4.1-mini
AI_DAILY_LIMIT=20
```

Phải điền cả key và model. Không copy nguyên chuỗi placeholder. Backend hiện gọi `POST https://api.openai.com/v1/responses`, `store:false`, không có tools sửa dữ liệu. Sau khi khởi động lại API, vào Trợ lý, gửi một câu hỏi phổ thông với chia sẻ nhật ký tắt để kiểm tra trước. Chỉ bật chia sẻ khi bạn muốn gửi tổng hợp. Sai key, model không được phép, hết hạn mức và timeout đều cần xử lý từ tài khoản/dịch vụ thực; chưa có credentials thì không xác minh được tích hợp thật.

## 6. Điện thoại và khởi động lại

Trong `apps/mobile/.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://<IPv4-may-tinh>:3000
```

Thay IP bằng IPv4 Wi-Fi/LAN của máy chạy API (xem `ipconfig`). Máy tính và điện thoại cùng mạng. Không dùng `localhost` của điện thoại để trỏ máy tính. Kiểm tra trên trình duyệt điện thoại: `http://IP_MAY_TINH:3000/health` phải trả `{"status":"ok"}`.

Sau khi sửa `.env` backend, dừng tiến trình API bằng Ctrl+C rồi chạy lại, vì sửa .env không bảo đảm watcher nạp lại môi trường. Không mở thêm một API khác cùng cổng.

```powershell
Set-Location "<thu-muc-goc-du-an>"
docker compose up -d mariadb
npm run db:migrate
npm run api
```

Ở terminal khác, dừng Metro cũ nếu đang chạy rồi khởi động:

```powershell
Set-Location "<thu-muc-goc-du-an>\apps\mobile"
npx expo start --go --lan --clear --port 8081
```

Nếu chỉ đổi biến OpenAI/SMS ở backend, không cần cài lại thư viện hoặc tạo lại database. Đổi API URL trong mobile thì nạp lại Metro/app để nhận giá trị mới. Tên Ginkgo và icon đã khai báo trong app.json; icon cài trên màn hình chính cần development build để kiểm tra đầy đủ, Expo Go vẫn là ứng dụng Expo Go.

## 7. Seed và kiểm thử tùy chọn

Để tài khoản tự đăng ký mới không có dữ liệu demo, giữ `DEMO_SEED_ENABLED=false`. Nếu cần trình diễn:

```dotenv
DEMO_SEED_ENABLED=true
DEMO_PHONE=SO_QUOC_TE_DEMO_CHUA_DUOC_DANG_KY
DEMO_PASSWORD=MAT_KHAU_RIENG_IT_NHAT_10_KY_TU
```

Chạy `npm run seed:demo`, sau đó đặt cờ lại `false`. `DEMO_PHONE` trong ví dụ trên là placeholder, phải thay bằng số E.164 hợp lệ. Tài khoản demo tách riêng, đã xác minh và không nhận SMS khi seed. Integration dùng `npm run test:integration` và database riêng `_test`.

## 8. Tình trạng được xác minh

MariaDB/API local và giao diện đã được kiểm tra trong các giai đoạn trước. Hướng dẫn lấy credentials đã được đối chiếu tài liệu chính thức. Không có tài khoản bên ngoài được tạo hoặc số/sender được mua trong bước đổi nhận diện.

Sau khi người dùng điền cấu hình OpenAI, đã gọi Responses API một lần với câu kiểm tra chung, không gửi dữ liệu sức khỏe và dùng store:false. Kết quả HTTP 429, code `credit_balance_exhausted`, type `insufficient_quota`: tổ chức chứa key không còn prepaid credits. Cần [thêm credits trong Billing](https://platform.openai.com/settings/organization/billing/overview) trước khi thử lại. Đổi `AI_DAILY_LIMIT`, gửi lại liên tục hoặc tạo key mới trong cùng tổ chức không tự khôi phục số dư. Xem [OpenAI error codes](https://developers.openai.com/api/docs/guides/error-codes). Đã sửa app để thông báo rõ nguyên nhân; chưa xác minh câu trả lời AI thành công và chưa kiểm thử SMS thật.
