# Ginkgo — dashboard và thống kê theo bộ tham khảo

Nguồn tham khảo người dùng cung cấp ngày 21/10/2026: `D:\7_healthy_check\healthy_check.pdf` (10 trang ảnh, không có lớp text) và 10 ảnh màn hình riêng. Đã render PDF bằng pdfjs có sẵn trong thư mục công cụ tạm và xem bố cục ảnh. Không đưa tài liệu tham khảo hoặc nội dung ngoài project vào repository này.

## Hướng áp dụng

- Giữ màu Ginkgo: xanh #327C59, sage #77B991, nền #FAFBF8, điểm nhấn đào #F2A995.
- Hôm nay dùng bốn ô chỉ số, lối vào tất cả chỉ số, ghi nhanh nước, báo cáo 7 ngày và lịch thuốc gần nhất.
- Trang tất cả chỉ số dùng các hàng có biểu tượng, giá trị gần nhất và thời điểm ghi nhận; chạm để mở chi tiết.
- Trang chi tiết có Hôm nay/7 ngày/30 ngày, mục tiêu nước bằng vòng tiến độ, biểu đồ theo ngày, tổng/trung bình và bản ghi gần đây. Có chọn khoảng ngày khác và nút ghi chỉ số.
- Nhật ký tập trung vào lịch sử, lọc loại/ngày, sửa/xóa; biểu đồ chi tiết được chuyển sang trang riêng.
- Đăng nhập gọn hơn, không đặt ảnh minh họa lớn ở chế độ đăng nhập.

Chỉ áp dụng cho dữ liệu hiện có của Ginkgo: nước, ngủ, cân nặng, huyết áp, nhịp tim và tâm trạng. Không thêm điểm sức khỏe, bước chân/năng lượng ước đoán, dự đoán chu kỳ hay bài viết giả để lấp giao diện.

## Hợp đồng API mới

`GET /metrics/:kind?from=YYYY-MM-DD&to=YYYY-MM-DD`

- Yêu cầu access token; kind chỉ nhận water/sleep/weight/heart_rate/blood_pressure/mood.
- Trả timezone, from/to, unit, goal (nước/ngủ), days và summary.
- Mỗi ngày có date, value, secondary, count. Nước/ngủ cộng theo ngày; các chỉ số khác dùng số đo cuối ngày. Huyết áp giữ cặp tâm thu/tâm trương.
- Summary gồm total (chỉ nước/ngủ), average, averageSecondary, min, max, latest, latestSecondary, latestAt, recordCount, recordedDays, periodDays.
- Trung bình dùng ngày có dữ liệu làm mẫu số. Ngày thiếu là null, không nối hay thay thành zero.

`GET /health-data`

- Yêu cầu access token; chỉ đọc user của token, không nhận user_id để chọn người khác.
- Trả timezone và 6 chỉ số. Chỉ số thường dùng bản ghi gần nhất; nước/ngủ dùng tổng ngày địa phương có bản ghi mới nhất.
- Chưa có dữ liệu thì value/secondary/measured_at/day là null.

Không thay đổi schema; tiếp tục dùng MariaDB/TypeORM và các migration hiện có.

## Trạng thái trước lần push đầu tiên

- Typecheck API/mobile và lint mobile PASS.
- 15 unit test PASS, gồm cộng theo ngày/mẫu số trung bình, huyết áp và ngày DST/thiếu dữ liệu.
- Integration MariaDB: 14 ca con + suite cha PASS (15 tổng), gồm quyền sở hữu hai endpoint mới và validation.
- Đã chụp/xem màn đăng nhập, dashboard trống và tất cả chỉ số trống ở 390px.
- Kiểm tra UI tự động chưa hoàn tất: lượt chạy dừng ở locator trùng chuỗi “Chưa có bản ghi”; đã chỉnh locator nhưng chưa chạy xong lượt tiếp theo. Cần tiếp tục kiểm tra biểu đồ có dữ liệu, cập nhật sau mutation, viewport 320px và Android export sau lần đổi bố cục này. Đây là trạng thái đang triển khai, chưa phải nghiệm thu UI/native.
- Mã kiểm tra tạm, ảnh chụp và tài khoản thử không đưa vào Git. Tài khoản thử của lượt đã chạy đã được xóa.

SMS thật và câu trả lời OpenAI thành công vẫn có giới hạn như docs/08-environment-setup.md; lỗi OpenAI được kiểm tra trước đó là hết credits.
