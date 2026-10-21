# Ginkgo

Ứng dụng theo dõi sức khỏe cá nhân với nhận diện lá bạch quả. Tên trước đây: HealthyCheck. Xem [hướng dẫn điền .env, SMS và OpenAI](docs/08-environment-setup.md).

Ứng dụng quản lý sức khỏe cá nhân bằng tiếng Việt cho đồ án Lập trình di động. Mobile Expo/React Native/TypeScript; backend NestJS/TypeORM/MariaDB. Người dùng mới không có dữ liệu giả; seed demo là lệnh riêng cho tài khoản demo riêng.

## Chạy trên máy phát triển

Yêu cầu Node **22.16+**, npm và MariaDB. Cấu hình Docker dùng MariaDB **11.8**, port **3307** để tránh trùng dịch vụ MariaDB native thường ở 3306; quản lý database bằng **HeidiSQL**. Có thể dùng MariaDB cài sẵn thay Docker theo [hướng dẫn database](docs/06-mariadb-heidisql.md). Expo Go phải hỗ trợ SDK 57 hoặc dùng development build tương ứng.

```powershell
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Thay JWT_SECRET và OTP_PEPPER bằng hai chuỗi ngẫu nhiên khác nhau, >=32 ký tự.
# Không dùng giá trị ví dụ cho môi trường có dữ liệu cá nhân thật.
docker compose up -d mariadb
npm run db:migrate
npm run api
```

Terminal khác:

```powershell
if (!(Test-Path apps/mobile/.env)) { Copy-Item apps/mobile/.env.example apps/mobile/.env }
# Sửa EXPO_PUBLIC_API_URL theo hướng dẫn LAN bên dưới.
npm run mobile
```

Database là dịch vụ Docker `mariadb`, volume `healthycheck_mariadb`, chỉ bind lên `127.0.0.1:3307`. `.env` dùng `DATABASE_URL=mysql://healthycheck:<password>@127.0.0.1:3307/healthycheck`; TypeORM khai báo driver **mariadb**, connector **mysql2**. Không dùng PostgreSQL.

Migration chạy riêng và lưu phiên bản trong `schema_migrations`; không tự chạy khi API khởi động và luôn `synchronize:false`. MariaDB DDL có implicit commit, vì vậy migration không hứa rollback toàn bộ khi lỗi; có khóa `GET_LOCK` chống chạy đồng thời và lệnh `db:status`/`db:revert`. Các transaction nghiệp vụ dùng InnoDB. Không xóa volume khi muốn giữ dữ liệu. Có thể dừng bằng `docker compose stop mariadb`.

Trong HeidiSQL tạo session MariaDB/MySQL (TCP/IP), host `127.0.0.1`, port `3307`, user `healthycheck`, password khớp `.env`, database `healthycheck`. Xem bảng, dữ liệu và index tại đây; cập nhật schema bằng migration trong mã nguồn. Xem [hướng dẫn HeidiSQL và seed](docs/06-mariadb-heidisql.md).

`GET http://localhost:3000/health` trả `{status:"ok"}` khi database hoạt động. API listen `0.0.0.0:3000`. Không có tài khoản mặc định; tạo tài khoản qua app.

## Điện thoại thật và LAN

Máy tính và điện thoại cùng mạng Wi-Fi. Xem IPv4 của adapter Wi-Fi bằng `ipconfig`, rồi đặt ví dụ:

