# HealthyCheck — phân tích và kế hoạch

## Nguồn đã kiểm tra
- Workspace ban đầu trống; hướng dẫn AGENTS do người dùng cung cấp: có Postman CLI.
- Đã đọc `C:/Users/ASUS/Downloads/MotaDetai_SDLC.txt`: yêu cầu SRS, SDS, UML, code, hướng dẫn chạy, unit/integration tests, triển khai test và bảo trì.
- Bộ tham khảo `D:/7_healthy_check/healthy_check_all_screens`: đã xem Home và All Health Data. Học phân cấp tiêu đề, avatar mở hồ sơ, số liệu lớn kèm đơn vị, nhóm dữ liệu rõ. Không dùng điểm sức khỏe, số giả hay màu rực dày đặc của bản tham khảo.
- `healthy_check.pdf` đã được render 10 trang và xem tổng quan qua contact sheet; PDF gồm ảnh giao diện, không có lớp text. Đã xem riêng Home, All Health Data, Sleep, Sign In, Sharing. Học thêm biểu đồ cột theo ngày và giải thích quyền riêng tư ngay tại nơi thao tác. Không có ZIP/RAR trong workspace hoặc bộ tham khảo này; không dùng archive không liên quan ở ổ D.
- Node 22.16, npm 10.9, Git, Docker CLI, Postman; chưa có Python/Poppler/psql trên PATH, Docker engine chưa chạy.

## Quyết định
MariaDB + TypeORM là nguồn dữ liệu chính theo yêu cầu database đã được người dùng xác nhận; quản lý bằng HeidiSQL. Driver mysql2, migration có phiên bản và khóa chạy đồng thời, không synchronize schema. Thời điểm dùng DATETIME(3) UTC; ngày địa phương chuyển thành khoảng UTC ở backend để không phụ thuộc bảng timezone của MariaDB. NestJS 11, Expo SDK 57 / RN 0.86 / React 19.2.3 tương thích Node hiện có. Khóa phiên bản bằng lockfile. Không cần package contracts riêng ở MVP; schemas server là hợp đồng có tài liệu.

## MVP và actor
Actor: người dùng chưa xác minh, người dùng đã xác minh, SMS provider, OpenAI và hệ điều hành notification.
Luồng nghiệm thu: đăng ký → OTP → đăng nhập → hồ sơ → nhật ký → lịch thuốc → notification cục bộ → log uống → lịch sử → chat → đăng nhập lại.
Không có camera đo chỉ số, chẩn đoán, dữ liệu seed mặc định, push production hoặc offline health database.

## Màn hình
1. Đăng nhập/đăng ký/xác minh/quên mật khẩu.
2. Hôm nay: ngày theo timezone, nhắc tiếp theo, tổng nước/ngủ, mục tiêu, ghi nhanh.
3. Nhật ký: lọc ngày, thêm/sửa/xóa, 7/30 ngày và tùy chọn, khoảng thiếu số đo hiển thị trống.
4. Lịch nhắc: thuốc + lịch lặp nhiều giờ, occurrence và log, sửa/hủy.
5. Trợ lý: lịch sử, đồng ý chia sẻ tổng hợp hôm nay, gửi/hủy/thử lại/xóa.
6. Hồ sơ: tên, timezone, mục tiêu, phiên, đổi mật khẩu, xuất/xóa tài khoản.

## Triển khai theo giai đoạn
1. Nền và tài khoản: migration, OTP, sessions/rotation/revocation, giao diện auth.
2. Hồ sơ và nhật ký: owner-scoped CRUD, Zod, export/delete.
3. Hôm nay và thống kê: nhóm ngày theo IANA, mục tiêu và biểu đồ có khoảng trống.
4. Thuốc: schedule → occurrence có khóa duy nhất → log idempotent; cập nhật thông báo.
5. Realtime: socket có JWT + kiểm tra session, phòng do server chọn, invalidate/refetch khi reconnect.
6. AI: backend Responses API, consent từng lượt, timeout/usage/error/cancel/history.
7. QA: typecheck, unit/integration tests và manual trên thiết bị; ghi rõ kết quả thực tế.

## Tiêu chí nghiệm thu
Không endpoint nào đọc/ghi user khác; OTP hết hạn/dùng lại/khóa/giới hạn gửi; replay refresh thu hồi cả phiên; log thuốc một occurrence chỉ một bản ghi; sửa lịch không giữ occurrence tương lai cũ; đổi timezone không đổi lịch có timezone riêng; reconnect fetch nguồn chính; logout xóa query cache và notification; SMS lỗi không báo thành công; AI lỗi không tạo câu trả lời giả; notification từ chối vẫn dùng chức năng ghi log; tổng ngày đối chiếu SQL theo timezone. Những bước cần credentials và thiết bị phải ghi “chưa kiểm thử” nếu chưa chạy.
