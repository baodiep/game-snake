# Kế hoạch Triển khai Game Snake

Kế hoạch này chi tiết hóa các bước để xây dựng một trò chơi Rắn săn mồi (Snake) sử dụng Next.js, Tailwind CSS và CSS thuần, bám sát các yêu cầu trong tài liệu.

## Điểm cần Người dùng Đánh giá & Phê duyệt

- **Lưu trữ Bảng xếp hạng (Leaderboard)**: Yêu cầu ghi rõ việc lưu điểm số dựa trên tên người dùng và địa chỉ IP. Do không có cơ sở dữ liệu cụ thể nào được chỉ định, tôi đề xuất sử dụng Next.js API route ghi vào một cơ sở dữ liệu SQLite cục bộ (ví dụ: thư viện `better-sqlite3`) để lưu điểm. **Vui lòng xác nhận xem SQLite có được chấp nhận cho bảng xếp hạng không.**

## Các thay đổi Đề xuất

### Thiết lập và Hạ tầng
- Khởi tạo một ứng dụng Next.js cơ bản với Tailwind CSS tại `c:\Users\Admin\source\repos\Snake`.
- Thiết lập cấu trúc thư mục chính của dự án (components, hooks, lib).

### Logic Cốt lõi (Core Engine) (`lib/engine/`)
#### [NEW] `lib/engine/gameLogic.ts`
- Định nghĩa các interface `GameState`, `Direction`, `Coordinate`.
- Triển khai các pure function (hàm thuần túy) `moveSnake`, `checkCollision`, `generateFood`, đảm bảo logic có tính xác định (deterministic), dễ test và tách biệt hoàn toàn khỏi UI.
- Triển khai các quy tắc để bỏ qua các lệnh quay đầu 180 độ tức thời (ví dụ: cố gắng quay SANG PHẢI trong khi rắn đang đi SANG TRÁI).

### Các Hooks (`hooks/`)
#### [NEW] `hooks/useGameLoop.ts`
- Triển khai vòng lặp trò chơi (game loop) tĩnh cho các React components.
- Sử dụng `requestAnimationFrame` để đảm bảo các nhịp (tick) mượt mà hơn thay vì `setInterval` để tránh các vấn đề không đồng bộ render của trình duyệt.
- Dọn dẹp state hiệu quả khi component unmount để tránh rò rỉ bộ nhớ.

### Giao diện Người dùng (`components/`)
#### [NEW] `components/GameBoard.tsx`
- Render (vẽ) lưới, rắn và mồi bằng CSS thuần và Tailwind.
#### [NEW] `components/StartScreen.tsx`
- Yêu cầu người dùng nhập tên trước khi chơi.
#### [NEW] `components/Leaderboard.tsx`
- Hiển thị các điểm số cao nhất được lấy từ backend API.

### Backend/API (`app/api/`)
#### [NEW] `app/api/leaderboard/route.ts`
- Xử lý việc lưu và trích xuất điểm thi đấu.
- Lấy địa chỉ IP từ headers của request (`x-forwarded-for` hoặc tương tự) để lưu kèm với tên người dùng.

## Kế hoạch Kiểm thử (Verification Plan)

### Kiểm thử Tự động (Automated Tests)
- Tùy chọn viết các bài test Jest hoặc Vitest cho logic core engine để xác minh logic tọa độ lưới, việc thân rắn dài ra chính xác, xử lý va chạm và ngăn chặn quay đầu 180 độ.

### Kiểm tra Thủ công (Manual Verification)
- Chạy Next.js development server ở máy local.
- Kiểm tra việc nhập một tên bất kỳ có khởi tạo thành công phiên chơi game mới hay không.
- Chơi thử game để đảm bảo chuyển động mượt mà và phản hồi chính xác với phím bấm.
- Quan sát việc sử dụng bộ nhớ trong quá trình reset game để đảm bảo không bị rò rỉ bộ nhớ.
- Đảm bảo leaderboard API lưu trữ thành công điểm số và địa chỉ IP sau các lần kết thúc game (Game Over).
