# Task A10 — Chuẩn hóa đồ thị giải thích thành Decision Traceability

## 1. Kiến trúc DecisionTrace & Phân định nguồn gốc (Rule-Based Explainability)
- **Module chuẩn:** `src/lib/risk/decisionTrace.ts`
- **Schema `DecisionTrace` (v1.0.0):**
  - `traceVersion`: `"1.0.0"`, `traceId`: `trace-${snapshotId}-${findingId}`
  - `explainabilityType`: `"RULE_BASED_PROVENANCE"` — **tuyệt đối tách biệt khỏi giải thích nội tại (model explainability) của Gemini/LLM**.
  - `snapshotId`, `assessmentId`, `roomId`, `objectLink` (`objectId`, `roomId`, `snapshotId`, `hotspotHref`)
  - `inputEvidence[]` (`field`, `measuredValue`, `threshold`, `sourceType`: `measured | user_confirmed | vision_estimated | simulated | unknown`, `needsConfirmation`, `warningBadge`, `tooltipText`)
  - `ruleId`, `ruleName`, `ruleVersion`, `findingId`, `recommendationId`, `citationIds[]`, `citations[]`, `approvedStatus`

## 2. Xử lý ngoại lệ & Cờ cảnh báo
- **Nguồn tài liệu không truy xuất được / chưa phê duyệt (`PENDING`/`REJECTED`/`OUTDATED`/đã xóa):**
  - `resolveApprovedCitationsForTrace()` và `explainHazardFinding()` chỉ truy xuất qua `getActiveRegistrySources({ approvalOnly: true })` (Task A08) và **bỏ fallback giả định** về nguồn mặc định khi thiếu chứng cứ (`citations = []`).
  - Trong `DecisionGraph`, nếu không có citation hợp lệ hoặc finding thiếu bằng chứng, hệ thống **không tạo node `EVIDENCE_SOURCE`**.
- **Dữ liệu `unknown` hoặc `provisional` (`vision_estimated` / `simulated`):**
  - Hiển thị khung cảnh báo nét đứt màu vàng cam, nhãn **"Cần xác nhận"** và tooltip `"Cần xác nhận thực tế tại hiện trường (không coi là số đo xác thực)"`.

## 3. Liên kết 3D & Trace thực nghiệm (Thảm rời chắn lối)
- **Liên kết 3D ổn định:** Khi `targetObjectId` hợp lệ (ví dụ `obj-rug-01` trong `INITIAL_ROOMS` / B07), hệ thống tạo link `/digital-twin?roomId=room-bedroom-01&findingId=finding-risk001-room-bedroom-01&snapshotId=...&objectId=obj-rug-01`. Trang `/digital-twin` đọc query params và kích hoạt `FOCUS_OBJECT` trực tiếp vào vật thể đó (không bao giờ tự bịa `objectId`).
- **Tình huống thực nghiệm (`createLooseRugEmpiricalTrace()`):**
  - **Trước xử lý (`snap-empirical-loose-rug-before`):** `obj-rug-01` (`user_confirmed`: chưa cố định mép, quăn mép, chắn lối) $\rightarrow$ `RISK-001` (v2026.1) $\rightarrow$ `finding-risk001-room-bedroom-01` $\rightarrow$ `SRC_WHO_2021` + `SRC_NCOA_2023` $\rightarrow$ khuyến nghị dán băng keo 2 mặt / lót cao su chống trượt.
  - **Sau xác nhận (`snap-empirical-loose-rug-after`):** sau khi dán cố định (`measured`), `RISK-001` chuyển sang `NOT_DETECTED` và không còn finding kích hoạt.
- **API & Xuất mẫu:** `GET /api/risk-assessment/traceability?sample=loose-rug` và `POST /api/risk-assessment/traceability` (`format: "export"` xuất file JSON chuẩn `decision-trace-{snapshotId}.json`), kèm nút xuất JSON trực tiếp trên `/explainability`.

