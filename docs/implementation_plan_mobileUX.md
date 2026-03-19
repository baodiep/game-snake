# Phương án Điều khiển trên Điện thoại (Mobile UX)

Để người chơi có trải nghiệm chơi game Snake mượt mà trên trình duyệt điện thoại (nơi không có bàn phím cứng), chúng ta cần áp dụng các cơ chế tương tác cảm ứng.

Dưới đây là 2 phương án khả thi và phổ biến nhất:

## Phương án 1 (Khuyên dùng): Vuốt cảm ứng (Swipe Gestures)
Đây là cách điều khiển hiện đại, gọn gàng và trực quan nhất cho mọi thiết bị cảm ứng.
- **Cách thức**: Người chơi vuốt lướt ngón tay (lên, xuống, trái, phải) ở bất kỳ đâu trên phần thân màn hình. Rắn sẽ lập tức chuyển hướng theo đường vuốt.
- **Tạm dừng**: Thay vì bấm phím Space, người chơi có thể **Chạm đúp (Double Tap)** vào màn hình để Pause/Resume trò chơi.
- **Ưu điểm**: Hoàn toàn ẩn, không làm rối giao diện UI, giữ nguyên thiết kế Neon Glassmorphism sang trọng. 

## Phương án 2: Nút bấm ảo (On-screen D-Pad)
Hiển thị 4 nút bấm điều hướng (Mũi tên Lên/Xuống/Trái/Phải) ở mảng trống phía dưới màn hình khi người dùng truy cập bằng điện thoại.
- **Cách thức**: Bấm trực tiếp vào các nút này giống như cầm tay cầm chơi game. 
- **Ưu điểm**: Quen thuộc với thế hệ cũ, cảm giác chính xác tuyệt đối không sợ nhận nhầm thao tác vuốt.
- **Nhược điểm**: Chiếm nhiều diện tích hiển thị của màn hình điện thoại vốn đã nhỏ, có thể phải che bớt cảnh chơi hoặc làm bố cục chật chội.

## Yêu cầu Đánh giá từ Người Dùng

> [!IMPORTANT]
> **Quyết định phương án điều khiển**
> Bạn vui lòng cho biết bạn muốn tôi triển khai **Phương án nào**? (Cũng có thể làm cả hai: Mặc định là Vuốt, nhưng có thêm nút gạt bật/tắt phím ảo D-pad).
> 
> *Cá nhân tôi khuyên dùng **Phương án 1 (Vuốt cảm ứng)** để UI luôn ở mức đẹp và gọn gàng nhất.*
