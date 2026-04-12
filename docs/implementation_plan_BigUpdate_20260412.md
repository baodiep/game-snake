# Implement Gameplay, Score & Progression, Visual & Sound

Nâng cấp Snake Neon từ game cơ bản thành một trải nghiệm hoàn chỉnh với bonus food, chướng ngại vật, teleport portals, combo streak, achievements, rank hệ thống, âm thanh Web Audio API, particle effects và haptic feedback.

## Proposed Changes

### Core Engine

---

#### [MODIFY] [gameLogic.ts](file:///c:/Users/Admin/source/repos/Snake/src/lib/engine/gameLogic.ts)

Mở rộng [GameState](file:///c:/Users/Admin/source/repos/Snake/src/lib/engine/gameLogic.ts#13-29) với các trường mới:
- `bonusFood?: { pos: Coordinate; expiresAt: number; multiplier: number }` — Mồi đặc biệt có countdown
- `obstacles: Coordinate[]` — Chướng ngại vật ngẫu nhiên
- `portals?: [Coordinate, Coordinate]` — Cặp cổng teleport
- `level: number` — Cấp độ hiện tại (mỗi 5 mồi lên 1 cấp)
- `combo: number` — Số lần ăn liên tiếp nhanh (<3s)
- `maxCombo: number` — Combo cao nhất phiên
- `achievements: string[]` — Danh sách thành tích đã đạt
- `powerUp?: { type: 'SHIELD' | 'SLOW'; expiresAt: number }` — Power-up đang active
- `lastFoodEatenTime: number` — Mốc thời gian ăn mồi cuối (cho combo)
- `events: GameEvent[]` — Danh sách sự kiện trong tick để trigger sound/particles

Cập nhật [tickGame()](file:///c:/Users/Admin/source/repos/Snake/src/lib/engine/gameLogic.ts#87-138):
- Sau mỗi 5 mồi → tăng level, spawn obstacles mới
- Khi ăn mồi thường → kiểm tra combo (nếu <3s tiếp theo)
- Khi ăn bonus food → điểm x2-x3 + reset combo timer
- Kiểm tra va chạm obstacle
- Kiểm tra teleport qua portal
- Kiểm tra power-up hết hạn
- Kiểm tra spawn bonus food (10% mỗi lần sinh food mới)

---

#### [MODIFY] [useGameLoop.ts](file:///c:/Users/Admin/source/repos/Snake/src/hooks/useGameLoop.ts)

- Expose `currentTickRate` được tính theo level: `Math.max(80, 150 - (level - 1) * 10)`
- Sau mỗi tick, đọc `gameState.events` để emit lên component qua callback

---

### Hooks Mới

---

#### [NEW] [useSoundEngine.ts](file:///c:/Users/Admin/source/repos/Snake/src/hooks/useSoundEngine.ts)

Web Audio API synth (không cần file âm thanh):
- `playEat()` — ping ngắn tần số cao
- `playBonusEat()` — chord đặc biệt
- `playLevelUp()` — arpeggio ascending
- `playGameOver()` — falling tone
- `playCombo()` — pop gấp đôi
- `playPowerUp()` — sweep tone

---

#### [NEW] [useParticles.ts](file:///c:/Users/Admin/source/repos/Snake/src/hooks/useParticles.ts)

Quản lý danh sách particle tạm thời:
- `spawnParticles(x, y, color, count)` — Thêm particles vào state
- Mỗi particle có `id, x, y, color, createdAt`
- Tự xóa sau 800ms

---

### UI Component

---

#### [MODIFY] [SnakeGame.tsx](file:///c:/Users/Admin/source/repos/Snake/src/components/SnakeGame.tsx)

**Phần Header/HUD khi đang chơi:**
- Level indicator + progress bar đến level tiếp theo
- Combo badge (ẩn khi combo < 2)
- Power-up countdown bar

**Phần Grid render:**
- Obstacles render (màu đỏ tối, pulse animation)
- Portal render (màu tím, spin animation)  
- Bonus food render (vàng, countdown ring)
- Rắn thay màu theo level: xanh→cyan→vàng→đỏ
- Particle overlay (absolute positioned divs)

**Game Over Screen:**
- Rank badge tính từ score: <50 Bronze, <150 Silver, <350 Gold, >=350 Diamond
- Personal Best từ `localStorage` so sánh + highlight nếu là kỷ lục mới

**Achievements popup:**
- Toast ngắn 2s khi đạt thành tích mới

**Sound & Haptic:**
- `useSoundEngine` kết nối với events từ game loop
- `navigator.vibrate([30])` khi ăn mồi trên mobile

## Verification Plan

### Manual Verification

Sau khi implement xong, chạy dev server:
```
cd c:\Users\Admin\source\repos\Snake
npm run dev
```
Mở `http://localhost:3000` và kiểm tra:

1. **Level system**: Ăn 5 mồi → level tăng, tốc độ tăng nhẹ, thanh tiến trình hiển thị đúng
2. **Bonus food**: Quan sát mồi vàng xuất hiện ngẫu nhiên → biến mất sau ~5s nếu không ăn
3. **Obstacles**: Level 2+ có chướng ngại vật xuất hiện, chạm vào → game over
4. **Teleport**: Portal pairs xuất hiện, rắn đi vào 1 cổng → xuất hiện ở cổng kia
5. **Combo**: Ăn 2 mồi liên tiếp nhanh → badge combo xuất hiện
6. **Achievements**: Lần đầu ăn mồi → popup "First Blood", ăn 10 mồi → popup tương ứng
7. **Rank**: Game over với điểm < 50 → Bronze badge; > 350 → Diamond
8. **Personal Best**: Chơi 2 game, game thứ 2 điểm cao hơn → hiển thị "🏅 Kỷ lục mới!"
9. **Sound**: Bật âm lượng → nghe thấy âm thanh khi ăn mồi, level up, game over
10. **Haptic**: Trên thiết bị mobile → rung nhẹ khi ăn mồi
11. **Particles**: Khi ăn mồi → hiệu ứng particle nổ tại vị trí food
