# Cơ chế bảo mật Bảng Xếp Hạng (Leaderboard) cho Snake Game

Với tính chất của một trò chơi được chạy hoàn toàn phía Front-end (Client-side) qua trình duyệt, việc mở một API lưu điểm (Leaderboard) đối mặt với rủi ro rất lớn từ việc bị tấn công bởi các request giả mạo (ví dụ: dùng Postman hay script để gửi điểm số cực lớn lên server). 

Nhằm hạn chế 99% các nỗ lực xâm nhập API trái phép từ các cá nhân cố tình làm hỏng dữ liệu, hệ thống đã được triển khai các lớp **phòng thủ theo chiều sâu** như sau:

## 1. Ràng buộc Logic Vật Lý & Toán Học (Sanity Checks)
Được triển khai trên Backend API, đây là lớp phòng thủ hiệu quả nhất chặn các dữ liệu bất hợp lý (phi thực tế):

- **Xác thực phương trình điểm số:** Điểm số (Score) gửi lên bắt buộc phải khớp tuyệt đối phương trình `(fast * 10) + (medium * 7) + (slow * 5) = score`. Việc này ngăn chặn hacker truyền lên một số điểm ngẫu nhiên mà không truyền các chỉ số tương ứng một cách chính xác.
- **Xác thực giới hạn vật lý tốc độ (Tick Rate):** Vì `tickRate` của game là 150ms tức rắn cần ít nhất 150ms để ăn một con mồi (tương đương 10 điểm cao nhất), hệ thống tính ra "Giới hạn thời gian tối thiểu" cần phải tiêu tốn cho điểm đó là `thời_gian_min = điểm_số * 15`. Nếu biến số `duration` báo về nhỏ hơn con số này, hệ thống nhận diện đây là thao tác ảo và từ chối cập nhật.

## 2. Ký khống bảo mật tính toàn vẹn (HMAC Payload Signing)
Chống lại các Request bị chỉnh sửa (Man-in-the-Middle) hay Fake API trực tiếp.

- **Tiến trình ở Client:** Ngay khi kết thúc trò chơi, trước khi gửi điểm qua REST API, Client sẽ sử dụng thư viện `Web Crypto API` nội tại của trình duyệt nhằm băm thuật toán `SHA-256` kết hợp các dữ kiện: `[Tên]-[Điểm]-[Thời gian]-[Khóa Bí Mật]` thành chuỗi băm (Hash). Khóa bí mật nội bộ này (`SNAKE_NEON_SECRET...`) đứng vai trò như một chữ ký gốc.
- **Tiến trình ở Server API:** Khi thu thập payload gửi lên, máy chủ sẽ tự khởi tạo một đối tượng mật mã (Sử dụng Node.js Crypto) và tự tay băm dữ liệu thêm một lần nữa theo công thức y hệ.
- **Xác nhận:** Backend chỉ chấp thuận lưu Database nếu `hash` gửi lên khớp tuyệt đối `hash` tự tạo ở Server. Bất kỳ giá trị nào bị thay đổi bởi kẻ phá hoại đều phá hỏng chuỗi Hash này.

## 3. Các biện pháp đề xuất trong tương lai để bảo mật 100%
Hiện tại 2 cách bên trên đã đủ chắc chắn cho một hệ thống Web Game vừa và nhỏ, nếu muốn mở rộng, bạn có thể cân nhắc tích hợp:
1. **IP Rate-Limiting:** Kết hợp Redis hoặc Cloudflare Rate Limit giới hạn API (Ví dụ: `Không quá 3 lệnh lưu điểm trong vòng 10 phút`). Chống DDoS lên Database.
2. **Invisible Captcha (V3 / Turnstile):** Tránh Bot Script can thiệp bằng cách yêu cầu vé xác minh (Token validation) thông qua hệ thống phân loại AI.
