# Bản web Vercel và APK cài thử

## Điều kiện kết nối

Vercel triển khai giao diện Expo web. Backend NestJS (bao gồm Socket.IO) và MariaDB cần triển khai riêng. Không đưa database hoặc các secret vào frontend.

Để dùng cả web và APK online, cần API công khai qua HTTPS. `http://192.168.1.10:3000` trong tài liệu là ví dụ LAN, không phải API online. Cấu hình CORS của backend cho phép đúng origin Vercel sau khi biết tên miền.

Bản release không tự suy ra API localhost. Đặt `EXPO_PUBLIC_API_URL` trước khi build; biến này được nhúng vào bundle. Đổi URL cần build lại.

## Vercel

1. Đăng nhập bằng `npx vercel@latest login` tại thư mục gốc repo.
2. Liên kết dự án bằng `npx vercel@latest link`.
3. Thêm biến `EXPO_PUBLIC_API_URL` với URL HTTPS thực tế: `npx vercel@latest env add EXPO_PUBLIC_API_URL production`.
4. Chạy `npx vercel@latest --prod` từ thư mục gốc repo.

`vercel.json` đã cấu hình npm workspaces, lệnh `npm run build:web`, đầu ra `apps/mobile/dist` và fallback cho Expo Router. Nếu import GitHub bằng dashboard, chọn Root Directory là gốc repo, không phải `apps/mobile`.

## Backend online

`Dockerfile.api` đóng gói riêng NestJS cho máy chủ/container có hỗ trợ WebSocket và kết nối MariaDB. Đây là cấu hình chuẩn bị; chưa tạo dịch vụ cloud hoặc database.

1. Build từ gốc repo: `docker build -f Dockerfile.api -t ginkgo-api .`.
2. Tạo MariaDB có lưu trữ bền vững, cấu hình `DATABASE_URL` truy cập được từ API. Ưu tiên mạng riêng giữa API và database.
3. Đặt secret qua trang cấu hình dịch vụ hoặc file `.env.production` ngoài Git: `NODE_ENV=production`, `DATABASE_URL`, hai secret ngẫu nhiên khác nhau `JWT_SECRET`/`OTP_PEPPER`, `SMS_PROVIDER=twilio`, `DEV_OTP_ENABLED=false`, thông tin Twilio, `CORS_ORIGINS` là origin web chính xác. Khóa AI là tùy chọn nhưng cần khóa hợp lệ nếu dùng trợ lý.
4. Chạy migration riêng: `docker run --rm --env-file .env.production ginkgo-api node apps/api/dist/migrate.js` (database phải truy cập được từ container).
5. Khởi chạy API với cùng biến môi trường; expose cổng 3000 qua HTTPS của nhà cung cấp hoặc reverse proxy. Kiểm tra `/health` trả `{"status":"ok"}`.
6. Dùng URL HTTPS đó cho Vercel và EAS. Thiết lập backup database trên máy chủ/nhà cung cấp trước khi lưu dữ liệu cần giữ.

Không dùng giá trị secret mẫu hoặc OTP dev cho dịch vụ công khai. Không có thông tin Twilio thì chức năng gửi SMS thật chưa hoạt động.

### Railway

- API: deploy từ thư mục gốc với `railway.json` và `Dockerfile.api`. Migration chạy ở bước pre-deploy; healthcheck `/health` xác nhận kết nối database.
- Database: dùng image `mariadb:11.8`, gắn volume bền vững tại `/var/lib/mysql`; tạo database `healthycheck` và user riêng qua biến `MARIADB_DATABASE`, `MARIADB_USER`, `MARIADB_PASSWORD`, `MARIADB_ROOT_PASSWORD`.
- API kết nối database qua private networking, cổng 3306. Không tạo public TCP proxy cho database.
- Tạo domain HTTPS cho API; đặt `CORS_ORIGINS=https://ginkgo-healthy-app.vercel.app`.
- Đặt `EXPO_PUBLIC_API_URL` cùng URL HTTPS vào Vercel production và EAS preview, rồi build lại cả hai.
- Dịch vụ chỉ được tạo sau khi xác nhận kết nối tài khoản. Kiểm tra credits/plan trong tài khoản; không tự nâng cấp gói trả phí.

