# 🍃 Ginkgo – Ứng dụng theo dõi sức khỏe cá nhân

**Ginkgo** (tên cũ: HealthyCheck, nhận diện lá bạch quả) là ứng dụng di động bằng tiếng Việt giúp người dùng **tự ghi lại chỉ số sức khỏe hằng ngày**, **được nhắc uống thuốc đúng giờ** và **hỏi đáp với trợ lý AI**. Đây là đồ án môn Lập trình di động.

> Bắt đầu cài đặt và chạy source trên Windows? Xem [Hướng dẫn chạy source từng bước](HUONG_DAN_CHAY.md).

## Tính năng

| Nhóm | Mô tả |
|---|---|
| **Tài khoản** | Đăng ký bằng số điện thoại, xác minh OTP, đăng nhập, quên/đổi mật khẩu, quản lý và thu hồi phiên đăng nhập |
| **Chỉ số sức khỏe** | Ghi cân nặng, huyết áp, nhịp tim, nước uống, giấc ngủ, tâm trạng, ghi chú; chỉnh thời điểm đo, sửa, xóa |
| **Tổng quan** | Màn *Hôm nay*: nhắc thuốc tiếp theo, ghi nhanh nước, báo cáo 7 ngày; ngày thiếu dữ liệu để trống (không tính là 0) |
| **Nhật ký và thống kê** | Lịch sử bản ghi, lọc theo loại và ngày, biểu đồ 7/30 ngày, trung bình/tổng/nhỏ nhất/lớn nhất |
| **Nhắc thuốc** | Lịch thuốc nhiều giờ uống, lặp theo thứ, thông báo trên thiết bị, xác nhận *Đã uống* / *Bỏ qua* (không ghi trùng) |
| **Trợ lý AI** | Hỏi đáp qua OpenAI; chia sẻ dữ liệu sức khỏe **mặc định tắt**, chỉ gửi tổng hợp theo ngày khi người dùng bật |
| **Dữ liệu cá nhân** | Xuất toàn bộ dữ liệu, xóa tài khoản và dữ liệu |
| **Đồng bộ** | Realtime qua Socket.IO: sửa trên một thiết bị, thiết bị khác tự tải lại |

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Mobile | Expo (SDK 57), Expo Router, React Native, TypeScript, TanStack Query |
| Backend | NestJS 11, TypeORM (driver `mariadb`, connector `mysql2`), Socket.IO |
| Database | MariaDB 11.8 (Docker, cổng 3307), quản lý bằng HeidiSQL |
| Bảo mật | Argon2id, JWT (access 10 phút + refresh xoay vòng), SecureStore |
| Dịch vụ ngoài | Twilio Messaging API (SMS), OpenAI Responses API (trợ lý) |

## Kiến trúc

```
App mobile (Expo Router)
   │  TanStack Query (cache)
   │  REST API  +  Socket.IO (báo "dữ liệu đã đổi")
   ▼
Backend NestJS 11  (cổng 3000)
   │  TypeORM / SQL tham số hóa
   ▼
MariaDB 11.8  (cổng 3307)

Backend còn gọi:  SMS provider (Twilio hoặc dev)  |  OpenAI (chỉ từ server)
```

Các quyết định thiết kế chính (chi tiết: [docs/02-design.md](docs/02-design.md)):
- Lưu thời gian dạng **UTC**, tính "ngày" theo múi giờ của từng người dùng.
- App tự sinh **UUID** cho bản ghi, nên gửi lại khi mạng chập chờn không tạo bản trùng.
- Thuốc tách 3 tầng **Lịch → Lần uống → Nhật ký xác nhận**; sửa lịch không làm mất lịch sử.
- Nước và ngủ **cộng tổng** theo ngày; cân nặng, nhịp tim, huyết áp lấy **số đo cuối ngày**.

## Cấu trúc thư mục

```
GinkgoHealthyApp/
├── apps/
│   ├── api/              # Backend NestJS (REST, Socket.IO, migration, seed, test)
│   └── mobile/           # App Expo / React Native (app/, src/, assets/)
├── docs/                 # Tài liệu SRS, SDS, API, kiểm thử, hướng dẫn
├── infra/mariadb/        # SQL khởi tạo database (kể cả database test)
├── compose.yaml          # Docker Compose cho MariaDB
├── .env.example          # Mẫu cấu hình backend
├── HUONG_DAN_CHAY.md     # Hướng dẫn chạy source từng bước
└── README.md
```

## Chạy nhanh


Điều kiện: Node.js **22.16+** (package khai báo tối thiểu `>=22.13`), npm, Docker Desktop đang chạy và Expo Go tương thích SDK 57.

