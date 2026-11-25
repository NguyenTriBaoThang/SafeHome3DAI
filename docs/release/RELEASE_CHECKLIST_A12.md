# SafeHome 3D AI — Release Candidate Checklist (Task A12)

**Release Candidate Scope:** Member 1 Backend, Risk Engine, RAG, Security & CI/CD (Tasks A01–A12)  
**Target Milestone:** Vòng Chung Kết / Demo Top 30 — SafeHome3DAI  
**Phạm vi sản phẩm:** *Hỗ trợ đánh giá yếu tố môi trường phòng ngừa té ngã tại nhà cho người cao tuổi (không phải thiết bị chẩn đoán lâm sàng hay khẳng định giảm tai nạn đã được chứng minh).*

---

## 1. Bảng tổng hợp PR / Nhánh / Thay đổi DB & API (A01–A12)
| Task | Nhánh / PR | Thay đổi Schema / Migration / API chính | Trạng thái |
| :--- | :--- | :--- | :--- |
| **A01–A04** | Đã merge `main` | Hợp nhất 1 lõi `evaluateRoomHazardsCanonical`, `measurementProvenance`, `thresholdConfig`, `clinicalReviewTypes` | Đã merge |
| **A05** | Đã merge `main` | Migration `20261125_a05_persistence_demo_boundary`: `PersistenceAuditEvent`, `dataPartition`, `idempotencyKey` | Đã merge |
| **A06** | Đã merge `main` | Migration `20261125_a06_consent_privacy`: `ConsentRecord`, `withAccount`, `authorizeObjectAccess` | Đã merge |
| **A07** | PR #11 (`3486528`) | Làm cứng upload ảnh, `secretGuard`, `promptInjectionGuard`, rate limit & circuit breaker | Đã merge |
| **A08** | PR #12 (`89155fc`) | `documentRegistry`, `citationVerifier` (`sourceSupportMap`), log `DOCUMENT_VERSIONS_EVALUATED` | Đã merge |
| **A09** | PR #13 (`16da7e9`) | Bộ benchmark 40 câu tiếng Việt (`ragBenchmarkA09`), `responseGuardrails`, `npm run eval:rag:a09` | Đã merge |
| **A10** | PR #14 (`9fd7127`) | `decisionTrace` (`RULE_BASED_PROVENANCE`), `/api/risk-assessment/traceability`, liên kết hotspot 3D | Đã merge |
| **A11** | PR #15 (`6dcacd8`) | Migration `20261125_a11_before_after_snapshots`: `RoomSnapshotRecord`, `/api/v1/snapshots/*` | Đã merge |
| **A12** | `feature/a-12-release-ci-verification` | CI quality gates (`qa:gates`), đồng bộ tài liệu phạm vi, runbook, risk register & limitations | Đang hoàn thiện |

---

## 2. Release Verification Checklist (Chạy trước khi đóng gói Demo)
- [x] `npm run qa:gates` — Không có secret/API key bị lộ, migration hợp lệ, 100% business API dùng `withAccount()`, thuật ngữ `README.md` đồng bộ.
- [x] `npx tsc --noEmit` — Kiểm tra kiểu TypeScript không lỗi.
- [x] `npm run eval:rag:a09` — Chạy offline 40 câu tiếng Việt (`retrievalHitAtK`, `groundedness`, `refusalRate`, `guardrailCompliance`, `promptInjectionBlockRate`).
- [x] `npx next build` — Biên dịch production Next.js hoàn chỉnh (23/23 static pages & toàn bộ API routes sạch lỗi).
- [x] `node scripts/completion/http-smoke.cjs` & `node scripts/completion/browser.cjs` — Kiểm thử E2E HTTP (`10/10` + `offline_backup_restore_real_sqlite`) và trình duyệt Chromium (`25/25` desktop & mobile, 0 exception) đạt hoàn toàn trên bản Release Candidate.
- [ ] Video walkthrough thực tế 1 ca Before–After — Đã có kịch bản 3 phút & backup offline tại [B12_DEMO_SCRIPT_AND_QA_BANK.md](B12_DEMO_SCRIPT_AND_QA_BANK.md); chờ nhóm quay video mp4 thực tế.

---

## 3. Bàn giao phối hợp với Thành viên 2 (B12)
| Hạng mục | Người phụ trách | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- |
| Backend API v1 (`/api/v1/snapshots/*`), Canonical Risk Engine, RAG & Guardrails | Thành viên 1 | Sẵn sàng | Xem `docs/api/before-after-snapshots-openapi-v1.yaml` & `src/data/beforeAfterFixturesB09.ts` |
| Ký xác nhận E2E UX / 3D / Vision (desktop & mobile) & Demo Script chung | Thành viên 2 (B12) | **Chờ B12 ký xác nhận** | Đã hoàn tất Novelty Matrix ([B12_NOVELTY_MATRIX_AND_SOURCES.md](B12_NOVELTY_MATRIX_AND_SOURCES.md)), Demo Script & E2E 25/25; chờ nhóm duyệt & ký tay |
| Video walkthrough 1 ca Before–After thực tế | Thành viên 1 & B12 | **Chờ ghi hình cùng B12** | Sử dụng kịch bản `B09_BEDROOM_BASELINE_INPUT -> PROPOSED_SCENARIO -> VERIFIED` |