### Bản demo online theo yêu cầu

Đây là môi trường thử riêng, không phải môi trường tiếp nhận dữ liệu sức khỏe thật. Người dùng đã chọn OTP thử khi chưa có Twilio.

- Backend: `NODE_ENV=development`, `SMS_PROVIDER=dev`, `DEV_OTP_ENABLED=true` và mã thử 6 chữ số được cấu hình trên server. Giữ JWT/OTP pepper ngẫu nhiên, riêng cho môi trường demo.
- Web/APK: `EXPO_PUBLIC_DEMO_MODE=true` để hiện nhãn demo. Hướng dẫn người thử dùng số và dữ liệu giả, cùng mã OTP thử đã thông báo.
- Chưa có OpenAI key mới hợp lệ thì trợ lý sẽ báo chưa được cấu hình; không mô phỏng câu trả lời AI thành công.
- Khi chuyển sang dùng thật: tạo môi trường/database riêng, `NODE_ENV=production`, SMS thật, tắt demo và OTP dev; không tái sử dụng tài khoản hoặc dữ liệu thử.

### Render + MariaDB Cloud (phương án thay thế Railway)

Railway đã từ chối đăng ký mới trong lần triển khai này. Phương án thay thế giữ nguyên NestJS và MariaDB:

- Render: `render.yaml` khai báo API Docker, gói Free, Singapore, migration trước khi khởi động và healthcheck `/health`. Không dùng ổ đĩa tạm của Render để lưu database.
- MariaDB Cloud: chọn Free Developer Tier serverless khi có trong tài khoản, không chọn database trả phí. Free tier hiện giới hạn 10 MCU-hours/tháng; database tạm dừng khi hết hạn mức.
- Điền `DATABASE_URL` bằng thông tin kết nối thực tế, URL-encode mật khẩu nếu cần. `DATABASE_SSL=true` bật TLS và luôn xác minh chứng chỉ server. Nếu nhà cung cấp yêu cầu CA riêng, thêm PEM vào `DATABASE_SSL_CA` với newline thật; không tắt xác minh chứng chỉ.
- Cho phép IP outbound của dịch vụ Render trong allowlist MariaDB Cloud, theo thông tin thực tế của hai dịch vụ.
- API demo dùng OTP thử `123456`, không gửi SMS thật; chỉ dùng dữ liệu giả.
- Render Free tạm ngủ sau thời gian không hoạt động; lần truy cập lại có thể chậm. Chỉ báo triển khai thành công sau khi `/health` và luồng tài khoản/lưu dữ liệu đã được thử.

## APK qua EAS

1. Vào `apps/mobile`, chạy `npx eas-cli@latest login`.
2. Chạy `npx eas-cli@latest init` để liên kết với dự án Expo của bạn.
3. Tạo biến API ở môi trường preview: `npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_API_URL --visibility plaintext --value https://YOUR-REAL-API-HOST` (thay URL trước khi chạy).
4. Chạy `npx eas-cli@latest build --platform android --profile preview`.
5. Nếu đây là bản đầu tiên và chưa có khóa ký Android, chọn tạo keystore trên EAS. Giữ khóa để cập nhật cùng ứng dụng về sau.
6. Tải file `.apk` từ bản build thành công, chuyển sang điện thoại và cho phép cài đặt từ nguồn này khi Android yêu cầu.

Profile preview tạo APK độc lập, không yêu cầu Expo Go hoặc Metro, và không đăng lên CH Play. Backend vẫn phải hoạt động để đăng nhập và dùng dữ liệu.

## Kiểm tra bản cuối

- `npm run typecheck`
- Trong `apps/mobile`: `npm run lint`
- Tại gốc: `npm test` và `npm run build:web`
- Kiểm tra trình duyệt: onboarding, đăng nhập, ghi dữ liệu, tải lại URL trực tiếp.
- Kiểm tra Android thật: đăng nhập, lưu dữ liệu, quyền thông báo, nhắc thuốc khi app đóng và mở lại app.

Chỉ kiểm tra unit test không xác nhận kết nối MariaDB, SMS hoặc AI; cần chạy integration test với database test và thử các dịch vụ thực tế trước khi báo đã kiểm chứng các chức năng này.
