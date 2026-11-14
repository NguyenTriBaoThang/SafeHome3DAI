# KIẾN TRÚC ĐỘNG CƠ ĐÁNH GIÁ NGUY CƠ MÔI TRƯỜNG (RISK ASSESSMENT ARCHITECTURE)
## SafeHome Risk Intelligence — Hệ Thống Đánh Giá & Giải Thích Mối Nguy Nhà Ở

### 1. Tổng Quan Kiến Trúc (Architecture Overview)

SafeHome Risk Intelligence được xây dựng theo mô hình **Động cơ Quy tắc Xác định (Pure Deterministic Rule Engine)** kết hợp với **Trí tuệ nhân tạo RAG (Retrieval-Augmented Generation)** và **Mô phỏng 3D Digital Twin**.

Hệ thống tuân thủ nguyên tắc an toàn y tế cộng đồng:
- **Tuyệt đối không bịa đặt hoặc suy diễn tỷ lệ phần trăm y khoa thiếu căn cứ** (ví dụ: không đưa ra con số vô căn cứ như "80% nguy cơ ngã").
- **Toàn bộ mối nguy đều có căn cứ đo đạc không gian xác thực** (khoảng cách, độ rọi lux, chiều cao gờ cửa, độ bám dính sàn).
- **Mọi mức ưu tiên đều có quy tắc quyết định tường minh** (Explainable Priority Decision).
- **Mọi khuyến nghị đều dẫn chiếu trực tiếp đến tài liệu y tế chuẩn hóa**: WHO (2021) Step Safety, CDC STEADI (2023), và Hướng dẫn phòng ngừa tai nạn thương tích của Bộ Y Tế Việt Nam (2020).

---

### 2. Sơ Đồ Khối Luồng Dữ Liệu (Data Flow Diagram)

```
[ AI Guided Survey (RoomProfile) ]   hoặc   [ 3D Digital Twin (RoomState) ]
                       │                                   │
                       └───────────────┬───────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │     normalizeRoomAssessmentInput  │
                     │  (Bộ chuẩn hóa đầu vào đa nguồn)  │
                     └─────────────────┬─────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │    SafeHome Risk Rule Registry    │
                     │ (8 Quy tắc xác định RISK-001..008)│
                     └─────────────────┬─────────────────┘
                                       ▼
    ┌──────────────────────────────────┼──────────────────────────────────┐
    ▼                                  ▼                                  ▼
[ 4 Trạng thái chuẩn hóa ]    [ Phân bổ Mức ưu tiên ]      [ Điểm An Toàn Gợi Ý ]
- DETECTED                     - HIGH (Khẩn thiết)          - Heuristic Index (0-100)
- NOT_DETECTED                 - MEDIUM (Nên cải thiện)     - Phạt trừ theo trọng số
- NEEDS_VERIFICATION           - LOW (Theo dõi)
- NOT_APPLICABLE               - UNKNOWN (Cần khảo sát)
    │                                  │                                  │
    └──────────────────────────────────┼──────────────────────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │      AI + RAG Explanation Engine  │
                     │  (WHO 2021, CDC STEADI, BYT VN)   │
                     └─────────────────┬─────────────────┘
                                       ▼
                     ┌───────────────────────────────────┐
                     │     Immutable Assessment Snapshot │
                     │   (Bản chụp bất biến phục vụ so   │
                     │     sánh Trước / Sau can thiệp)   │
                     └─────────────────┬─────────────────┘
                                       ▼
    ┌──────────────────────────────────┴──────────────────────────────────┐
    ▼                                                                     ▼
[ Giao Diện Bảng Điều Khiển ]                         [ Đồ Thị Truy Xuất Nguồn Gốc ]
/risk-assessment (Recharts, Lọc, Chi tiết, Modal)     /risk-assessment/traceability
```

---

### 3. Các Thành Phần Cốt Lõi (Core Modules)

1. **`src/lib/risk/types.ts`**:
   - Định nghĩa toàn bộ kiểu dữ liệu miền (Domain types) cho đầu vào, trạng thái đánh giá, mối nguy, khuyến nghị, bản chụp snapshot và kết quả so sánh.
2. **`src/lib/risk/inputAdapter.ts`**:
   - Bộ chuyển đổi đa nguồn (`normalizeRoomAssessmentInput`). Cho phép tiêu thụ liền mạch cả dữ liệu khảo sát số hóa (`RoomProfile`), dữ liệu không gian 3D (`RoomState`), hoặc dữ liệu tùy chỉnh.
3. **`src/lib/risk/riskRuleRegistry.ts`**:
   - Kho đăng ký 8 quy tắc kiểm định an toàn có phiên bản (`v1.0.0`), từ `RISK-001` đến `RISK-008`.
4. **`src/lib/risk/ruleEngine.ts`**:
   - Động cơ thực thi thẩm định tuần tự 8 quy tắc, tính toán điểm an toàn gợi ý (Heuristic Safety Score 0-100) với trọng số phạt trừ minh bạch.
5. **`src/lib/risk/priorityEngine.ts`**:
   - Chính sách phân bổ mức độ ưu tiên minh bạch, tạo giải thích quyết định bằng tiếng Việt chuyên nghiệp.
6. **`src/lib/risk/explanationEngine.ts`**:
   - Động cơ giải thích chuyên sâu kết hợp RAG, trích xuất dẫn chứng tài liệu thẩm định, diễn giải cơ chế y học lão khoa và cơ chế vật lý tại nhà ở.
7. **`src/lib/risk/comparisonEngine.ts`**:
   - Động cơ so sánh Trước / Sau can thiệp (`compareAssessments`), phân loại sự thay đổi thành các nhóm bất biến: `RESOLVED_IN_MODEL`, `PERSISTENT`, `NEW`, `CHANGED_PRIORITY`, `NEEDS_VERIFICATION`.
8. **`src/lib/risk/assessmentManager.ts`**:
   - Tầng điều phối lưu trữ cơ sở dữ liệu SQLite (Prisma ORM), quản lý bộ nhớ đệm snapshot và xuất báo cáo hoàn chỉnh.

