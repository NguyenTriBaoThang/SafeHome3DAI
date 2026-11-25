# B12 — Bảng Đối Chiếu Tính Mới Khoa Học & Nguồn Gốc Xác Minh

> **Nguyên tắc học thuật:** Mọi khẳng định khác biệt đều phải chỉ tới bằng chứng kiểm chứng được; tuyệt đối **không** dùng cụm *"duy nhất trên thị trường"*, **không** khẳng định độ chính xác lâm sàng hoặc tỷ lệ giảm té ngã khi chưa có thử nghiệm lâm sàng.

---

## 1. Năm Công Trình Gốc Đối Chiếu (Đã xác minh DOI / PubMed)

| Ký hiệu | Tác giả, Năm & Tạp chí | Tiêu đề gốc & Link xác minh |
| :--- | :--- | :--- |
| **[1] GuideToMeasure-3D (2019)** | Hamm, J., Money, A. G., & Atwal, A. (2019). *Journal of Biomedical Informatics*, 92, 103135. | *Enabling older adults to carry out paperless falls-risk self-assessments using guidetomeasure-3D: A mixed methods study.* — DOI: https://doi.org/10.1016/j.jbi.2019.103135 \| PMID: `30825619` |
| **[2] Smart-Home Study (2023)** | Leung, K. H. M., & Brandis, S. (2023). *Hong Kong Journal of Occupational Therapy*. | *The smart-home study: A feasibility study to pilot the use of smartphone technology to identify environmental falls risk factors in the home.* — DOI: https://doi.org/10.1177/15691861231155994 \| PMID: `37332299` \| PMCID: `PMC10273796` |
| **[3] PilOT-Measure (2025)** | Ibrahim, Z., Money, A. G., Atwal, A., & Spiliotopoulou, G. (2025). *BMC Medical Informatics and Decision Making*, 25(1), 332. | *PilOT-Measure: a mobile 3D depth sensing application to support accurate and efficient clinician-led home-based falls risk assessments.* — DOI: https://doi.org/10.1186/s12911-025-03149-7 \| PMID: `40993706` \| PMCID: `PMC12462305` |
| **[4] Multimodal LLMs (2026)** | JMIR Aging (Published May 13, 2026). | *Leveraging Multimodal Large Language Models for Fall Risk Reduction in Older Adults in the Home: Proposed Model Design.* — DOI: https://doi.org/10.2196/77591 \| PMID: `42127229` \| PMCID: `PMC13170740` |
| **[5] OT-Vision (2026)** | Ibrahim, Z., Money, A. G., Atwal, A., & Spiliotopoulou, G. (2026). *Technology and Health Care*. | *OT-Vision: A 3D depth sensing mobile application to aid clinician-led home environment assessments for falls prevention.* — DOI: https://doi.org/10.1177/09287329261498665 \| PMID: `42935186` |

---

## 2. Bảng So Sánh Đa Chiều (Kèm Bằng Chứng Thực Tế)

