# SafeHome3DAI — End-to-End, HTTP Smoke & Full-Route Browser Sweep Report

Báo cáo ghi nhận kết quả chạy thực tế trên bản production build sạch (`npx next build` -> `.next`) **sau tất cả các chỉnh sửa lỗi BUG-01..BUG-06**.

---

## 1. Xác Minh Tính Toàn Vẹn Database Người Dùng

- Tệp database: `prisma/dev.db`
- `SHA-256` đo lại sau khi kết thúc các đợt smoke HTTP, Playwright/Edge CDP và toàn bộ Sweep 17 route:
  **`628A5FB1F1C29983203D7DBD381DF111B4DE1BBA0FA90E9DE2D4F5538DFFD6CA`** (trùng khớp tuyệt đối với mốc trước kiểm thử trong phiên này — không bị biến đổi hay ghi đè bởi suite thử nghiệm).

---

## 2. Production HTTP Smoke & Offline Backup/Restore (`scripts/completion/http-smoke.cjs`)

- Thực thi với `SAFEHOME_BUILD_DIR=.next`:
  - `{"checks":10,"status":"passed"}`
  - `PASS offline_backup_restore_real_sqlite`

---

## 3. Authenticated Multi-Tenant Browser Acceptance (`scripts/completion/browser.cjs`)

- Thực thi trên Headless Edge (`.next`) đạt **`25/25 PASS`** (`fixture_detector_calls: 3`):
  1. `real_registration_creates_separate_family_databases`
  2. `real_login_form_opens_only_the_authenticated_family`
  3. `sidebar_does_not_invent_a_patient_profile_for_the_account`
  4. `photo_header_does_not_show_simulation_safety_score_or_lux`
  5. `demo_does_not_persist_fake_detections`
  6. `real_image_upload_persistence_and_display_with_fixture_detector`
  7. `private_media_rejects_anonymous_other_family_and_public_optimizer_access`
  8. `detection_confirmation_persists`
  9. `corrected_label_round_trips`
  10. `photo_to_3d_keeps_unknown_assessment_and_hides_safety_score`
  11. `risk_dashboard_does_not_score_photo_geometry`
  12. `analytics_and_exported_report_keep_photo_measurements_and_score_unknown`
  13. `legacy_invalid_answer_does_not_block_new_confirmation`
  14. `reload_restores_saved_photo_without_new_inference`
  15. `unknown_edit_retracts_database_and_canonical_survey`
  16. `single_grab_bar_location_remains_missing_other_location`
  17. `unknown_parent_does_not_produce_default_clinical_score`
  18. `mobile_layout_has_no_horizontal_overflow`
  19. `inference_failure_clears_stale_visible_result`
  20. `delete_button_removes_photo_persistently_and_reload_does_not_restore_it`
  21. `archive_opens_persisted_objects_after_reload_and_rejects_other_family`
  22. `authenticated_main_pages_render_without_runtime_errors`
  23. `logout_form_revokes_browser_session`
  24. `no_browser_runtime_exceptions`
  25. `user_database_bytes_unchanged`

---

## 4. Quét Toàn Bộ 17 Route App Router (Desktop `1440x900` & Mobile `375x844`)

Thực thi bằng `audit-browser-sweep.cjs` qua Edge CDP trên tài khoản đăng nhập sạch (`task-8585`):

| Route | Load (ms) | Text Len | Overflow (Desktop/Mobile px) | Nút nhỏ Mobile (`<36px`) | `hasClientError` / Console / Page / HTTP Errors |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/sign-in` | 2026 | 107 | `0 / 0` | 0 | `false` / `0` / `0` / `0` |
| `/` | 1689 | 616 | `0 / 0` | 2 | `false` / `0` / `0` / `0` |
| `/dashboard` | 2228 | 2298 | `0 / 0` | 2 | `false` / `0` / `0` / `0` |
| `/workflow` | 1400 | 2248 | `0 / 0` | 0 | `false` / `0` / `0` / `0` |
| `/ai-guided-survey` | 1364 | 1301 | `0 / 0` | 6 | `false` / `0` / `0` / `0` |
| `/ai-vision` | 1474 | 1691 | `0 / 0` | 30 | `false` / `0` / `0` / `0` |
| `/vision` | 1357 | 1569 | `0 / 0` | 0 | `false` / `0` / `0` / `0` |
| `/digital-twin` | 1264 | 1884 | `0 / 0` | 26 | `false` / `0` / `0` / `0` |
| `/risk-assessment` | 1809 | 3332 | `0 / 0` | 9 | `false` / `0` / `0` / `0` |
| `/risk-assessment/traceability` | 1518 | 2949 | `0 / 0` | 2 | `false` / `0` / `0` / `0` |
| `/scenario-simulator` | 1610 | 1609 | `0 / 0` | 3 | `false` / `0` / `0` / `0` |
| `/analytics` | 1876 | 1699 | `0 / 0` | 1 | `false` / `0` / `0` / `0` |
| `/reports` | 1761 | 2155 | `0 / 0` | 2 | `false` / `0` / `0` / `0` |
| `/ai-assistant` | 1251 | 1282 | `0 / 0` | 14 | `false` / `0` / `0` / `0` |
| `/explainability` | 1268 | 1780 | `0 / 0` | 7 | `false` / `0` / `0` / `0` |
| `/simulations` | 1271 | 1958 | `0 / 0` | 5 | `false` / `0` / `0` / `0` |
| `/experience` | 1312 | 2413 | `0 / 0` | 8 | `false` / `0` / `0` / `0` |

**Tổng hợp Sweep 17/17 Route:**
- `0` lỗi client crash (`hasClientError: false` trên toàn bộ 17/17 route — đã phục hồi `/experience` từ crash trước đây)
- `0` lỗi console, `0` lỗi page exception, `0` lỗi HTTP 4xx/5xx (đã sửa lỗi 404 trên `/ai-assistant`), `0` ảnh vỡ (`brokenImgs: []`)
- `0 px` tràn ngang trên cả Desktop `1440px` lẫn Mobile `375px`

---

## 5. Kịch Bản Chưa Chạy Lại Trên Host Này

- `npm run test:experience:browser` (`scripts/verify_cinematic_experience.cjs`): **SKIPPED / BLOCKED** do `node_modules/playwright` chưa được cài trong môi trường (script yêu cầu `process.env.PLAYWRIGHT_MODULE || 'playwright'`). Kết quả chạy trước đó được lưu tại `docs/EXPERIENCE_BROWSER_RESULTS.json`, còn khả năng render WebGL/không crash của `/experience` sau `npm ci` đã được xác nhận trực tiếp ở Sweep 17 route và `npm run test:experience` (`64/64 PASS`).
