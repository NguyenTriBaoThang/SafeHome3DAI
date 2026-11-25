# SafeHome 3D AI — Final Risk Register & System Limitations (Task A12)

## 1. Sổ Đăng Ký Rủi Ro (Final Risk Register)
- **P0 Blockers đang mở:** **0 blocker P0** thuộc phạm vi Backend / Risk Engine / RAG / Security.

| ID | Mức độ | Mô tả rủi ro / Tồn đọng thực tế | Biện pháp giảm thiểu hiện có | Trạng thái & Người chịu trách nhiệm |
| :--- | :---: | :--- | :--- | :--- |
| **R-01** | **P1** | Ngưỡng `RISK-001..RISK-008` tham chiếu WHO/CDC/BYT nhưng các ngưỡng biên định lượng cụ thể trong `thresholdConfig.ts` đang ở trạng thái `PENDING_CLINICAL_REVIEW` | Đã tách riêng `clinicalReviewTypes.ts`, gắn disclaimer không thay thế chẩn đoán lâm sàng | Accepted trước demo (chờ hội đồng chuyên gia y tế ký duyệt) — Chủ sở hữu: Nhóm sản phẩm & Thành viên 1 |
| **R-02** | **P1** | Bộ kiểm thử RAG 40 câu (`npm run eval:rag:a09`) chạy đánh giá tự động sơ bộ (`PRELIMINARY`) trên luồng `OFFLINE_DETERMINISTIC`; chưa chạy đánh giá human-grading với Live Gemini | Giữ nhãn `PRELIMINARY`, không tuyên bố "100% đúng trên LLM", ghi rõ model/provider/version trong mọi báo cáo | Open P1 (cần chấm tay khi bật `ENABLE_EXTERNAL_LLM=true`) — Chủ sở hữu: Thành viên 1 |
| **R-03** | **P1** | Thiếu dữ liệu ảnh nhà Việt Nam có nhãn bounding box do người xác nhận (`0` ảnh train/val verified cho Stage 5 local detector) | Đã khóa cổng huấn luyện ở Stage 5/6 (`ML_COMPLETION.md`), giữ Human-in-the-Loop bắt buộc xác nhận vật thể | Open P1 (chờ thu thập & gán nhãn thực địa) — Chủ sở hữu: Nhóm ML / B04 |
| **R-04** | **P2** | `tests/riskIntegration.test.ts` trước đây dùng chỉ số mảng cứng `INITIAL_ROOMS[1]` bị lệch khi commit `df399cd` thêm `ACCESSIBLE_WHEELCHAIR_SUITE_ROOM` vào đầu `mockRooms.ts` | Đã sửa `riskIntegration.test.ts` tra cứu theo `roomType === "BEDROOM"` / `"BATHROOM"` | Resolved — Chủ sở hữu: B07 & Thành viên 1 |
| **R-05** | **P2** | `npm run lint` (`next lint`) báo `eslint` chưa cài trong `devDependencies` (CI trước đó dùng build `--no-lint`) | Dùng `npx tsc --noEmit` + `npm run qa:gates` (kiểm tra secret, auth, migration, contract) làm cổng CI cứng | Accepted P2 (cần quyết định thêm ESLint ở chu kỳ sau) — Chủ sở hữu: Thành viên 1 |
| **R-06** | **P2** | `documentRegistry.ts` lưu chỉnh sửa runtime (approve/reject/remove) trong bộ nhớ tiến trình ngoài SQLite khi server restart | Các nguồn gốc mặc định WHO/CDC/BYT/NCOA được khóa trong mã kiểm chứng và đối chiếu hash SHA-256 | Accepted P2 — Chủ sở hữu: Thành viên 1 |

---

## 2. Bảng Hạn Chế Hệ Thống (Mandatory Limitations Table)
| Hạng mục | Giới hạn kỹ thuật / Chuyên môn cần công bố trung thực |
| :--- | :--- |
| **Tái dựng 3D từ ảnh** | Mô hình 3D sinh từ một/vài ảnh chụp (`PHOTO_DRAFT`) chỉ là ước lượng hình học gần đúng; không có số đo chiều rộng/cao độ chính xác và **không sinh điểm an toàn thực tế** khi chưa đo đạc tại hiện trường. |
| **AI Vision & Nguy cơ phi thị giác** | Thị giác AI chỉ đề xuất vật thể nhìn thấy trong khung hình; **không thể tự chứng minh các nguy cơ phi thị giác** (độ bám keo mép thảm, hệ số ma sát gạch ướt `R10`, khả năng chịu tải `150 kg` của vít nở thanh vịn, hoặc độ sáng `Lux` ban đêm thực tế). |
| **Động cơ quy tắc & Chờ chuyên gia** | Hệ thống là công cụ **hỗ trợ sàng lọc yếu tố môi trường**, không chẩn đoán bệnh, không kê đơn thuốc, không dự báo xác suất té ngã cá nhân và không khẳng định làm giảm tỷ lệ tai nạn; các ngưỡng đang chờ thẩm định chuyên gia y tế chính thức. |
| **Cỡ mẫu nghiên cứu & Sai số** | Tập thăm dò Vision chỉ gồm **38 ảnh Wikimedia Commons** (val 6, test 5), chưa đại diện cho nhà ở Việt Nam; bộ benchmark RAG 40 câu đánh giá ở chế độ deterministic offline (`PRELIMINARY`), chưa đo sai số MAE từ cảm biến thật ngoài hiện trường. |
| **Triển khai tài khoản & Dữ liệu** | Kiến trúc SQLite theo từng hộ gia đình yêu cầu **1 Node server + ổ đĩa bền vững** (`SAFEHOME_PRIVATE_DIR`), chưa kiểm thử chịu tải hàng nghìn người dùng đồng thời và chưa có MFA / khôi phục mật khẩu qua email. |