```powershell
git clone https://github.com/thu-ringo/GinkgoHealthyApp.git
Set-Location .\GinkgoHealthyApp
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path .\apps\mobile\.env)) {
  Copy-Item .\apps\mobile\.env.example .\apps\mobile\.env
}
notepad .env
notepad .\apps\mobile\.env
docker compose up -d mariadb
npm run db:migrate
```

Thay các secret backend mẫu trong `.env`; với Android thật, đặt API URL trong file mobile theo IPv4 máy tính. Không lưu key OpenAI vào file mobile.

Mở terminal thứ nhất tại thư mục gốc để chạy backend:

```powershell
npm run api
```

Mở terminal thứ hai tại thư mục gốc để chạy Expo:

```powershell
npm run mobile
```

Không chép đè `.env` đã có. Cần cấu hình secret backend và URL LAN cho Android trước khi dùng; xem đầy đủ các bước, kết quả mong đợi và cách xử lý lỗi trong [HUONG_DAN_CHAY.md](HUONG_DAN_CHAY.md).

## Chạy trên máy phát triển

Yêu cầu Node.js **22.16+** (package khai báo tối thiểu `>=22.13`), npm và MariaDB. Cấu hình Docker dùng MariaDB **11.8**, port **3307** để tránh trùng dịch vụ MariaDB native thường ở 3306; quản lý database bằng **HeidiSQL**. Có thể dùng MariaDB cài sẵn thay Docker theo [hướng dẫn database](docs/06-mariadb-heidisql.md). Expo Go phải hỗ trợ SDK 57 hoặc dùng development build tương ứng.

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Thay JWT_SECRET và OTP_PEPPER bằng hai chuỗi ngẫu nhiên khác nhau, >=32 ký tự.
# Không dùng giá trị ví dụ cho môi trường có dữ liệu cá nhân thật.
docker compose up -d mariadb
npm run db:migrate
npm run api
```


**Các biến `.env` quan trọng của backend**

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Kết nối database, mặc định khớp với Docker |
| `JWT_SECRET`, `OTP_PEPPER` | Hai khóa bí mật **khác nhau**, mỗi khóa ≥ 32 ký tự |
| `SMS_PROVIDER` | `dev` (không gửi SMS thật) hoặc `twilio` |
| `DEV_OTP_ENABLED`, `DEV_OTP_CODE` | Bật OTP thử và mã cố định (mặc định `123456`) |
| `CORS_ORIGINS` | Origin của bản web (mặc định `http://localhost:8081`) |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Chỉ cần khi dùng trợ lý AI |
| `DEMO_SEED_ENABLED`, `DEMO_PHONE`, `DEMO_PASSWORD` | Chỉ để tạo tài khoản demo |

Chi tiết từng biến: [docs/08-environment-setup.md](docs/08-environment-setup.md).

Database là dịch vụ Docker `mariadb`, volume `healthycheck_mariadb`, chỉ bind lên `127.0.0.1:3307`. `.env` dùng `DATABASE_URL=mysql://healthycheck:<password>@127.0.0.1:3307/healthycheck`; TypeORM khai báo driver **mariadb**, connector **mysql2**. Không dùng PostgreSQL.

Migration chạy riêng và lưu phiên bản trong `schema_migrations`; không tự chạy khi API khởi động và luôn `synchronize:false`. MariaDB DDL có implicit commit, vì vậy migration không hứa rollback toàn bộ khi lỗi; có khóa `GET_LOCK` chống chạy đồng thời và lệnh `db:status`/`db:revert`. Các transaction nghiệp vụ dùng InnoDB. Không xóa volume khi muốn giữ dữ liệu. Có thể dừng bằng `docker compose stop mariadb`.

Trong HeidiSQL tạo session MariaDB/MySQL (TCP/IP), host `127.0.0.1`, port `3307`, user `healthycheck`, password khớp `.env`, database `healthycheck`. Xem bảng, dữ liệu và index tại đây; cập nhật schema bằng migration trong mã nguồn. Xem [hướng dẫn HeidiSQL và seed](docs/06-mariadb-heidisql.md).

