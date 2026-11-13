# SafeHome 3D AI — Chiến Lược Kiểm Thử (Testing Strategy)

## 1. Khung kiểm thử tự động
Dự án sử dụng **Vitest** để thực thi các bộ kiểm thử tự động với tốc độ cao, hỗ trợ TypeScript và xử lý alias module `@/*`.

Lệnh chạy kiểm thử:
```bash
# Chạy toàn bộ test suite một lần
npm test

# Chạy test ở chế độ theo dõi (Watch mode)
npm run test:watch
```

---

## 2. Các tầng kiểm thử đã triển khai

### 2.1. Unit Tests (`tests/riskEngine.test.ts`)
- **Khoảng cách 2D**: Kiểm thử hàm tính khoảng cách từ điểm đến đoạn thẳng (`pointToSegmentDistance`), bao gồm hình chiếu vuông góc và các điểm nằm ngoài hai đầu mút.
- **Quy tắc Thảm (`RULE_RUG_01`)**: Kiểm tra phát hiện thảm chưa cố định trên lối đi; kiểm tra giải quyết nguy cơ khi đặt cờ `isFixed = true`.
- **Quy tắc Cáp điện (`RULE_CABLE_02`)**: Kiểm tra giao cắt hành lang; kiểm tra giải quyết khi luồn nẹp sát vách.
- **Quy tắc Ánh sáng (`RULE_LIGHT_03`)**: Kiểm tra kích hoạt khi Lux < 100/150; kiểm tra giải quyết khi tăng Lux.
- **Quy tắc Phòng tắm (`RULE_BATH_WET_04` & `RULE_BATH_GRAB_05`)**: Kiểm tra phát hiện sàn ướt không chống trơn và thiếu thanh tay vịn.
- **Quy tắc Vật cản (`RULE_PATH_OBST_06`)**: Kiểm tra giao cắt chướng ngại vật với hành lang đi lại; kiểm tra phát sinh nguy cơ mới khi di chuyển bàn trà chắn ngang cửa.
- **Điểm số an toàn Heuristic**: Kiểm tra thang điểm giảm trừ theo mức độ nghiêm trọng và đạt 100 khi không có nguy cơ.

### 2.2. RAG Engine Tests (`tests/ragEngine.test.ts`)
- **Bộ tách từ (Tokenizer)**: Kiểm tra phân tách từ tiếng Việt và tiếng Anh, loại bỏ ký tự đặc biệt.
- **Truy xuất đoạn trích (Passage Retrieval)**: Kiểm tra truy xuất chính xác các hướng dẫn về thảm, chiếu sáng, phòng tắm từ sổ đăng ký nguồn.
- **Chế độ phản hồi cục bộ (Local Fallback)**: Đảm bảo khi không có LLM API key, hệ thống vẫn phản hồi đầy đủ căn cứ chuyên môn và trích dẫn tổ chức ban hành.

### 2.3. Integration Tests (`tests/integration.test.ts`)
- **Quy trình End-to-End**:
  1. Nạp căn phòng mẫu (Phòng ngủ).
  2. Đo lường hiện trạng ban đầu (Baseline Assessment) phát hiện các nguy cơ.
  3. Mô phỏng can thiệp: Cố định thảm, luồn nẹp dây điện, tăng độ rọi.
  4. Tái đánh giá: Xác nhận các nguy cơ tương ứng chuyển sang trạng thái đã giải quyết (Resolved) và điểm số tăng lên rõ rệt.
  5. Đối chiếu kết quả đối sánh kịch bản và truy vấn trợ lý AI.

