# Cập nhật bảo mật API Leaderboard

## Tóm tắt nội dung
Logic validate điểm số (score) của API gửi điểm lên server đã được cập nhật để phù hợp với cơ chế tính điểm mới. Cách tính cũ quá khắt khe, không bao gồm điểm thưởng (combo multiplier) và thức ăn đặc biệt (bonus food), dẫn đến việc từ chối các điểm số hợp lệ từ người chơi, hiển thị cảnh báo "Hack detected".

## Chi tiết các thay đổi

*   **1. Thay đổi cách kiểm tra tính hợp lệ của Score so với Tốc độ ăn (Stats):**
    *   **Vấn đề:** Backend trước đây chỉ kỳ vọng số điểm đạt được phải bằng đúng cơ chế tính mặc định: `(fast * 10) + (medium * 7) + (slow * 5)`.
    *   **Giải pháp:** Hệ thống giờ đây sẽ xác định một vùng giá trị hợp lệ (range): điểm số của trò chơi phải lớn hơn hoặc bằng mức mặc định (baseScore) và nhỏ hơn hạn mức tối đa về mặt lý thuyết.
    *   **Ví dụ:** Nếu ăn tổng cộng 5 món ăn: Score mặc định lớn nhất là `5 * 10 = 50`. Hệ thống xét điều kiện mới cho max multiplier sẽ đảm bảo khoảng an toàn có thể lên đến `5 * 60 = 300` điểm. Tính năng Combo point hay PowerUp thưởng thoải mái cộng dồn mà không bị chặn lầm.

*   **2. Nới lỏng giới hạn thời gian (Duration):**
    *   **Vấn đề:** Hệ thống trước đây định nghĩa thời gian thời gian tối thiểu để sống sót là `score * 15`. Tuy nhiên, với điểm Combo liên tiếp, điểm (score) tăng nhanh trong khi thời gian chơi (ms) có thể rất  ít, khiến biểu thức điều kiện trên vô tình chặn người chơi đúng luật.
    *   **Giải pháp:** Tính toán lại lượng Duration phù hợp trước lượng điểm tăng đột ngột theo điều kiện giới hạn mới là `score * 3`.
