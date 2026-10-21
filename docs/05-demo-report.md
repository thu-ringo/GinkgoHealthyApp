# Dàn ý báo cáo nhóm và kịch bản demo

Tài liệu này hỗ trợ nhóm tự điền thành viên, phân công và trình bày kết quả thật; không giả lập khảo sát hay phân công đã diễn ra.

1. **Bài toán:** người dùng muốn ghi lại chỉ số và nhắc thuốc trong một nơi, giữ quyền kiểm soát dữ liệu cá nhân.
2. **Requirement Analysis:** actor và use case trong SRS; giả định người dùng tự nhập số đo, có điện thoại Android/iOS và mạng tới API. Nhóm cần bổ sung biên bản khảo sát thật nếu môn học yêu cầu.
3. **System Design:** sơ đồ kiến trúc, ERD và sequence trong SDS; MariaDB/TypeORM, HeidiSQL, migration có phiên bản, UUID idempotency, UTC/IANA và tách schedule/occurrence/log.
4. **Implementation:** trình bày một luồng database → API → màn hình, cách owner scope, Argon2id, rotation và SecureStore hoạt động. Cho thấy tài khoản mới không có số liệu giả.
5. **Testing:** 10 unit tests của bản nền và 13 ca integration trên MariaDB đã đạt. Trình bày trung thực các manual/native/provider tests còn chờ; không coi transport thử là bằng chứng provider thật hoạt động.
6. **Deployment test:** Docker local, Expo Go/dev build và LAN URL. Không có production deployment hay cửa hàng ứng dụng.
7. **Maintenance:** cảnh báo dependency hiện hữu; kế hoạch chạy integration và runtime QA, thêm pagination/streaming/push nếu cần.
8. **Kết luận theo bằng chứng:** tính năng đã có mã nguồn, phần đã chạy, phần chưa chứng minh. Không trình bày ứng dụng là sản phẩm y tế được kiểm định.

Demo dự kiến 8 phút: tài khoản/xác minh (1 phút), hồ sơ/nhật ký (2), lịch thuốc/log (2), realtime hai thiết bị (1), consent AI/error config (1), dữ liệu tồn tại sau login và test report (1). Chỉ quay/chụp kết quả đã chạy thật; không dùng tài liệu thiết kế làm bằng chứng integration.
