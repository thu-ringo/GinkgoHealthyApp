# Hướng dẫn cài đặt và chạy source GinkgoHealthyApp

Tài liệu hướng dẫn chạy bản phát triển trên Windows bằng PowerShell. Cấu hình trong [compose.yaml](compose.yaml) khởi chạy MariaDB; API NestJS và ứng dụng Expo được chạy riêng trên máy phát triển.

> **Tình trạng triển khai:** hướng dẫn này chỉ bao gồm môi trường local. Tài liệu và cấu hình hiện có không xác nhận dự án đã được deploy production hoặc phát hành lên cửa hàng ứng dụng. Không dùng các mật khẩu mặc định dành cho local với dữ liệu thật.

## 1. Chuẩn bị môi trường

Cài đặt:

- Node.js 22.16 trở lên (manifest khai báo mức tối thiểu Node.js `>=22.13`), kèm npm.
- Git nếu clone source bằng lệnh bên dưới.
- Docker Desktop và Docker Compose, sau đó mở Docker Desktop.
- Expo Go tương thích Expo SDK 57 để chạy trên điện thoại Android. Nếu phiên bản Expo Go không tương thích, xem mục xử lý lỗi thường gặp ở cuối tài liệu.

Nếu đã cài `winget`, có thể cài Git, Node.js LTS và Docker Desktop bằng PowerShell (bỏ qua gói đã có):

```powershell
winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
winget install --id Docker.DockerDesktop -e --accept-source-agreements --accept-package-agreements
```

**Kết quả mong đợi:** Windows Package Manager cài các ứng dụng tương ứng; Docker Desktop có thể yêu cầu hoàn tất onboarding hoặc khởi động lại Windows. Đóng/mở lại PowerShell sau khi cài Node/Git để cập nhật `PATH`.

Mở PowerShell và kiểm tra:

```powershell
node --version
npm --version
git --version
docker --version
docker compose version
```

**Kết quả mong đợi:** các lệnh in phiên bản; Node.js đáp ứng yêu cầu trên và Docker Desktop đang hoạt động. Nếu chưa cài Git, bỏ qua phần clone và chuyển đến thư mục source đã tải/giải nén.

## 2. Lấy source và cài dependencies

Ví dụ clone repository:

```powershell
New-Item -ItemType Directory -Force -Path C:\src | Out-Null
Set-Location C:\src
git clone https://github.com/thu-ringo/GinkgoHealthyApp.git
Set-Location .\GinkgoHealthyApp
Get-ChildItem package.json, package-lock.json, compose.yaml
```

Nếu source đã có trên máy, thay `Set-Location` bằng đường dẫn thư mục gốc của source. Thư mục gốc phải có `package.json`, `package-lock.json` và `compose.yaml`.

Cài đúng phiên bản dependency theo lockfile:

```powershell
npm ci
```

**Kết quả mong đợi:** npm kết thúc không có lỗi và các package workspace được cài. Nếu PowerShell báo không nhận diện `npm`, cài Node.js rồi mở lại terminal.

## 3. Tạo file môi trường local

Tạo file từ mẫu **chỉ khi file chưa tồn tại**, để tránh ghi đè cấu hình hoặc secret đang có:

```powershell
if (!(Test-Path .env)) {
  Copy-Item .env.example .env
}
if (!(Test-Path .\apps\mobile\.env)) {
  Copy-Item .\apps\mobile\.env.example .\apps\mobile\.env
}
notepad .env
```

**Kết quả mong đợi:** `.env` ở thư mục gốc chứa cấu hình backend/database; `apps\mobile\.env` chứa cấu hình public dành cho Expo. Nếu `.env` đã có sẵn, giữ nguyên các giá trị phù hợp và chỉ chỉnh biến cần thiết. Không chép secret backend sang file mobile.

Backend yêu cầu `JWT_SECRET` và `OTP_PEPPER` khác nhau, mỗi giá trị dài ít nhất 32 ký tự. Có thể tạo hai giá trị ngẫu nhiên bằng Node:

