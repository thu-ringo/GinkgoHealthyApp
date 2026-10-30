# Ginkgo demo: Vercel, Cloudflare Tunnel và APK

Web: https://ginkgo-healthy-app.vercel.app

Web và APK gọi NestJS qua HTTPS `*.trycloudflare.com`. API và MariaDB chạy trên máy tính của người triển khai. Đây là bản demo học tập: chỉ dùng dữ liệu giả và OTP thử `123456`, không gửi SMS thật. AI chưa có khóa mới nên chưa trả lời AI thật.

Máy tính cần bật, có mạng, không ngủ và tiến trình demo phải còn chạy. Đây không phải hosting luôn bật. Không tạo dịch vụ cloud trả phí.

## Chạy demo

`scripts/demo-runtime.mjs` dùng MariaDB có sẵn tại `D:\MariaDB 13.0.2\bin` (có thể đổi bằng `MARIADB_BIN`). Nó tạo data directory riêng tại `../demo-runtime/mariadb`, cổng **33307**, chỉ bind **127.0.0.1**, với user/mật khẩu ngẫu nhiên riêng. Không sửa database/dịch vụ MariaDB đang có.

Thông tin riêng lưu tại `../demo-runtime/secrets.json` và `../demo-runtime/.env`, ngoài repo. Không đưa các file này lên GitHub. `ginkgo_demo` chứa dữ liệu demo; `ginkgo_demo_test` dành riêng cho integration test.

Script chạy migration đã biên dịch, seed demo, API cổng 3000 và cloudflared. Cần cloudflared chính thức tại `../tools/cloudflared.exe`, Node.js và `npm ci`, `npm run build` trước lần chạy đầu.

Từ gốc repo:

```powershell
node scripts/demo-runtime.mjs --publish
```

Giữ tiến trình đó chạy khi demo. `--publish` tìm Vercel CLI trong npm cache trên máy và dùng phiên đăng nhập hiện có để cập nhật web. Có thể bỏ cờ này nếu tự deploy riêng.

## URL tunnel thay đổi

Script ghi URL công khai vào `apps/mobile/public/demo-api.json`, tạo `.env.local` cho mobile và cập nhật Vercel khi có `--publish`.

Profile `preview` trong `apps/mobile/eas.json` tạo APK độc lập, bật nhãn demo và đặt `EXPO_PUBLIC_API_CONFIG_URL=https://ginkgo-healthy-app.vercel.app/demo-api.json`. Khi khởi động, app tải cấu hình đó với `no-store`, chỉ chấp nhận HTTPS origin thuộc `*.trycloudflare.com`, không có credentials, query hoặc đường dẫn tùy ý. Khi Vercel đã cập nhật, đóng hẳn và mở lại APK để lấy URL mới; không cần cài lại APK chỉ vì tunnel đổi địa chỉ.

Không lưu secret trong `EXPO_PUBLIC_*` hoặc `demo-api.json`.

## Web và APK

`vercel.json` cấu hình build Expo web, SPA fallback và không cache cấu hình tunnel. Root Directory là gốc repo. Tự deploy cần ba build env: `EXPO_PUBLIC_API_URL` là tunnel hiện tại, `EXPO_PUBLIC_API_CONFIG_URL` như trên và `EXPO_PUBLIC_DEMO_MODE=true`.

Tại `apps/mobile`, đăng nhập Expo rồi chạy:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Keystore do Expo quản lý trong tài khoản `thuringo`. Không cần CH Play hoặc Expo Go. Khi Git clone local bị chặn trên Windows, EAS hỗ trợ `EAS_NO_VCS=1` và `EAS_PROJECT_ROOT` trỏ tới gốc repo; đây là cách đóng gói đã dùng. Dùng temp trong workspace nếu công cụ native không ghi được vào sandbox temp.

## Kiểm tra

- API/mobile typecheck và Expo lint đạt; API build thành công.
- 15 unit test đạt; integration riêng trên MariaDB test: 15 test/subtest đạt.
- Hai kiểm thử cấu hình runtime đạt, gồm từ chối credentials và host ngoài tunnel.
- Bundle Android/Hermes xuất được.
- API công khai: health, đăng nhập demo, hồ sơ có xác thực và đăng xuất hoạt động.
- Cần cài APK lên Android thật để kiểm tra quyền thông báo, nhắc thuốc và hành vi khi đóng app.

Chuyển sang dữ liệu thật cần môi trường/database riêng, `NODE_ENV=production`, SMS thật, tắt OTP dev/nhãn demo và hosting thích hợp.

## Bật trợ lý bằng tài khoản OpenAI của người triển khai

Lưu `OPENAI_API_KEY` và `OPENAI_MODEL` vào file riêng `../demo-runtime/ai.env`, ngoài repo. Launcher đọc file này và truyền vào backend; không đưa khóa vào Vercel, APK hoặc biến `EXPO_PUBLIC_*`. `scripts/demo-api.mjs` nạp lại cấu hình này khi API khởi động.

Model đã chọn là `gpt-6-luna`. Khóa cần hợp lệ, có quyền gọi model và tài khoản còn credits. Sau khi thay cấu hình, khởi động lại API; không cần build lại APK. Khóa từng được đưa vào repo công khai cần được thay thế.
