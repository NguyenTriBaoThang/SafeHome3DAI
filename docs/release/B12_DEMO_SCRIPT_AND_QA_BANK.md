# B12 — Kịch Bản Demo 3 Phút, Backup Offline & Bộ 20 Câu Phản Biện

**Mục tiêu trình bày:** Người chưa biết dự án nắm được vấn đề, luồng hoạt động thực tế trên 1 ca phòng ngủ, ranh giới số liệu thật/ước lượng, và kết quả kiểm thử trong đúng **3 phút**.

---

## 1. Kịch Bản Demo 3 Phút (Phân vai 2 Thành viên)

| Mốc thời gian | Người trình bày | Hành động trên màn hình (`http://localhost:3000/workflow`) | Thông điệp cốt lõi (Đúng sự thật kỹ thuật) |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:30** | Thành viên 2 | Mở trang chủ / `/workflow` Bước 1–2. Nêu bài toán té ngã tại phòng ngủ & nhà vệ sinh người cao tuổi Việt Nam; bật chế độ **DEMO có nhãn rõ ràng** với kịch bản `B09_BEDROOM_BASELINE_INPUT`. | *"Đây là công cụ hỗ trợ sàng lọc yếu tố môi trường, không thay thế bác sĩ hay khẳng định đo thay thước laser."* |
| **0:30 – 1:15** | Thành viên 2 | Bước 2–3: Điền checklist (Có/Không/Chưa biết), tích chọn **Consent gửi AI** rõ ràng, tải ảnh mẫu/tài khoản demo có phép -> hiện bbox gợi ý ở trạng thái **`PENDING_REVIEW`**, bấm **Chấp nhận / Sửa / Bỏ qua** và trả lời câu hỏi thảm có cố định không. | *"AI chỉ gợi ý vật thể; các yếu tố phi thị giác như độ bám thảm hay lux ban đêm bắt buộc con người xác nhận hoặc để 'Chưa biết'."* |
| **1:15 – 2:00** | Thành viên 1 | Bước 4–5: Chuyển sang 3D Dollhouse -> bấm lưu **`BASELINE` thật qua `/api/v1/snapshots`**, click **Giải thích** một nguy cơ (`RISK-001` Thảm lỏng) -> xem `RULE_BASED_PROVENANCE` (WHO/CDC/BYT), bấm **Làm nổi vật thể 3D** nhảy thẳng tới hotspot `obj-rug-01`. | *"Toàn bộ điểm/nguy cơ do 1 Canonical Rule Engine duy nhất tính ở server; thiếu dữ liệu đo thì giữ 'Chưa thể đánh giá'."* |
| **2:00 – 2:40** | Thành viên 2 | Bước 6–7: Chọn đề xuất *"Cố định thảm / Dọn dây điện"* -> lưu **`PROPOSED_SCENARIO`** (tách biệt với **`BASELINE`**) -> mở mục **Báo cáo 3 trạng thái** (Hiện trạng / Mô phỏng / Xác minh thực tế) và hỏi nhanh Copilot RAG nguồn WHO/CDC. | *"Mô phỏng giúp hình dung trước–sau nhưng không được gọi là 'đã an toàn' nếu chưa kiểm chứng ngoài đời thực."* |
| **2:40 – 3:00** | Thành viên 1 | Chiếu nhanh slide kết quả kiểm thử thực tế (470 unit/integration tests, HTTP/Browser E2E, RAG 40Q `PRELIMINARY` offline `< 5ms`, `0` blocker P0) & bảng giới hạn trung thực. | *"Nguyên mẫu đã sẵn sàng về kiến trúc bảo mật/độ tin cậy phần mềm; bước tiếp theo là thu thập bộ ảnh & đo thực địa B11 có hội đồng y tế thẩm định."* |

### Kế hoạch Dự Phòng Khi Mất Mạng / Gemini Quá Hạn Mức (Offline Backup)
1. **Live Offline Fallback (Ưu tiên 1):** Bật `ENABLE_EXTERNAL_LLM=false` (Copilot chạy **Offline Deterministic RAG `< 5ms`** gắn nhãn `OFFLINE_DETERMINISTIC`), Vision chọn **"Bỏ qua AI, dùng checklist"** để đi trọn 7 bước lưu DB thật không cần Internet.
2. **Video Backup (Ưu tiên 2):** Phát file ghi hình walkthrough màn hình đã chuẩn bị, **bắt buộc gắn nhãn góc màn hình `"OFFLINE DEMO VIDEO BACKUP"`** — không giả vờ bấm chuột live.

---

## 2. Bộ 20 Câu Phản Biện (Nguyên tắc: *Đã làm / Đang thử nghiệm / Chưa chứng minh*)