```powershell
node -e "const c=require('node:crypto');console.log('JWT_SECRET='+c.randomBytes(48).toString('hex'));console.log('OTP_PEPPER='+c.randomBytes(48).toString('hex'))"
notepad .env
```

**Kết quả mong đợi:** lệnh đầu in hai chuỗi khác nhau; thay hai biến tương ứng trong `.env` bằng các chuỗi vừa tạo. Không chụp màn hình, commit hoặc gửi các giá trị này. Không dùng giá trị placeholder cho môi trường có dữ liệu thật.

Các biến quan trọng:

| File | Biến | Cách dùng |
|---|---|---|
| `.env` | `DATABASE_URL` | Kết nối MariaDB local. Giá trị mẫu khớp mặc định của Compose; nếu tự đổi thông tin MariaDB, cập nhật URL cho khớp. |
| `.env` | `JWT_SECRET`, `OTP_PEPPER` | Hai secret khác nhau, tối thiểu 32 ký tự. |
| `.env` | `SMS_PROVIDER`, `DEV_OTP_ENABLED`, `DEV_OTP_CODE` | Chế độ `dev` dùng mã thử đã cấu hình, không gửi SMS thật. |
| `.env` | `CORS_ORIGINS` | Origin của Expo Web; mặc định `http://localhost:8081`. |
| `.env` | `OPENAI_API_KEY`, `OPENAI_MODEL` | Không bắt buộc để chạy app; chỉ cần khi dùng AI. Chỉ giữ key ở backend. |
| `.env` | `DEMO_SEED_ENABLED`, `DEMO_PHONE`, `DEMO_PASSWORD` | Chỉ dùng nếu chủ động tạo tài khoản demo. |
| `apps\mobile\.env` | `EXPO_PUBLIC_API_URL` | URL backend mà app có thể truy cập. Chỉ chứa địa chỉ API, không chứa secret. |

Các giá trị mẫu trong `.env.example` dành cho local development. Không dùng mật khẩu mặc định của Docker, JWT hay OTP ngoài máy cá nhân được kiểm soát. `.env` được Git ignore; không đưa nội dung file này vào README, ảnh chụp hoặc kho mã nguồn.

## 4. Khởi chạy MariaDB bằng Docker

Tại thư mục gốc dự án, chạy:

```powershell
docker compose up -d mariadb
docker compose ps
```

**Kết quả mong đợi:** service `mariadb` chạy và health status chuyển thành `healthy`. Compose map MariaDB ra `127.0.0.1:3307`; không cần cài HeidiSQL để ứng dụng hoạt động.

Nếu cần xem log khởi động:

```powershell
docker compose logs --tail 50 mariadb
```

Volume `healthycheck_mariadb` giữ dữ liệu giữa các lần dừng/chạy. Không chạy `docker compose down -v` nếu muốn giữ database.

## 5. Chạy migration và kiểm tra trạng thái schema

Migration không tự chạy khi API khởi động. Sau khi MariaDB đã khỏe, chạy:

```powershell
npm run db:migrate
npm run db:status
```

**Kết quả mong đợi:** migration áp dụng các thay đổi còn thiếu; lệnh status báo không còn migration chờ. Có thể chạy lại `db:migrate` an toàn để áp dụng phần còn thiếu. Không dùng `db:revert` như bước chạy thông thường; lệnh đó hoàn tác một migration và có thể làm mất cấu trúc/dữ liệu.

## 6. (Tùy chọn) Cấu hình OpenAI an toàn

Không cần OpenAI để mở app, tạo tài khoản hoặc dùng các tính năng không phải AI. Để bật trợ lý:

1. Tạo API key trong OpenAI Platform và kiểm tra quyền truy cập model, billing/credits của project.
2. Mở `.env` **ở thư mục gốc**:

   ```powershell
   notepad .env
   ```

   **Kết quả mong đợi:** Notepad mở file backend `.env`. Đặt `OPENAI_API_KEY` thành key mới của bạn và `OPENAI_MODEL` thành model mà project có quyền dùng Responses API. Ví dụ trong file mẫu là `gpt-4.1-mini`; quyền truy cập tùy tài khoản.
3. Không đặt key vào `EXPO_PUBLIC_*`, `apps\mobile\.env`, source code, README hay tài liệu nộp đồ án. Không gửi key trong chat hoặc ảnh chụp màn hình.
4. Khởi động lại backend sau khi sửa `.env`.

**Kết quả mong đợi:** backend không còn báo AI chưa được cấu hình. Điều đó chỉ xác nhận đã đọc cấu hình; cần gửi câu hỏi từ ứng dụng với tài khoản đã đăng nhập để kiểm tra provider. Lỗi key, quyền model, credits hoặc hạn mức phải xử lý trong OpenAI Platform. Không tuyên bố AI hoạt động thành công nếu chưa nhận được câu trả lời thật.

## 7. (Tùy chọn) Tạo tài khoản demo

Source hỗ trợ seed demo rõ ràng, chỉ cho môi trường không phải production. Seed tạo tài khoản đã xác minh và dữ liệu minh họa; không gửi SMS hoặc gọi OpenAI.

1. Chọn số điện thoại E.164 chưa tồn tại trong database và một mật khẩu demo riêng dài tối thiểu 10 ký tự.
2. Mở `.env`:

   ```powershell
   notepad .env
   ```

   **Kết quả mong đợi:** Notepad mở cấu hình backend. Đặt `DEMO_SEED_ENABLED=true`, rồi tự điền `DEMO_PHONE` và `DEMO_PASSWORD`. Không lưu mật khẩu demo vào tài liệu này.
3. Chạy lệnh:

```powershell
npm run seed:demo
```

**Kết quả mong đợi:** script báo tạo tài khoản demo hoặc tài khoản demo đã tồn tại; script từ chối chạy nếu cấu hình chưa bật, mật khẩu không hợp lệ, số đã thuộc user khác hoặc môi trường là production. Đăng nhập trong app bằng đúng thông tin bạn tự cấu hình. Sau khi seed, nên đặt lại `DEMO_SEED_ENABLED=false`.

Nếu không seed demo, không có tài khoản đăng nhập mặc định; hãy đăng ký qua ứng dụng.
# tài khoản demo : 0387052297
# pw tài khoản demo: 1234567890

## 8. Chạy backend NestJS và kiểm tra `/health`

Mở **PowerShell thứ nhất** tại thư mục gốc:

```powershell
npm run api
```

**Kết quả mong đợi:** tiến trình backend tiếp tục chạy và lắng nghe cổng `3000`. Giữ terminal này mở. Nếu tiến trình thoát ngay, xem thông báo lỗi; thường cần kiểm tra database, migration, `JWT_SECRET`, `OTP_PEPPER` và `SMS_PROVIDER`.

Mở **PowerShell thứ hai** tại thư mục gốc:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/health -TimeoutSec 5
Test-NetConnection -ComputerName 127.0.0.1 -Port 3000
```

**Kết quả mong đợi:** endpoint trả `{ "status": "ok" }` và kiểm tra cổng cho biết `TcpTestSucceeded: True`. `/health` thực hiện truy vấn database, nên lỗi tại đây thường nghĩa là API hoặc MariaDB chưa sẵn sàng.

## 9. Chạy trên Expo Web

Tại thư mục gốc, mở **PowerShell thứ ba**:

```powershell
npm run web -w apps/mobile
```

**Kết quả mong đợi:** Metro bundler khởi động; mở địa chỉ Web mà Expo in ra, thường là `http://localhost:8081`. Với port mặc định, cấu hình CORS mẫu đã cho phép origin này. Nếu Expo chọn port khác, thêm đúng origin `http://localhost:<port>` vào `CORS_ORIGINS` trong `.env`, rồi khởi động lại API.

