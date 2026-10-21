# MariaDB và HeidiSQL

## Cấu hình đã chuẩn bị

Docker service `mariadb` dùng MariaDB 11.8, InnoDB, utf8mb4_unicode_ci. Cổng máy tính **3307**, cổng container **3306**, volume riêng `healthycheck_mariadb`. Không tác động dịch vụ MariaDB native đang chạy trên máy. Hai database tách biệt: `healthycheck` để chạy app và `healthycheck_test` để chạy kiểm thử.

```powershell
docker compose up -d mariadb
npm run db:migrate
npm run db:status
npm run api
```

Root password là `MARIADB_ROOT_PASSWORD`, app password là `MARIADB_PASSWORD` trong Compose/.env; các fallback chỉ dành cho local. Password trong DATABASE_URL phải khớp app password và cần URL-encode nếu có ký tự đặc biệt. Không dùng root để chạy app. Thay biến môi trường không tự đổi mật khẩu đã được tạo trong volume cũ; dùng chức năng quản trị MariaDB để đổi rõ ràng và cập nhật `.env` tương ứng.

## Kết nối bằng HeidiSQL

1. Mở HeidiSQL → New session → MariaDB or MySQL (TCP/IP).
2. Hostname/IP `127.0.0.1`, port `3307`, user `healthycheck`, password lấy từ cấu hình local, database `healthycheck`.
3. Open → refresh database tree. Sau migration sẽ có 11 bảng nghiệp vụ và `schema_migrations`.
4. Xem dữ liệu, khóa ngoại và index trong các tab Table/Data/Indexes/Foreign keys. Cột DATETIME(3) của app là **UTC**, không phải giờ Windows; frontend chuyển sang timezone hồ sơ.
5. Có thể kiểm tra phiên bản/schema mà không sửa dữ liệu:

```sql
SELECT VERSION();
SELECT * FROM healthycheck.schema_migrations ORDER BY id;
SHOW CREATE TABLE healthycheck.occurrences;
SHOW INDEX FROM healthycheck.entries;
```

HeidiSQL là công cụ quản lý/kiểm tra. Không chỉnh cấu trúc bảng thủ công rồi bỏ qua migration trong source; mọi thay đổi schema cần migration mới để máy khác chạy lại được.

## Dùng MariaDB native có sẵn

Kết nối HeidiSQL bằng tài khoản quản trị MariaDB của bạn, chọn port thực tế (thường 3306), chạy SQL sau với mật khẩu local tự chọn. Không cần cung cấp mật khẩu quản trị cho ứng dụng:

```sql
CREATE DATABASE IF NOT EXISTS healthycheck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS healthycheck_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'healthycheck'@'127.0.0.1' IDENTIFIED BY 'THAY_BANG_MAT_KHAU_LOCAL';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON healthycheck.* TO 'healthycheck'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON healthycheck_test.* TO 'healthycheck'@'127.0.0.1';
```

Đặt DATABASE_URL và TEST_DATABASE_URL trong `.env` dùng host/port/password khớp server này, rồi chạy migration. App không tự tạo database hay thay đổi tài khoản quản trị. Bộ kiểm thử đã chạy trên MariaDB 11.8 trong Docker; chưa kiểm thử riêng bản MariaDB native 13.0.2 trên máy.

## Migration

TypeORM quản lý ba migration theo thứ tự:

1. `InitialSchema1792500000000`: bảng, PK, FK, unique và CHECK nền.
2. `AddLookupIndexes1792500001000`: index tối ưu theo owner/time/expiry; down bảo toàn index cần thiết cho FK InnoDB.
3. `LinkOtpOwner1792500002000`: cập nhật schema bằng FK OTP.phone → users.phone, cascade khi xóa tài khoản.

`npm run db:migrate` chỉ chạy phiên bản còn thiếu; chạy lại là no-op. `npm run db:status` báo còn pending hay không. `npm run db:revert` hoàn tác **một migration cuối**, chỉ dùng có chủ đích trên database thử hoặc khi đã sao lưu và đánh giá ảnh hưởng. Revert migration nền sẽ xóa bảng/dữ liệu, không dùng để khởi động thường ngày.

Runner dùng `GET_LOCK`/`RELEASE_LOCK` gắn với database và `migrationsTransactionMode:none`. MariaDB DDL có implicit commit; nếu lỗi giữa migration có thể đã thay đổi một phần schema. Các bước create/index và FK có kiểm tra tồn tại để hỗ trợ chạy lại; vẫn cần kiểm tra nguyên nhân và sao lưu trước thay đổi. Transaction InnoDB được dùng cho refresh rotation, rate limit, upsert entry/schedule có owner lock, log thuốc, AI usage/history, xuất snapshot, đổi mật khẩu và xóa tài khoản.

## Seed demo và tài khoản mới

Trong `.env` bật `DEMO_SEED_ENABLED=true`, đặt DEMO_PHONE chưa đăng ký và DEMO_PASSWORD ít nhất 10 ký tự, rồi `npm run seed:demo`. Seed dùng transaction, chỉ tạo tài khoản demo riêng đã xác minh, không trộn vào tài khoản đăng ký qua app. Chạy lại không tạo trùng và không ghi đè thông tin của demo đã tồn tại, kể cả mật khẩu; không cho seed vào phone của user thường. Production bị chặn. Dữ liệu chat mẫu ghi rõ không phải OpenAI thật; không có lời khuyên liều thuốc mẫu. Không gọi SMS/OpenAI khi seed.

User đăng ký mới luôn trống. Seed không tự chạy khi migrate hoặc khởi động server. Bộ integration kiểm tra cả tính tách biệt này và cleanup dữ liệu thử trong `healthycheck_test`.

## Quy ước driver và thời gian

Driver `mariadb` của TypeORM dùng mysql2; query raw dùng `?`, Date JS được serialize UTC với `timezone:'Z'`. DATETIME trả Date/JSON ISO UTC; DATE trả YYYY-MM-DD; JSON times/weekdays và TINYINT(1) được chuyển thành array/boolean trước khi trả API. Dùng UTC_TIMESTAMP(3) cho thời điểm database. Khoảng thống kê `[start,end)` được Luxon tính theo IANA ở backend, truy vấn bằng index user_id/measured_at; không phụ thuộc CONVERT_TZ hoặc bảng timezone hệ thống MariaDB. Test bao phủ ngày DST 23 giờ và độ chính xác milliseconds.

Nguồn: [TypeORM MariaDB/mysql2](https://typeorm.io/docs/drivers/mysql/), [MariaDB DDL implicit commit](https://mariadb.com/docs/server/reference/sql-statements/transactions/sql-statements-that-cause-an-implicit-commit).
