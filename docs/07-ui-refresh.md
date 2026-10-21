# Cải tiến giao diện Ginkgo

Sản phẩm được đổi tên từ HealthyCheck sang Ginkgo theo nhận diện lá bạch quả. Bảng màu hiện tại: primary #327C59, sage #77B991, soft #E8F3EA, background #FAFBF8, accent #F2A995. Logo vector `apps/mobile/assets/ginkgo-mark.svg` được xuất PNG cho giao diện và icon; không thêm thư viện native. Prompt ảnh bên dưới là bản ghi gốc từ giai đoạn cải tiến giao diện trước khi đổi tên.

Ngày: 21/10/2026. Thay đổi trực tiếp trong ứng dụng Expo, tiếp tục sử dụng API và MariaDB hiện có. Không thêm dependency runtime.

## Thiết kế và thao tác

- Giữ nền #F7F8F5, xanh #237568, chữ #202B29. Dùng xanh nhạt cho nước, tím nhạt cho ngủ, màu đào cho cân nặng. Không dùng điểm sức khỏe hay đánh giá y khoa.
- Hôm nay: lời chào, bước bắt đầu cho người mới, ghi nhanh nước, hai số liệu ngủ/cân nặng, lịch thuốc gần nhất và các lối vào ghi chỉ số. Người mới không có số liệu mẫu.
- Đăng nhập: hai lựa chọn đăng nhập/tạo tài khoản; xác minh và quên mật khẩu là các bước riêng. Có hiện/ẩn mật khẩu. Số Việt Nam bắt đầu bằng 0 được đổi sang +84 trước khi gọi API. Không tự gửi OTP khi chưa bấm yêu cầu.
- Nhật ký: 7/30 ngày hoặc khoảng tùy chọn; chỉ gọi API sau khi áp dụng khoảng hợp lệ. Chọn loại biểu đồ theo hàng cuộn ngang. Sửa/xóa được mở từ nút tùy chọn của từng bản ghi. Biểu đồ để trống ngày thiếu dữ liệu.
- Lịch nhắc: tách “Lần uống” và “Lịch thuốc”. Cấu hình thông báo trong phần mở rộng. Chỉ cho xác nhận khi gần/đến giờ; API vẫn kiểm tra nghiệp vụ. Không dùng timer trong UI để thực thi nhắc nền.
- Lịch thuốc: nhập từng giờ uống, thêm/xóa giờ, chọn ngày lặp, thời gian áp dụng trong phần mở rộng. Kiểm tra giờ trùng, ngày và múi giờ trước khi lưu.
- Ghi chỉ số: biểu tượng và lựa chọn loại theo hàng cuộn; nước có mức 150/250/500 ml; tâm trạng có nhãn; ngủ nhập theo giờ, đổi sang phút trước khi lưu. Thời điểm đo được chỉnh trong phần mở rộng.
- Trợ lý: gợi ý có thể chọn, khung soạn tin cố định dưới vùng hội thoại, chia sẻ tổng hợp mặc định tắt, có hủy/thử lại và thông tin quyền riêng tư. Không thay đổi adapter hoặc cấu hình model.
- Hồ sơ: mục tiêu ngủ nhập bằng giờ, backend vẫn lưu phút; phiên đăng nhập, dữ liệu và mật khẩu được chia thành các phần có thể mở. Giữ xác nhận trước khi xóa.
- Thành phần chung có vùng chạm tối thiểu 48 px, tên truy cập cho nút có biểu tượng, bàn phím có vùng tránh trên Android/iOS. Bottom tabs tính padding theo safe area.

## Hình ảnh

Asset: `apps/mobile/assets/wellness-ritual.png`, được đóng gói cục bộ bằng React Native Image, không phụ thuộc URL bên ngoài. Ảnh có tính trang trí nên không được đọc lặp lại bởi screen reader. Được dùng ở màn đăng nhập, bước bắt đầu và trạng thái trống của nhật ký.

Tạo bằng công cụ tích hợp `image_gen.imagegen` (skill imagegen), không gọi API OpenAI của ứng dụng. Prompt cuối:

> Use case: illustration-story. Asset type: one editorial illustration for a Vietnamese personal wellness mobile app called HealthyCheck. Primary request: a beautiful quiet everyday self-care still life, a clear glass of water on a terracotta coaster, a small sage green notebook with an unmarked cover, a curved sprig with three green leaves, and a softly folded cream cloth. Sophisticated cut-paper gouache illustration with subtle paper grain, crisp clean silhouettes, warm natural light, warm off-white background #F7F8F5, deep teal #237568, sage, pale blue glass and small terracotta #D89666 accents. Wide landscape composition 3:2, objects grouped toward center-right, generous breathing room, visually calm, premium contemporary editorial illustration. No text, no lettering, no logo, no doctor, no medical cross, no pills, no interface, no chart, no frame, no gradient. This is an actual in-app illustration asset, not an app screenshot.

## Kiểm tra

Kiểm tra giao diện bằng Chrome headless và Playwright cài riêng ở `tmp/ui-review`, không thêm vào dependencies của app. Dùng server Expo tại origin localhost:8081 trong danh sách CORS; gọi API/MariaDB thật bằng tài khoản kiểm thử riêng, xóa tài khoản sau lượt chạy. Không mock phản hồi API. Ảnh chụp để ở `tmp/ui-review/screens` (không commit dữ liệu tài khoản).

Đã xác minh đăng nhập, tài khoản mới trống, thêm 250 ml nước và đối chiếu tổng backend; nhập 7,5 giờ ngủ lưu thành 450 phút; tạo lịch với 08:00 và 20:00; chọn gợi ý trợ lý; mở hồ sơ. Khoảng ngày không hợp lệ bị chặn; mục tiêu ngủ 8,5 giờ lưu thành 510 phút; AI chưa cấu hình hiển thị lỗi thật và nút gửi lại. Đã xem ảnh chụp mọi tab ở 320 px, không có tràn ngang document hay lỗi runtime trình duyệt. Android Hermes export, TypeScript và lint mobile PASS. Các kết quả được ghi thêm trong docs/04-testing.md.

Giới hạn: kiểm tra Chrome ở kích thước điện thoại không thay thế kiểm tra native. Cần người dùng kiểm tra lại bàn phím thực, cỡ chữ hệ thống lớn, safe area, quyền thông báo và nhận nhắc khi app ở nền. SMS/OpenAI thật vẫn cần credentials như trước.