Nếu ứng dụng chuyển đến đăng nhập/trang chủ thay vì onboarding, trạng thái hoàn tất có thể đã được lưu trong trình duyệt. Để xem lại, mở DevTools → Console, chạy `localStorage.removeItem("ginkgo.onboarding.completed")` rồi tải lại trang.

## 10. Chạy trên điện thoại Android thật

Điện thoại và máy tính cần cùng mạng Wi-Fi. Lấy IPv4 máy tính:

```powershell
Get-NetIPConfiguration |
  Where-Object { $_.IPv4DefaultGateway } |
  ForEach-Object { $_.IPv4Address.IPAddress }
```

**Kết quả mong đợi:** một hoặc nhiều địa chỉ IPv4 của adapter có gateway. Chọn địa chỉ Wi-Fi/LAN mà điện thoại truy cập được; không dùng `localhost` hoặc `127.0.0.1` làm địa chỉ API trên điện thoại.

Mở `apps\mobile\.env` và đặt `EXPO_PUBLIC_API_URL` tới máy tính, ví dụ:

```dotenv
EXPO_PUBLIC_API_URL=http://<IPv4-may-tinh>:3000
```

Thay phần `<IPv4-may-tinh>` bằng địa chỉ thật tìm được ở bước trên. Đây là URL public, không phải secret. Lưu file, rồi từ trình duyệt trên điện thoại mở `http://<IPv4-may-tinh>:3000/health`.

**Kết quả mong đợi:** điện thoại nhận `{ "status": "ok" }`. Nếu không, kiểm tra hai thiết bị cùng Wi-Fi, VPN/client isolation và Windows Firewall. Chỉ cho phép kết nối đến backend trong mạng Private; không mở cổng database `3307` ra Internet.

Khởi động Expo từ thư mục mobile:

```powershell
Set-Location .\apps\mobile
npx expo start --go --lan --clear --port 8081
```

**Kết quả mong đợi:** terminal hiển thị QR. Mở Expo Go tương thích SDK 57 trên Android và quét QR. Nếu điện thoại không tải được bundle, kiểm tra LAN/firewall, Expo Go có hỗ trợ SDK của project không, và khởi động lại Metro sau khi sửa `.env`.

Sau khi cập nhật `.env` của mobile, cần tải lại Metro/app để lấy API URL mới. Nếu origin Web đổi port, cập nhật `CORS_ORIGINS` trong `.env` backend và restart API.

## 11. Dừng các dịch vụ

- Dừng API hoặc Metro: quay lại terminal tương ứng và nhấn `Ctrl+C`.
- Dừng MariaDB nhưng giữ dữ liệu:

```powershell
docker compose stop mariadb
```

**Kết quả mong đợi:** service dừng; volume database vẫn được giữ. Lần sau dùng `docker compose start mariadb` hoặc `docker compose up -d mariadb`.

## 12. Kiểm tra mã nguồn

Các lệnh sau được khai báo trong `package.json`:

```powershell
npm run build
npm run typecheck
npm test
npm run lint -w apps/mobile
```

**Kết quả mong đợi:** mỗi lệnh kết thúc với exit code 0 nếu build, typecheck, unit tests và lint đạt. `npm test` là test backend; integration test MariaDB là lệnh riêng và có thể bị skip trong test thường.

Để chạy integration tests, trước hết cấu hình `TEST_DATABASE_URL` trỏ đến database kiểm thử riêng có hậu tố `_test`, sau đó:

```powershell
npm run test:integration
```

**Kết quả mong đợi:** báo cáo pass/fail của suite tích hợp; không trỏ `TEST_DATABASE_URL` vào database có dữ liệu cần giữ.

## 13. Xử lý lỗi thường gặp