### A. 10 Câu Phản Biện Chính (Ban Giám Khảo Thường Hỏi)
1. **App có tự chẩn đoán nguy cơ té ngã thay bác sĩ/điều dưỡng không?**
   - *Trả lời:* Không. Hệ thống định vị rõ là công cụ **hỗ trợ đánh giá yếu tố môi trường**, tham chiếu hướng dẫn WHO/CDC/Bộ Y tế; các ngưỡng định lượng hiện ghi `PENDING_CLINICAL_REVIEW` chờ chuyên gia y tế thẩm định.
2. **Làm sao dựng 3D từ 1–2 tấm ảnh mà khẳng định kích thước đúng từng centimet?**
   - *Trả lời:* Chúng tôi **không khẳng định**. Cảnh dựng từ ảnh được gắn nhãn `PHOTO_DRAFT` (`vision_estimated`), chỉ để hình dung bố cục và bị chặn tính điểm nếu chưa đo thật hoặc xác nhận thủ công.
3. **Nếu AI nhìn ảnh rồi đoán sai (nhận nhầm đồ vật) thì điểm rủi ro bị sai theo?**
   - *Trả lời:* Mọi detection từ AI đều khởi tạo ở `PENDING_REVIEW` bắt buộc người dùng chấp nhận/sửa/loại; hơn nữa 8 luật rủi ro chạy bằng rule-based deterministic, không để LLM tự bịa điểm.
4. **Những yếu tố mắt không thấy như sàn gạch trơn, độ cố định mép thảm, độ rọi lux ban đêm xử lý sao?**
   - *Trả lời:* Khi chưa có câu trả lời xác nhận hoặc số đo, động cơ trả về `NEEDS_VERIFICATION` và báo cáo giữ nguyên trạng thái `"Chưa thể đánh giá"`, không tự suy diễn thành an toàn.
5. **Điểm khác biệt của SafeHome3DAI so với các app như PilOT-Measure hay OT-Vision là gì?**
   - *Trả lời:* Các app kia tập trung giúp OT đo chính xác bằng depth sensor; SafeHome3DAI nhắm tới người chăm sóc tại gia không cần LiDAR, kết hợp checklist 3 trạng thái + mô phỏng Before–After bất biến + Copilot RAG trích dẫn nguồn kiểm chứng chạy được cả khi offline. *Chưa chứng minh:* sai số MAE thực địa thấp hơn hay tỷ lệ giảm té ngã.
6. **Nếu Gemini API chết, hết quota 429 hoặc mất mạng ở vùng nông thôn thì sao?**
   - *Trả lời:* Đã làm sẵn Circuit Breaker & **Offline Deterministic RAG Fallback** (phản hồi `< 5ms` từ kho tài liệu WHO/CDC/BYT/NCOA đã băm SHA-256), còn Vision trả HTTP `503` minh bạch để người dùng đi tiếp bằng đường checklist mà không đứng luồng.
7. **Ảnh nhà riêng tư của người cao tuổi đưa lên cloud AI có bị lộ không?**
   - *Trả lời:* Đã triển khai `ConsentRecord` phiên bản `2026.1` theo nguyên tắc default-deny: chưa đồng ý `third_party_ai` bị chặn `403 CONSENT_REQUIRED` trước khi gọi Gemini; ảnh lưu nội bộ có xóa EXIF GPS, cô lập SQLite theo từng hộ gia đình và hỗ trợ thu hồi/xóa dây chuyền toàn bộ.
8. **Nếu người dùng sửa phòng trong bước mô phỏng 3D mà chưa sửa ngoài đời, hệ thống có báo "đã an toàn" không?**
   - *Trả lời:* Không. API `api/v1/snapshots` tách cứng 3 loại snapshot (`BASELINE`, `PROPOSED_SCENARIO`, `VERIFIED_POST_INTERVENTION`) và `reportGuard.ts` cấm dùng cụm cải thiện thực tế cho snapshot mô phỏng.
9. **Tại sao kết quả RAG benchmark đạt 40/40 (100%)?**
   - *Trả lời:* Phải nói trung thực đây là bộ **benchmark sơ bộ (`PRELIMINARY`) trên chế độ `OFFLINE_DETERMINISTIC`** kiểm tra đúng truy xuất nguồn & từ chối câu hỏi ngoài phạm vi/prompt injection — **chưa** phải kết quả chấm tay độc lập trên Live Gemini.
10. **Chi phí triển khai thực tế thế nào?**
    - *Trả lời:* Chi phí phần mềm hiện ở mức thấp (Node.js + SQLite cục bộ/single-node, fallback RAG chi phí \$0); nếu bật Gemini Vision có thể chuyển sang local RT-DETR R18 (Apache-2.0) một khi thu thập đủ dữ liệu gán nhãn.

