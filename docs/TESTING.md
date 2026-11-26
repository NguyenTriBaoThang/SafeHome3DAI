# SafeHome 3D AI — Chiến Lược Kiểm Thử Toàn Diện (Testing Strategy)

## 1. Tháp Kiểm Thử Phần Mềm Đang Áp Dụng

Dự án kết hợp **7 tầng kiểm thử tự động** tách biệt rạch ròi giữa kiểm thử kỹ thuật phần mềm và đánh giá chất lượng mô hình ML/lâm sàng:

| Tầng | Lệnh thực thi | Kết quả hiện tại (11/2026) | Phạm vi xác minh |
| :--- | :--- | :--- | :--- |
| **1. Type & Static Gates** | `npm run typecheck` · `npm run qa:gates` | `0` lỗi TS · `0` Gate failures | TypeScript strict, secret scan (`301` files), non-destructive SQL migrations, shared contract v1, `withAccount()` trên `59` APIs, README terminology |
| **2. Full Unit & Integration** | `npm test -- --run --no-file-parallelism` | **57/57 files passed** (**486 passed**, `1` live test skipped) | Risk engine (`RISK-001..008`), clinical threshold review guard, Survey DAG/NLP, Vision provider contracts + loopback HTTP, SQLite transaction rollback, A11 snapshots, A06 auth/IDOR/HMAC, B09 truthfulness, B12/Audit regressions |
| **3. 3D Spatial & Experience** | `npm run test:experience` | **9/9 files passed** (**64 passed**) | Placement/snapping/support parents, GLB loading, lighting separation (`lightingModel.ts`), Undo/Redo, Dollhouse reference scene, photo-to-3D reconstruction |
| **4. RAG 40Q Benchmark** | `npm run eval:rag:a09` | **40/40 (100%)** (`OFFLINE_DETERMINISTIC`) | Truy xuất nguồn (`20/20`), độ chính xác trích dẫn (`40/42`), từ chối câu thiếu dữ kiện/ngoài phạm vi (`20/20`), chặn prompt injection (`2/2`) |
| **5. Python & Node ML Contract** | `.\.venv-ml\Scripts\python.exe -m unittest discover -s scripts/ml -p "test_*.py" -v` & Node bridge `test_*_bridge.cjs` | **81/81 Python OK** · **14/14 Node PASS** | Kiểm soát rò rỉ split, schema serving, synthetic 1-epoch RT-DETR loop, Cohen's kappa/labels (`test_b03_labels.py`) |
| **6. Production HTTP & Restore** | `node scripts/completion/http-smoke.cjs` | **10/10** + `PASS offline_backup_restore_real_sqlite` | API runtime trên build `.next` và sao lưu/phục hồi SQLite thật |
| **7. Real Browser E2E (Edge CDP)** | `node scripts/completion/browser.cjs` + Sweep `17` routes + Interactive Live Camera/Vision/3D | **25/25** browser acceptance · **17/17** routes `0` lỗi | Đăng ký/đăng nhập cô lập đa hộ, upload ảnh thật, live `getUserMedia` camera, WebGL `<canvas>` rendering, mobile `375px` `0 px` tràn ngang |

---

## 2. Các Mục Chưa Chạy / Bị Chặn Công Cụ

- **`npm run lint`:** Chưa chạy do chưa cài `eslint` trong `devDependencies` (được thay thế bằng `npm run typecheck` + `npm run qa:gates` trong CI).
- **`npm run test:experience:browser`:** Yêu cầu gói `playwright` hoặc `PLAYWRIGHT_MODULE` không cài mặc định; thay thế bằng Edge CDP sweep trực tiếp qua WebSocket.
- **`tests/geminiVision.test.ts` (1 test live API):** Mặc định bị skip nếu không bật `SAFEHOME_RUN_LIVE_VISION_TESTS=true`.
- **Đánh giá mô hình ML & Lâm sàng thật:** Giữ nguyên trạng thái `BLOCKED` (`0` ảnh nhà Việt Nam có nhãn verified cho Stage 5 RT-DETR; ngưỡng `thresholdConfig.ts` ở `PENDING_CLINICAL_REVIEW`; dữ liệu B11 `0` mẫu).