```dotenv
# apps/mobile/.env (chỉ có URL công khai, không có secret)
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

Restart Metro sau khi đổi `.env`. Mở URL `/health` trên điện thoại để kiểm tra API trước; nếu không tới được, kiểm tra firewall Windows (chỉ cho phép port 3000 trong mạng Private), VPN và client isolation của Wi-Fi. **localhost trên điện thoại là chính điện thoại**, không phải máy tính. Expo tunnel chỉ tunnel Metro, không tự tunnel API.

Quét QR bằng Expo Go tương thích SDK. Phần lõi, SecureStore và local notifications dùng module Expo. Remote push chưa được triển khai; nếu mở rộng phải dùng development build và kiểm thử điện thoại thật. Không dùng timer JavaScript làm nguồn nhắc nền.

```powershell
# Nếu Expo Go đang cài không hỗ trợ SDK 57:
cd apps/mobile
npx expo run:android
# Cần Android SDK/Java/device hoặc emulator; iOS native build cần macOS/Xcode.
```

`expo run:android` tạo development build local; có thể dùng EAS development build nếu cấu hình tài khoản riêng. Không có production deployment hay store release. Web chỉ phục vụ kiểm tra bố cục; token chỉ ở RAM, notification và native export cần kiểm thử điện thoại.

## Luồng demo

1. Đăng ký số dạng `+84901234567`, mật khẩu ít nhất 10 ký tự.
2. Mở Xác minh, bấm Gửi mã. Dev provider phải có `SMS_PROVIDER=dev`, `DEV_OTP_ENABLED=true`, `DEV_OTP_CODE=123456` trong `.env`. Đây **không phải SMS thật**; app nói rõ chế độ dev. Nhập mã được cấu hình; chờ ít nhất 60 giây giữa yêu cầu gửi.
3. Đăng nhập, mở avatar → đặt tên/múi giờ/mục tiêu.
4. Nhật ký → thêm số đo; kiểm tra biểu đồ, chỉnh sửa/xóa. Hôm nay tổng hợp số liệu thật.
5. Tạo lịch thuốc, cho phép notification trên thiết bị; chọn giờ sắp tới. Đợi thông báo, xác nhận đã uống; nhấn lại không sinh log mới. Lịch sử giữ nguyên sau chỉnh lịch.
6. Trợ lý hoạt động khi cấu hình OpenAI; tự chọn chia sẻ tổng hợp từng lượt. Không bật chia sẻ vẫn gửi được câu hỏi, không gửi context từ nhật ký hoặc history trước.
7. Đăng xuất/đăng nhập lại, hoặc mở thiết bị thứ hai để kiểm tra dữ liệu giữ đúng. Khi mất mạng ứng dụng báo lỗi và cho tải lại; không ghi offline.

## SMS thật

Đặt `SMS_PROVIDER=twilio`, cấu hình `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`. Adapter hiện dùng Twilio **Messaging REST API** để gửi mã do server sinh, lưu HMAC, không dùng Twilio Verify. Không có credentials sẽ trả 503, không báo thành công giả. HTTP không-2xx hoặc timeout 10 giây cũng trả lỗi; challenge thất bại bị vô hiệu hóa. Provider chấp nhận request không đồng nghĩa điện thoại chắc chắn đã nhận SMS; bản MVP chưa có delivery-status webhook.

Trước khi tích hợp thật phải kiểm tra với nhà cung cấp: trial chỉ gửi tới số đã xác minh hoặc bị giới hạn, sender hợp lệ cho Việt Nam/quốc gia nhận, geo permissions, quy định sender/brand, phí gửi và hạn mức chống lạm dụng. Không thể khẳng định khả dụng ở quốc gia cụ thể khi chưa kiểm tra tài khoản. Dev provider bị chặn trong production.

## OpenAI

Chỉ backend có `OPENAI_API_KEY` và `OPENAI_MODEL`. Chọn model có quyền truy cập Responses API trong tài khoản; không đặt key vào `EXPO_PUBLIC_*`. API gọi `/v1/responses` với `store:false`, timeout 30 giây, giới hạn 5 lượt/phút và `AI_DAILY_LIMIT` (mặc định 20 lượt/ngày UTC, kể cả lượt thất bại). Không retry tự động lên provider. Xem [tài liệu chính thức](https://developers.openai.com/api/docs/guides/text).

Không có tools thao tác dữ liệu. Khi đồng ý, chỉ gửi tổng ngày (không gửi số điện thoại, tên, thuốc hoặc ghi chú); giao diện nói rõ tin nhắn do người dùng nhập luôn được gửi. History có thể chứa câu trả lời nhắc lại dữ liệu cũ nên chỉ được gửi lại khi consent bật. Chưa streaming token; có trạng thái chờ, hủy, retry và xóa lịch sử. Chưa có credentials để xác minh tích hợp OpenAI thật.

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

Integration suite yêu cầu tên database có hậu tố `_test`, tự áp dụng migration, kiểm tra revert/apply, tạo tài khoản thử riêng rồi xóa dữ liệu thử trong finally. Các test không gọi SMS/OpenAI thật; AI có transport thử để kiểm tra history, consent và lỗi qua API/database thật. Test cases và kết quả tại [docs/04-testing.md](docs/04-testing.md). Chưa có kiểm chứng end-to-end trên điện thoại; bundle thành công không thay thế kiểm thử runtime/native.

## Seed demo riêng

Trong `.env`, đặt `DEMO_SEED_ENABLED=true`, chọn `DEMO_PHONE` chưa được đăng ký và `DEMO_PASSWORD` ít nhất 10 ký tự, rồi chạy `npm run seed:demo`. Script tạo riêng “Tài khoản demo” đã xác minh, 21 bản ghi minh họa trong 7 ngày, lịch nhắc, lịch sử xác nhận và hội thoại ghi rõ nội dung demo. Không gửi SMS hoặc gọi OpenAI. Chạy lại không tạo trùng, không ghi đè mật khẩu/dữ liệu đã có và từ chối seed vào user thường. Sau khi tạo xong có thể đặt cờ về `false`. Seed bị cấm trong production.

## Tài liệu và giới hạn

- [SRS, nguồn và kế hoạch](docs/01-analysis.md)
- [SDS, UML, ERD, thời gian và bảo mật](docs/02-design.md)
- [Hợp đồng API](docs/03-api.md)
- [Kiểm thử, kết quả và bảo trì](docs/04-testing.md)
- [MariaDB, HeidiSQL, migration và seed](docs/06-mariadb-heidisql.md)
- [Cải tiến giao diện, hình minh họa và kiểm tra UI](docs/07-ui-refresh.md)
- [Điền .env, lấy thông tin Twilio/OpenAI và chạy Ginkgo](docs/08-environment-setup.md)
- [Dashboard theo tham khảo, API thống kê và trạng thái kiểm tra](docs/09-reference-dashboard.md)

Giới hạn local: HTTP LAN chưa TLS, database local chưa mã hóa ở tầng app, chưa có backup/restore tự động, push, streaming AI, phân trang hoặc đồng bộ offline. Không dùng cho dữ liệu thật ngoài môi trường phát triển được kiểm soát. Notification lên lịch 14 ngày/tối đa 60 lần; mở app để làm mới. Thiết bị tắt app chưa nhận thay đổi lịch từ thiết bị khác. Những giới hạn này được nêu trong UI liên quan.