| Triệu chứng | Cách kiểm tra/khắc phục |
|---|---|
| `docker compose` không kết nối được daemon | Mở Docker Desktop, chờ engine chạy, rồi thử `docker compose ps`. |
| Container MariaDB unhealthy hoặc API báo lỗi kết nối DB | Chạy `docker compose ps` và `docker compose logs --tail 50 mariadb`; kiểm tra `DATABASE_URL`, cổng `3307`, user/password đang dùng và migration. Với volume cũ, đổi password trong `.env` không tự đổi password lưu trong DB; không xóa volume để né lỗi. |
| API dừng khi khởi động vì secret ngắn | Đặt `JWT_SECRET` và `OTP_PEPPER` riêng biệt, mỗi giá trị ít nhất 32 ký tự. |
| API báo cấu hình `SMS_PROVIDER` | Đặt `SMS_PROVIDER=dev` cho local và đảm bảo chế độ OTP thử được bật theo `.env.example`; dev OTP không gửi SMS thật. |
| `/health` không trả `status: ok` | Kiểm tra API đang chạy, migration đã áp dụng, MariaDB healthy và cổng `3000` chưa bị ứng dụng khác chiếm. |
| Web báo CORS | Origin trình duyệt phải nằm trong `CORS_ORIGINS`; sau khi đổi biến, restart API. |
| Android báo không kết nối máy chủ | Đảm bảo `EXPO_PUBLIC_API_URL` dùng IPv4 LAN của máy tính, điện thoại truy cập được `/health`, hai thiết bị cùng mạng và firewall cho phép backend trong mạng Private. |
| Chat báo AI chưa được cấu hình | Đặt key/model trong `.env` gốc ở backend, không phải mobile, sau đó restart API. Không gửi key vào log hoặc tài liệu. |
| OpenAI trả lỗi key/model/quota | Kiểm tra key còn hiệu lực, quyền model Responses API và billing/credits trong project OpenAI. Việc đặt `AI_DAILY_LIMIT` cao hơn không tăng hạn mức của OpenAI. |
| Expo Go không tương thích hoặc báo thiếu native module | Kiểm tra phiên bản Expo Go và SDK 57. Nếu cần native build, cài Android Studio/Android SDK và dùng development build; đây là bước nâng cao, không bắt buộc cho Expo Web. |
| Web cảnh báo `useNativeDriver` | Đây là cảnh báo animation trên Web khi native animation module không có; thường chuyển sang JS driver và không đồng nghĩa API/backend lỗi. Kiểm tra riêng chức năng thực tế nếu animation bị ảnh hưởng. |

## 14. Tài liệu liên quan và phạm vi triển khai

- [README.md](README.md): tổng quan tính năng, kiến trúc và các lệnh chính.
- [docs/01-analysis.md](docs/01-analysis.md): phân tích yêu cầu và kế hoạch.
- [docs/02-design.md](docs/02-design.md): kiến trúc, mô hình dữ liệu và bảo mật.
- [docs/03-api.md](docs/03-api.md): hợp đồng REST/Socket.IO.
- [docs/04-testing.md](docs/04-testing.md): kết quả kiểm thử và các ca còn cần xác nhận.
- [docs/05-demo-report.md](docs/05-demo-report.md): dàn ý báo cáo và kịch bản demo.
- [docs/06-mariadb-heidisql.md](docs/06-mariadb-heidisql.md): database, HeidiSQL, migration và seed.
- [docs/07-ui-refresh.md](docs/07-ui-refresh.md): ghi chú thay đổi giao diện.
- [docs/08-environment-setup.md](docs/08-environment-setup.md): cấu hình dịch vụ và biến môi trường.
- [docs/09-reference-dashboard.md](docs/09-reference-dashboard.md): dashboard và thống kê.

Theo tài liệu kiểm thử hiện có, SMS thật và một câu trả lời OpenAI thành công chưa được xác nhận đầy đủ; các kiểm thử provider không thay thế kiểm thử tài khoản dịch vụ thật. Source hiện có Compose cho MariaDB, nhưng hướng dẫn này không xác nhận API/Web đã deploy production hoặc ứng dụng đã phát hành lên store.
