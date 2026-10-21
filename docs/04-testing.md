# Test plan, kết quả và bảo trì

Ngày thực hiện: 21/10/2026. Không có seed tự động vào dữ liệu người dùng mới.

## Đã chạy
| Kiểm tra | Kết quả thực tế |
|---|---|
| npm run build | Backend TypeScript build PASS |
| npm run typecheck | API + mobile PASS sau chuyển MariaDB |
| Mobile SDK 57 | Nâng React Native 0.86.3, React 19.2.3, TypeScript 6; typecheck và lint PASS sau sửa tương thích. Android Hermes export PASS |
| npm test | 10 unit PASS sau chuyển MariaDB; integration ở lệnh này được SKIP khi không có TEST_DATABASE_URL trong process |
| npm run test:integration | MariaDB 11.8: 13 ca integration + suite cha PASS, 0 thất bại, 0 bỏ qua |
| expo install --check | Đã nâng SDK 57 để khớp Expo Go trên điện thoại; dependency check PASS |
| expo-doctor SDK 57 | Sau cài sạch, khai báo expo-font ~57.0.4 và dedupe: 21/21 checks PASS; typecheck API/mobile và lint mobile PASS. |
| expo export | Android Hermes SDK 57 PASS. iOS/web đã export PASS ở bản SDK 55; cần xác minh lại runtime riêng sau nâng cấp |
| SDK mismatch | Điện thoại xác nhận API LAN truy cập được; lỗi là Expo Go 57 mở project 55. Sau nâng cấp, manifest tại 192.168.1.21:8081 trả exposdk:57.0.0, HTTP 200 |
| ExpoTopicSubscriptionModule | Điện thoại báo thiếu native module khi import barrel expo-notifications. Đã tách adapter local-notifications chỉ import các entry point nhắc cục bộ của SDK 57. Android Hermes export PASS; kiểm tra bytecode không chứa ExpoTopicSubscriptionModule, vẫn chứa ExpoNotificationScheduler và ExpoNotificationsHandlerModule. Cần xác nhận lại runtime và quyền thông báo trên điện thoại. Khi nâng SDK phải kiểm tra lại các entry point nội bộ này. |
| Khởi động Expo Go sau sửa | Bundle Android dev lấy trực tiếp từ Metro trả HTTP 200, không chứa ExpoTopicSubscriptionModule. Người dùng xác nhận đã vào màn hình đăng nhập qua exp://192.168.1.21:8081. Chưa xác nhận luồng đăng nhập hoặc cấp quyền/nhận nhắc thuốc trên thiết bị. |
| PDF tham khảo | Render 10 trang và xem contact sheet, không có lớp text; đã xem riêng Home, All Health Data, Sleep, Sign In, Sharing |
| UI trình duyệt sau cải tiến | Chrome headless + Playwright, viewport 390×844 và 320×740, đã xem ảnh chụp các màn hình chính. Đăng nhập, người mới trống, ghi 250 ml và đối chiếu tổng backend, 7,5 giờ ngủ lưu 450 phút, lịch hai giờ uống, chọn gợi ý AI, mở hồ sơ PASS. Tài khoản thử được xóa sau lượt chạy; không mock API. |
| UI: validation và lỗi | Khoảng ngày sai bị chặn trước khi đổi bộ lọc; AI chưa cấu hình hiển thị lỗi thật và nút gửi lại; mục tiêu ngủ 8,5 giờ lưu thành 510 phút. PASS. Không có lỗi runtime trình duyệt; không có tràn ngang document ở 320px. |
| UI: Android và ảnh | Expo Android Hermes export PASS sau đổi giao diện; ảnh wellness-ritual.png được đóng gói. Bundle không chứa ExpoTopicSubscriptionModule. TypeScript và lint mobile PASS. Native cỡ chữ lớn, bàn phím và thông báo vẫn cần chạy trên điện thoại. Xem docs/07-ui-refresh.md. |
| Metro dev server | Đã chuẩn bị port 8081 và mobile/.env trỏ API LAN 192.168.1.21:3000; cần kiểm tra thiết bị thật riêng |
| SMS/OpenAI thật | SMS chưa kiểm thử thật. Sau khi người dùng điền OpenAI, đã gửi một câu kiểm tra chung (không dữ liệu sức khỏe, store:false): OpenAI trả HTTP 429, code credit_balance_exhausted, type insufficient_quota. Đường kết nối tới provider đã được xác minh; chưa có câu trả lời AI thành công vì hết credits. Không in key hoặc nội dung lỗi thô. |
| Phân loại lỗi OpenAI | Đã phân biệt hết credits/hạn mức chi tiêu/rate limit/key/model/dịch vụ trong thông báo an toàn. 12 unit PASS, gồm chống lộ key/nội dung nhạy cảm và không tự retry; integration không chạy lại (SKIP trong npm test). |
| MariaDB / migration | Service mariadb trên 3307; ba migration TypeORM đã áp dụng vào healthycheck, có version/index/FK; integration kiểm tra revert/apply lại ở healthycheck_test |
| API local | Đã khởi động port 3000; GET /health trả 200 `{status:'ok'}`; SQL xác nhận MariaDB 11.8.9 và đủ 3 migration |
| Nhận diện Ginkgo | Đã đổi tên hiển thị, logo lá bạch quả SVG/PNG, icon/adaptive icon/favicon và bảng màu người dùng cung cấp. Expo config/manifest trả name Ginkgo, slug ginkgo, SDK 57. Đã xem Chrome 320/390 px, đúng màu primary #327C59, không có lỗi runtime. Android export, API/mobile typecheck, mobile lint và 10 unit PASS; integration không chạy lại ở bước nhận diện (npm test SKIP suite này). |