### B. 10 Câu Hỏi Khó (Phản Biện Chuyên Sâu Kỹ Thuật & Y Khoa)
11. **Thế còn 38 ảnh Wikimedia với chỉ số 70,92% trước đây trong báo cáo ML cũ thì sao?**
    - *Trả lời:* Đó là số liệu thăm dò ban đầu trên tập công khai nhỏ không đại diện nhà ở Việt Nam. Hiện hệ thống đã khóa cổng Stage 5 (`training_permitted=false`) và ghi rõ `not_ready` vì `0` ảnh hộ gia đình Việt Nam có nhãn người thẩm định.
12. **Tại sao chọn RT-DETR R18 thay vì YOLOv8?**
    - *Trả lời:* Ultralytics YOLOv8 dùng giấy phép AGPL-3.0 không phù hợp triển khai mở miễn phí thương mại nếu không mua license; RT-DETR R18 dùng Apache-2.0, nhẹ và xuất được ONNX opset 17.
13. **Người cao tuổi mắt kém dùng WebGL 3D trên điện thoại yếu bị giật hoặc crash thì sao?**
    - *Trả lời:* Đã làm chế độ chất lượng LOD (`Nhẹ / Vừa / Cao`), `AssetErrorBoundary` rơi về hình khối cơ bản nếu lỗi `.glb`, và `WebGLFallback` giữ nguyên toàn bộ danh sách nguy cơ + đánh giá dạng text/thẻ khi trình duyệt không hỗ trợ WebGL.
14. **Bấm chuyển chế độ ánh sáng "Ban đêm" trong 3D có tự sửa số liệu Lux của phòng để kích hoạt lỗi thiếu sáng giả không?**
    - *Trả lời:* Không (đã tách riêng ở B08): preset đèn Three.js chỉ đổi `sceneLightingIntensitySimulated` để xem thị giác, còn `actualIlluminanceLux` giữ nguyên nguồn gốc (`measured` / `user_confirmed` / `chưa đo`).
15. **Làm sao chứng minh 100% route API không bị truy cập chéo (IDOR) giữa các gia đình?**
    - *Trả lời:* Mỗi gia đình có SQLite riêng (`.private/<accountId>/family.db`), CI gate tự động quét kiểm tra 100% business routes (59 routes) bắt buộc bọc `withAccount()`, kết hợp test IDOR/signed URL trong `authConsentPrivacy.test.ts` và `beforeAfterSnapshotsA11.test.ts`.
16. **Số liệu SUS hay độ hài lòng người cao tuổi hiện tại là bao nhiêu?**
    - *Trả lời:* **Chưa có (`0` người dùng thực địa)**. Chúng tôi đã thiết kế sẵn protocol đối chứng AB/BA và script tính SUS/Bootstrap CI ở B11 nhưng giữ nguyên `status: "blocked_awaiting_field_data"`, kiên quyết không bịa số SUS.
17. **Chuyện gì xảy ra nếu 2 người mở cùng một phòng và bấm lưu đè `BASELINE` hoặc `PROPOSED`?**
    - *Trả lời:* API v1 dùng `expectedRevision` optimistic concurrency (`409 CONFLICT`) và `Idempotency-Key` trong DB transaction; lỗi DB trả thẳng HTTP `503 persistenceStatus="failed"`, UI không bao giờ báo "Đã lưu" giả.
18. **Tại sao `npm run lint` trong repo không chạy ESLint?**
    - *Trả lời:* Đã ghi nhận minh bạch trong `RISK_REGISTER_AND_LIMITATIONS.md` (`R-05`): gói `eslint` chưa cài trong `devDependencies`, thay thế bằng `tsc --noEmit`, `qa:gates` (kiểm tra secret/migration/contract/auth) và 53 bộ test Vitest.
19. **Nếu triển khai 10.000 gia đình cùng lúc thì SQLite từng file có chịu nổi không?**
    - *Trả lời:* Kiến trúc hiện tại chỉ thiết kế cho quy mô **single-node + persistent disk** ở giai đoạn nguyên mẫu; mở rộng đa node diện rộng sẽ cần chuyển sang PostgreSQL + Object Storage có mã hóa KMS (đã ghi rõ trong Bảng Hạn Chế Hệ Thống).
20. **Độ chính xác tái dựng 3D sai lệch bao nhiêu cm so với thước laser?**
    - *Trả lời:* **Chưa đo (`maeCm: null`)**. Giao thức đo đối chứng 10–20 phòng bằng thước laser đã viết ở B06/B11 và sẵn sàng nhập vào `b11_experiment_analysis.py` ngay khi có dữ liệu thực địa.