`GET http://localhost:3000/health` trả `{status:"ok"}` khi database hoạt động. API listen `0.0.0.0:3000`. Không có tài khoản mặc định: tạo tài khoản qua app hoặc dùng [tài khoản demo](#tài-khoản-demo).

**Lệnh hay dùng**

| Lệnh | Tác dụng |
|---|---|
| `npm run api` | Chạy backend (cổng 3000) |
| `npm run mobile` | Chạy Metro/Expo (cổng 8081) |
| `npm run db:migrate` · `db:status` · `db:revert` | Tạo bảng, xem trạng thái, hoàn tác migration |
| `npm run seed:demo` | Tạo tài khoản demo có dữ liệu mẫu |
| `npm run build` · `typecheck` · `test` | Build, kiểm tra kiểu, unit test |
| `npm run test:integration` | Test với MariaDB thật |

## Điện thoại thật và LAN

Máy tính và điện thoại cùng mạng Wi-Fi. Xem IPv4 của adapter Wi-Fi bằng `ipconfig`, rồi đặt ví dụ:

```dotenv
# apps/mobile/.env (chỉ có URL công khai, không có secret)
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

| Cách chạy | `EXPO_PUBLIC_API_URL` |
|---|---|
| Điện thoại thật | `http://<IPv4 máy tính>:3000` |
| Trình duyệt web (nhấn `w` trong Metro) | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |

Restart Metro sau khi đổi `.env`. Mở URL `/health` trên điện thoại để kiểm tra API trước; nếu không tới được, kiểm tra firewall Windows (chỉ cho phép port 3000 trong mạng Private), VPN và client isolation của Wi-Fi. **localhost trên điện thoại là chính điện thoại**, không phải máy tính. Expo tunnel chỉ tunnel Metro, không tự tunnel API.

Quét QR bằng Expo Go tương thích SDK. Phần lõi, SecureStore và local notifications dùng module Expo. Remote push chưa được triển khai; nếu mở rộng phải dùng development build và kiểm thử điện thoại thật. Không dùng timer JavaScript làm nguồn nhắc nền.

```powershell
# Nếu Expo Go đang cài không hỗ trợ SDK 57:
cd apps/mobile
npx expo run:android
# Cần Android SDK/Java/device hoặc emulator; iOS native build cần macOS/Xcode.
```

`expo run:android` tạo development build local; có thể dùng EAS development build nếu cấu hình tài khoản riêng. Không có production deployment hay store release. Web chỉ phục vụ kiểm tra bố cục; token chỉ ở RAM, notification và native export cần kiểm thử điện thoại.

## Tài khoản demo

Hệ thống **không có tài khoản mặc định**. Để có tài khoản demo kèm dữ liệu mẫu, sửa `.env`:

```dotenv
DEMO_SEED_ENABLED=true
DEMO_PHONE=+84900000001
# Tự đặt DEMO_PASSWORD riêng, tối thiểu 10 ký tự; không dùng giá trị mẫu.
```


Chi tiết về dữ liệu mẫu: xem mục [Seed demo riêng](#seed-demo-riêng).

## Luồng demo

1. Đăng ký số dạng `+84901234567`, mật khẩu ít nhất 10 ký tự.
2. Mở Xác minh, bấm Gửi mã. Dev provider phải có `SMS_PROVIDER=dev`, `DEV_OTP_ENABLED=true`, `DEV_OTP_CODE=123456` trong `.env`. Đây **không phải SMS thật**; app nói rõ chế độ dev. Nhập mã được cấu hình; chờ ít nhất 60 giây giữa yêu cầu gửi.
3. Đăng nhập, mở avatar → đặt tên/múi giờ/mục tiêu.
4. Nhật ký → thêm số đo; kiểm tra biểu đồ, chỉnh sửa/xóa. Hôm nay tổng hợp số liệu thật.
5. Tạo lịch thuốc, cho phép notification trên thiết bị; chọn giờ sắp tới. Đợi thông báo, xác nhận đã uống; nhấn lại không sinh log mới. Lịch sử giữ nguyên sau chỉnh lịch.
6. Trợ lý hoạt động khi cấu hình OpenAI; tự chọn chia sẻ tổng hợp từng lượt. Không bật chia sẻ vẫn gửi được câu hỏi, không gửi context từ nhật ký hoặc history trước.
7. Đăng xuất/đăng nhập lại, hoặc mở thiết bị thứ hai để kiểm tra dữ liệu giữ đúng. Khi mất mạng ứng dụng báo lỗi và cho tải lại; không ghi offline.


## Kiểm thử

```powershell
npm run build
npm run typecheck
npm test
cd apps/mobile
npx expo install --check
npx expo export --platform all
```

`npm test` chạy unit tests và **bỏ qua integration** nếu không có `TEST_DATABASE_URL` trong process. Lệnh chuyên biệt dưới đây nạp `.env` và chạy MariaDB integration trên database riêng. Docker volume mới tự tạo `healthycheck_test` qua SQL trong `infra/mariadb`. Với MariaDB native, tạo database test bằng HeidiSQL theo tài liệu:

```powershell
# Trong .env: TEST_DATABASE_URL=mysql://healthycheck:<password>@127.0.0.1:3307/healthycheck_test
npm run test:integration
```


## Seed demo riêng

Trong `.env`, đặt `DEMO_SEED_ENABLED=true`, chọn `DEMO_PHONE` chưa được đăng ký và `DEMO_PASSWORD` ít nhất 10 ký tự, rồi chạy `npm run seed:demo`. Script tạo riêng “Tài khoản demo” đã xác minh, 21 bản ghi minh họa trong 7 ngày, lịch nhắc, lịch sử xác nhận và hội thoại ghi rõ nội dung demo. Không gửi SMS hoặc gọi OpenAI. Chạy lại không tạo trùng, không ghi đè mật khẩu/dữ liệu đã có và từ chối seed vào user thường. Sau khi tạo xong có thể đặt cờ về `false`. Seed bị cấm trong production.

## SMS thật

Đặt `SMS_PROVIDER=twilio`, cấu hình `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`. Adapter hiện dùng Twilio **Messaging REST API** để gửi mã do server sinh, lưu HMAC, không dùng Twilio Verify. Không có credentials sẽ trả 503, không báo thành công giả. HTTP không-2xx hoặc timeout 10 giây cũng trả lỗi; challenge thất bại bị vô hiệu hóa. Provider chấp nhận request không đồng nghĩa điện thoại chắc chắn đã nhận SMS; bản MVP chưa có delivery-status webhook.

Trước khi tích hợp thật phải kiểm tra với nhà cung cấp: trial chỉ gửi tới số đã xác minh hoặc bị giới hạn, sender hợp lệ cho Việt Nam/quốc gia nhận, geo permissions, quy định sender/brand, phí gửi và hạn mức chống lạm dụng. Không thể khẳng định khả dụng ở quốc gia cụ thể khi chưa kiểm tra tài khoản. Dev provider bị chặn trong production.

## OpenAI

Chỉ backend có `OPENAI_API_KEY` và `OPENAI_MODEL`. Chọn model có quyền truy cập Responses API trong tài khoản; không đặt key vào `EXPO_PUBLIC_*`. API gọi `/v1/responses` với `store:false`, timeout 30 giây, giới hạn 5 lượt/phút và `AI_DAILY_LIMIT` (mặc định 20 lượt/ngày UTC); lượt chỉ được tính khi câu trả lời hoàn tất và được lưu. Không retry tự động lên provider. Xem [tài liệu chính thức](https://developers.openai.com/api/docs/guides/text).

Không có tools thao tác dữ liệu. Khi đồng ý, chỉ gửi tổng ngày (không gửi số điện thoại, tên, thuốc hoặc ghi chú); giao diện nói rõ tin nhắn do người dùng nhập luôn được gửi. History có thể chứa câu trả lời nhắc lại dữ liệu cũ nên chỉ được gửi lại khi consent bật. Chưa streaming token; có trạng thái chờ, hủy, retry và xóa lịch sử. Theo kết quả ghi trong [docs/04-testing.md](docs/04-testing.md), kết nối OpenAI đã được thử nhưng provider trả lỗi thiếu credits; chưa xác nhận nhận được câu trả lời AI thành công.

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [docs/01-analysis.md](docs/01-analysis.md) | SRS, nguồn và kế hoạch |
| [docs/02-design.md](docs/02-design.md) | SDS, UML, ERD, thời gian và bảo mật |
| [docs/03-api.md](docs/03-api.md) | Hợp đồng API |
| [docs/04-testing.md](docs/04-testing.md) | Kiểm thử, kết quả và bảo trì |
| [docs/05-demo-report.md](docs/05-demo-report.md) | Dàn ý báo cáo và kịch bản demo |
| [docs/06-mariadb-heidisql.md](docs/06-mariadb-heidisql.md) | MariaDB, HeidiSQL, migration và seed |
| [docs/07-ui-refresh.md](docs/07-ui-refresh.md) | Cải tiến giao diện, hình minh họa, kiểm tra UI |
| [docs/08-environment-setup.md](docs/08-environment-setup.md) | Điền `.env`, lấy thông tin Twilio/OpenAI, chạy Ginkgo |
| [docs/09-reference-dashboard.md](docs/09-reference-dashboard.md) | Dashboard theo tham khảo, API thống kê |
| [HUONG_DAN_CHAY.md](HUONG_DAN_CHAY.md) | Hướng dẫn chạy source từng bước |

## Giới hạn

Giới hạn local: HTTP LAN chưa TLS, database local chưa mã hóa ở tầng app, chưa có backup/restore tự động, push, streaming AI, phân trang hoặc đồng bộ offline. Không dùng cho dữ liệu thật ngoài môi trường phát triển được kiểm soát. Notification lên lịch 14 ngày/tối đa 60 lần; mở app để làm mới. Thiết bị tắt app chưa nhận thay đổi lịch từ thiết bị khác. Những giới hạn này được nêu trong UI liên quan.

## Nhóm thực hiện: 16


Giảng viên hướng dẫn: *Nguyễn Minh Hải*