Unit tests: nhiều giờ uống và phạm vi lịch; ngày lặp; DST giờ không tồn tại/trùng; tổng ngày theo timezone và null ngày thiếu; validation unit/giờ trùng; dev SMS bị cấm production; provider SMS không-2xx/timeout không báo thành công; AI dùng model cấu hình/store:false/không tools, lỗi provider/empty/cancel/timeout không trả lời giả. AI/SMS provider tests dùng transport giả lập để kiểm tra lỗi, không phải bằng chứng dịch vụ thật hoạt động.

## Các ca integration đã chạy trên MariaDB thật
- Đăng ký → OTP → đăng nhập hai tài khoản thử.
- A ghi entry hai lần cùng UUID chỉ một hàng; B sửa/xóa entry của A trả 404; tổng hôm nay đúng, tài khoản mới trống.
- OTP dùng lại, gửi quá nhanh, quá hạn, sai 5 lần rồi nhập đúng đều bị từ chối.
- Tạo lịch → tạo occurrences → B xác nhận bị từ chối → A xác nhận đồng thời hai lần chỉ một log → status khác trả 409.
- Sửa/hủy lịch giữ log đã xác nhận; B không hủy lịch A.
- Rotate refresh → replay token cũ → token mới và access của phiên bị từ chối.
- Chưa cấu hình AI trả 503; logout vô hiệu cả access và refresh.
- Revert FK/index rồi apply lại; chạy migration lần nữa không thay đổi schema.
- UTF-8 tiếng Việt, DATETIME UTC millisecond, ngày DST 23 giờ và ngày không dữ liệu cho tổng chính xác.
- CHECK từ chối unit sai; UNIQUE từ chối số điện thoại trùng.
- Seed tạo 21 bản ghi ở user demo riêng, chạy lại không trùng, không seed vào user thường, tài khoản mới khác vẫn trống.
- AI API ghi/đọc/xóa cặp history, idempotency không gọi provider hai lần, consent chỉ gửi summary, lỗi upstream không tạo history giả. Dùng transport thử, không gọi dịch vụ OpenAI thật.
- Socket không xác thực bị đóng; event chỉ tới user A, B không nhận; reconnect fetch lại dữ liệu đã thay đổi khi offline; logout/thu hồi phiên đóng socket.
- Quên/đổi mật khẩu thu hồi các phiên, OTP không dùng sai mục đích hoặc dùng lại; xóa tài khoản cascade và token cũ bị từ chối.
- Mỗi lượt integration có namespace bộ đếm riêng trong NODE_ENV=test và cleanup riêng; tránh các lượt test trước làm chạm rate limit đăng ký. Threshold nghiệp vụ và production không đổi.

## Manual acceptance trên hai điện thoại
| ID | Thao tác | Mong đợi | Trạng thái |
|---|---|---|---|
| M01 | Đăng ký/xác minh/tạo hồ sơ | Lưu được và không có dữ liệu giả | Chưa chạy |
| M02 | Nhập số đo sát 00:00 UTC, đổi profile timezone | Tổng ngày/chart khớp ngày địa phương | Chưa chạy |
| M03 | Đo huyết áp thiếu tâm trương/đơn vị sai | Validation rõ, không lưu | Chưa chạy |
| M04 | Tạo nhiều giờ thuốc, tắt app | Local notification đến theo thiết bị; ghi nhận trạng thái OS | Chưa chạy |
| M05 | Từ chối notification | Báo thiếu quyền; vẫn xem và log thuốc được | Chưa chạy |
| M06 | Bấm đã uống hai lần/mạng chập chờn | Một log; không tự đổi liều | Chưa chạy |
| M07 | Sửa/hủy lịch trên A, B đang mở/reconnect | B refetch và cập nhật notification; không giữ lịch tương lai cũ | Chưa chạy |
| M08 | Mất mạng, mutation thất bại, reconnect | Lỗi rõ; không health cache trên đĩa; refetch nguồn chính | Chưa chạy |
| M09 | Logout A rồi login B | Không còn cache/notification A; màn hình B trống nếu mới | Chưa chạy |
| M10 | AI consent tắt/bật, hủy, timeout, retry, xóa | Payload tối thiểu, lỗi rõ, không trả lời giả | Chưa chạy |
| M11 | Thu hồi phiên B từ A | B mất quyền, socket bị đóng, yêu cầu login | Chưa chạy |
| M12 | Xuất dữ liệu rồi xóa tài khoản | Tệp JSON hợp lệ, temp xóa; cascade tài khoản | Chưa chạy |
| M13 | Máy 320px, chữ hệ thống lớn, bàn phím mở | Cuộn được, không che nút, vùng chạm ≥48px | Chưa chạy |

## Bảo trì
Sau nâng SDK 57, npm ghi nhận **29 cảnh báo (11 moderate, 18 high)**, không có critical ở lần cài cuối. Không dùng audit fix --force để ép các phiên bản ngoài bộ SDK. Cần tiếp tục đánh giá các cảnh báo và native runtime QA trước khi dùng ngoài đồ án; không coi việc nâng SDK là đã giải quyết toàn bộ cảnh báo.

Ưu tiên tiếp theo: runtime QA điện thoại/permission; provider credentials và kiểm thử sandbox của SMS/OpenAI; bổ sung streaming, pagination, delivery webhook, push/dev-build khi cần. Khi sửa schema thêm migration có số mới; không sửa schema bằng synchronize. Khi thay library mobile, chạy expo install --check, typecheck và bundle; cập nhật bảng kết quả với bằng chứng thực tế. MariaDB/HeidiSQL/migration/seed có hướng dẫn riêng ở docs/06-mariadb-heidisql.md.