| Tiêu chí | [1] GuideToMeasure-3D (2019) | [2] Smart-Home Study (2023) | [3] PilOT-Measure (2025) & [5] OT-Vision (2026) | [4] Multimodal LLMs (2026) | **SafeHome3DAI (Nguyên mẫu 2026)** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phạm vi & Người dùng** | Người cao tuổi tự đo đạc thiết bị hỗ trợ tại nhà (mixed-methods, Anh) | Đánh giá nguy cơ té ngã từ xa qua ảnh do gia đình chụp gửi OT (Úc/HK) | Chuyên viên hoạt động trị liệu (OT) đi đo thực địa lắp thiết bị hỗ trợ | Đề xuất thiết kế VLM + sinh ảnh mô phỏng sửa nhà cho người cao tuổi | **Sàng lọc yếu tố môi trường** cho gia đình/người chăm sóc VN (phòng ngủ, nhà vệ sinh) — không chẩn đoán lâm sàng |
| **Phần cứng / Cảm biến** | Ứng dụng di động trực quan 3D hướng dẫn tự đo | Smartphone thường chụp ảnh tĩnh | Smartphone có **cảm biến độ sâu 3D (depth-sensing)** để đo điểm-tới-điểm | Cloud Multimodal LLM (xử lý ảnh + sinh ảnh) | **Trình duyệt web + ảnh thường + checklist 3 trạng thái**. *Giới hạn: mô hình từ ảnh chỉ là `PHOTO_DRAFT` ước lượng, chưa đo MAE như depth sensor* |
| **Cách đánh giá & Mô phỏng** | Hướng dẫn vị trí đo trên mô hình 3D cố định | OT xem ảnh và chấm tay yếu tố nguy cơ | Hướng dẫn đo chính xác kích thước cửa/bậc/tay vịn | Sinh ảnh chỉnh sửa không gian trực quan (generative image edits) | **Động cơ quy tắc 8 luật (`RISK-001..008`) tách khỏi AI**, mô phỏng Before–After bất biến (`BASELINE -> PROPOSED -> VERIFIED`) trên cảnh 3D |
| **Truy vết & Chống ảo giác (Traceability / RAG)** | Giao thức đo lường hướng dẫn theo sách/3D | Thẩm định trực tiếp bởi OT con người | Hỗ trợ ghi tài liệu lâm sàng, vẫn cần OT xử lý bề mặt phản chiếu | Nghiên cứu pilot nhận xét cần OT giám sát | **Bắt buộc Human-in-the-Loop (`PENDING_REVIEW`)**, từ chối trả `"an toàn"` khi thiếu lux/lối đi, RAG khóa nguồn WHO/CDC/BYT/NCOA + SHA-256 (`RULE_BASED_PROVENANCE`) |
| **Riêng tư & Vận hành Offline** | Ứng dụng cục bộ | Chia sẻ ảnh qua kênh telehealth | Lưu ý bảo mật dữ liệu bệnh nhân khi ghi hình thực địa | Phụ thuộc Cloud Multimodal LLM | **Cô lập SQLite từng hộ gia đình**, default-deny `third_party_ai` consent (`403`), xóa dây chuyền & **Offline Deterministic RAG Fallback `< 5ms`** khi mất Gemini |
| **Mức độ kiểm chứng thực tế** | Nghiên cứu hỗn hợp đã công bố (2019) | Nghiên cứu khả thi (2023) | Đã đánh giá trên thực tập sinh & OT (2025–2026) | Pilot rating trên dữ liệu mô phỏng (2026) | **Kiểm thử phần mềm (470 tests, HTTP/Browser E2E, RAG 40Q `PRELIMINARY` offline)**. *Chưa có thử nghiệm lâm sàng/hiện trường B11 & 0 ảnh hộ gia đình verified B02/B03* |

---

## 3. Điểm Đóng Góp Thực Tế & Điểm Cần Trung Thực Khi Thuyết Trình
- **Điểm mạnh có bằng chứng trong code:** Tích hợp khép kín **Human-in-the-Loop Vision -> Mô phỏng 3D tách provenance -> 1 Canonical Rule Engine duy nhất -> Snapshot Before–After bất biến (`api/v1/snapshots`) -> RAG có trích dẫn kiểm chứng & Offline Fallback**, kèm kiến trúc bảo mật/consent đạt chuẩn triển khai gia đình (`HttpOnly` cookie, SQLite riêng từng tài khoản, chặn `PHOTO_DRAFT` tự nhận điểm).
- **Điểm tuyệt đối không phóng đại:** SafeHome3DAI **không** đo chính xác từng centimet bằng depth-sensing như `PilOT-Measure`/`OT-Vision`, và **chưa** chứng minh được tỷ lệ giảm té ngã ngoài đời thực như các thử nghiệm dài hạn.

