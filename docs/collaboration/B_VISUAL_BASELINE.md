# B01 — Baseline kiểm toán Vision / 3D / Workflow

**Phạm vi:** chỉ đọc mã và chạy lệnh; **không sửa `src/**`**. Sửa lỗi thuộc B04/B06/B07/B09.
**Commit kiểm toán:** `main` = `2d63e57e70490ba5c1328aacada05285d95deb8f`; nhánh `feature/b-01-visual-baseline` (commit đầu `ac05989`).
**Ngày chạy:** 25/11/2026, macOS, `npm ci` sạch (node_modules chưa có trước đó). Không có `GEMINI_API_KEY`, không có detector local, không thử ảnh thật.

## 1. Kết quả lệnh (chạy thật)

| Lệnh | Exit | Kết quả |
| :--- | :--: | :--- |
| `npx tsc --noEmit` | 0 | Không lỗi kiểu |
| `npm test -- --run` | **1** | `Test Files 3 failed \| 46 passed (49)`; `Tests 3 failed \| 411 passed \| 1 skipped (415)` |
| `npm run test:vision` | **1** | `Test Files 2 failed \| 6 passed (8)`; `Tests 2 failed \| 121 passed \| 1 skipped (124)` |
| `npm run qa:gates` | 0 | 285 file quét secret, 59 API route được bảo vệ, `Gate Failures: 0`, "ALL CI QUALITY GATES PASSED" |

**3 test đang đỏ trên `main` (có sẵn từ trước, chưa sửa trong B01):**

1. `tests/visionEngine.test.ts:25` "validates valid PNG magic bytes": `expected false to be true`. Test dùng buffer 6 byte (chỉ chữ ký PNG); `validateImageBuffer` đã được siết ở A07 nên có khả năng test đã lỗi thời (giả thuyết, chưa xác minh).
2. `tests/visionIntegration.test.ts:63` Scenario A: kỳ vọng `rationale` chứa "Người cao tuổi", thực tế là câu "Tấm thảm tại vị trí "Cạnh giường ngủ" không có lớp lót cao su…". Lệch chuỗi văn bản giữa test và risk engine/template.
3. `tests/riskIntegration.test.ts:114`: `expected 'BEDROOM' to be 'BATHROOM'`: `evaluateRoomHazards(bathroom3D)` trả `roomType` BEDROOM. **Thuộc vùng `src/lib/risk/**` (Thành viên 1)** nên cần hỏi A, không tự sửa.

Lưu ý: `tests/globalSetup.ts` chạy Prisma db push với `--accept-data-loss` (đã ghi trong `docs/ML_STATE.md`); chạy `npm test` sẽ ghi vào DB cục bộ.

## 2. Ảnh chụp màn hình (DEMO)

Chạy được **không cần secret**: `next dev` trên cổng 3917 với `SAFEHOME_PRIVATE_DIR` tạm, đăng ký tài khoản demo cục bộ qua `/api/auth/register` (cookie `safehome_session`), rồi Playwright (qua MCP) chụp. Không dùng `scripts/completion/browser.cjs` vì script đó cần `next build` + Chromium ở đường dẫn cố định (Windows/Linux) và chạy cả kịch bản upload.

- Thư mục: `docs/collaboration/b01-screenshots/`, 12 file `DEMO_<route>_<desktop1440|mobile375>.png` cho `/workflow`, `/ai-vision`, `/vision`, `/digital-twin`, `/simulations`, `/reports`.
- Chỉ là trạng thái ban đầu của trang (dữ liệu mẫu trong store), **chưa** đi qua 7 bước, **chưa** tải ảnh. Ảnh mẫu trong `/vision` là ảnh stock Unsplash do app tự nạp, không phải ảnh riêng tư. Có huy hiệu "N" của Next dev ở góc.
- Console: với 12 lượt tải, bộ lắng nghe `console.error`/`pageerror` ghi **0 lỗi** (chỉ có log INFO/Fast Refresh). Đây chưa phải kiểm thử hồi quy; chưa kiểm tra tràn ngang ở 375px bằng số đo, và chưa nhìn từng ảnh một (chỉ xem `DEMO_vision_desktop1440.png`).
- Chưa chụp: canvas 3D có đối tượng (WebGL headless chưa xác minh), bước 3 của `/workflow` (nơi có bbox giả). **BLOCKED một phần**, cách lặp lại: `SAFEHOME_PRIVATE_DIR=/tmp/x SAFEHOME_APP_ORIGIN=http://127.0.0.1:3917 npx next dev -H 127.0.0.1 -p 3917`, đăng ký, đặt cookie, vào `/workflow`, bấm tới bước 3.

## 3. Kiểm kê route

Chủ sở hữu theo `SHARED_CONTRACT_V1.md` §5 (A = Thành viên 1, B = Thành viên 2). Trạng thái "thật" nghĩa là gọi provider thật hoặc tính từ dữ liệu người dùng; chưa chạy provider nên chưa xác nhận kết quả phía provider.

| Route | Chủ | API / lib gọi | Trạng thái |
| :--- | :-: | :--- | :--- |
| `/workflow` (7 bước) | B | `POST /api/workflow/save-state` (`page.tsx:160`); `evaluateRoomHazards`, `normalizeRoomStateToAssessmentInput` (client); **không gọi vision API, không gọi `/api/v1/snapshots`** | **Bước 3 là GIẢ** (xem §4). Lưu state không qua snapshot A11 |
| `/ai-vision` | B | `/api/vision/rooms/{id}/images`, `/images/{id}/analyze`, `/images/{id}` DELETE, `/detections/{id}`, `/clarifications/{id}/answer`, `/rooms/{id}/reassess` | Ảnh tải lên: provider thật (`createVisionProvider`). Ảnh `img-demo-*`: `MOCK_DEMO` (`analyze/route.ts:56`, `visionProvider.ts:1035`) |
| `/vision` | B | `AiRoomScannerWizard` → `POST /api/vision/scan-photo`, `POST /api/simulations` | Provider thật; lỗi → hiện lỗi, quay bước 2 (không còn layout dựng sẵn) |
| `/digital-twin` | B | `AiRoomScannerWizard`, `RoomViewer`, store | Như `/vision`; 3D từ `reconstructSceneFromDetections` (ước lượng) |
| `/simulations` | B | `/api/simulations` (GET/POST/DELETE, `[id]`), `AiRoomScannerWizard` | Lưu/đọc DB; cảnh vẫn là ước lượng |
| `/reports` | B | store (`useSimulationStore`), không fetch | Tính từ store; có ghi chú "không phải chứng nhận" (`page.tsx:168`) |
| `/scenario-simulator`, `/dashboard`, `/experience` | B | `RoomViewer`, store; `/experience` import `homeExperience` | Mô phỏng/`simulated`; không gọi vision |
| `/risk-assessment`, `/explainability`, `/risk-assessment/traceability` | A/B | `evaluateRoomHazards`, `compareAssessments`, registry (client) | Rule engine tại client, không fetch |
| `/ai-assistant` | B | `/api/ai/chat`, `/chat/stream`, `/conversations`; `ItemAssessmentModal` → `/api/vision/assess-item` | Item assessment có fallback heuristic (xem §4) |
| `/ai-guided-survey` | B | `/api/surveys/**` (kể cả `/photos`) | Thật (DB) |
| `/analytics`, `/sign-in`, `/` | B | store / `/api/auth/*` | Không liên quan vision |

**API vision (`src/app/api/vision/**`, 14 route):** `scan-photo`, `assess-item`, `analyses/[id]` (+`/detections`), `images` (+`[id]`, `/analyze`, `/file`), `detections/[id]`, `clarifications/[id]/answer`, `rooms/[id]/{images,clarifications,reassess,scene-draft,sync-survey}`.
**Không trang nào gọi** `api/v1/snapshots/*` (A11) hay `scene-draft`/`sync-survey` qua fetch (grep `src/` không thấy).

### Đính chính so với danh sách giả định ban đầu

- **`scan-photo` KHÔNG còn chuỗi Gemini → OWL-ViT → layout dựng sẵn.** `route.ts` dùng `createVisionProvider()` (`VISION_PROVIDER=gemini|local`, cấu hình sai thì lỗi, không đổi provider âm thầm); lỗi trả 503 `PROVIDER_UNAVAILABLE`. Không tìm thấy "OWL" trong `src/`. Có consent guard (`third_party_ai` khi dùng Gemini).
- **`geminiVisionAdapter.ts` còn là mã cũ:** hàm `analyzeRoomPhotoWithGemini` (L110) không còn được gọi trong `src/` (chỉ type + `getFallbackRoomDetections` dùng ở test). Các điểm "không có responseSchema", "clamp confidence [0.5,0.99] mặc định 0.9" (L303), timeout 3.5 s và fallback tại L218 **đúng với file** nhưng là mã chết ở luồng sản xuất; luồng thật là `providers/GeminiProvider.ts` + `structuredGemini.ts`.
- **Prompt "15 vs 16 loại" đã lỗi thời:** prompt liệt kê 18 giá trị và `CATEGORY_TAXONOMY` có 18 khóa (khớp `README` "18 lớp").
- **`assess-item` mặc định không phải "80/HIGH"**: mặc định là template `rug`, `riskScore: 86`, `severity: "HIGH"` (`itemHazardAnalyzer.ts:15-19, 637`). Phần còn lại đúng: chọn template theo tên file/`itemHint` (L624-637).

## 4. Kiểm kê kết quả giả / chưa xác minh

| # | file:line | Mô tả | Mức | Task sửa |
| :-: | :--- | :--- | :-: | :-: |
| 1 | `src/app/workflow/page.tsx:796-823` | Bước 3 vẽ 3 bbox cố định đè lên **mọi ảnh** tải lên: "Giường ngủ (94%)" (L799), "Thảm sàn (88%)" (L805), "Dây điện sàn (82%)" (L811), "Độ tin cậy TB: 88.2%" (L823); không gọi vision API. Ảnh là `uploadedPhotos[0]` (L791) | **P0** | B06 (hoặc B04 nếu gỡ tạm) |
| 2 | `src/app/workflow/page.tsx:120-124` | `visionDetections` khởi tạo cứng 4 mục, `confidence` 0.94/0.89/0.88/0.82, **`confirmed: true`** sẵn; nút xác nhận chỉ đổi cờ cục bộ (L846). Người dùng thấy "đã xác nhận" mà chưa ai xác nhận | **P0** | B06 |
| 3 | `src/app/workflow/page.tsx:160` | Lưu chỉ qua `/api/workflow/save-state`, không dùng snapshot A11 `/api/v1/snapshots` | P1 | B06 (cần A) |
| 4 | `src/lib/vision/itemHazardAnalyzer.ts:624-646` + `assess-item/route.ts:54-57` | Không có Gemini/key lỗi → template cố định chọn theo tên file/hint, mặc định `rug` (86/100, HIGH); preset gửi `Buffer.from("preset-mock-image-data")`; kết quả vẫn mang nhãn "SafeHome Clinical Intelligence Engine". Ảnh bất kỳ nhận điểm "chuyên gia" | **P0** | B07 |
| 5 | `src/lib/vision/itemHazardAnalyzer.ts:589-` | Citation CDC cố định kèm câu "prevents up to 35% of fatal home falls" gắn vào kết quả Gemini; chưa kiểm chứng với tài liệu gốc | P1 | B07 |
| 6 | `src/lib/vision/geminiVisionAdapter.ts:303, 110-220` | (mã cũ) confidence kẹp [0.5, 0.99], mặc định 0.9; không có responseSchema; fallback `getFallbackRoomDetections` (confidence 0.85-0.96 cứng). Không còn được gọi ở sản xuất, nhưng vẫn bị test và có thể bị dùng lại nhầm | P1 | B07 (xóa/đánh dấu deprecated) |
| 7 | `src/lib/vision/visionProvider.ts:344-1001` | `runDemoVisionAnalysis`: phát hiện theo chú thích/tên file, bbox cứng, confidence 0.95; chỉ chạy khi `img-demo-*` hoặc MANUAL_REVIEW; nhãn `MOCK_DEMO` (L552-600) | P1 (đã gắn nhãn) | B04 (đảm bảo UI hiện "DEMO") |
| 8 | `src/lib/reconstruction/spatialReconstructor.ts:28-29, 40, 82-84, 109-113, 123-124, 167-168` | FOV 65° (L29, L109), pitch 18° (L28), camera cao 1.45 m (L40), phòng mặc định 4.5×5.0 ngủ / 3.2×3.6 tắm, cao 2.8 (L82-84), hệ số chiều cao ×0.9 (L113), áp tường theo ngưỡng bbox 0.28/0.72 (L123-124, 167-168). Mọi số đo đều là `simulated`/ước lượng nhưng cảnh hiển thị như bản dựng | P1 | B04/B09 |
| 9 | `src/lib/reconstruction/spatialReconstructor.ts:240-270` | Kích thước và độ cao cố định theo loại vật thể (tranh y=1.55, quạt trần cao-0.28, điều hòa cao-0.42, sofa/bàn/ghế có chiều dài cố định) | P1 | B04 |
| 10 | `src/components/scanner/AiRoomScannerWizard.tsx:249-250` | `handleConfirmVerification` đánh dấu **tất cả** detection chưa bị loại là `CONFIRMED` bằng một cú bấm, không từng mục. Trái định nghĩa "Xác nhận của người dùng" trong `CONTEXT.md` nếu coi là `user_confirmed` | P1 | B06 |
| 11 | `AiRoomScannerWizard.tsx:44-46, 79-84` | Chế độ mặc định `SAMPLE`: ảnh stock Unsplash tải từ internet, vẫn gửi qua provider thật | P1 (privacy/độ tin cậy demo) | B04 |
| 12 | `AiRoomScannerWizard.tsx:335-341, 383, 466, 677` | Từ ngữ: "Photorealistic 3D Reconstruction", "PBR Engine", "tái dựng Digital Twin"; README: "photorealistic dollhouse", "68/100", "Digital Twin". Trái `CONTEXT.md` ("Mô hình phòng gần đúng"), nguy cơ hiểu nhầm là đo đạc | P1 | B09 |
| 13 | `docs/audit/REMAINING_LIMITATIONS.md:19-23` | "Sai số ±10–15%" **chưa đo**, không có số liệu | P1 | B09 (xóa hoặc ghi "chưa đo") |
| 14 | `docs/audit/REMAINING_LIMITATIONS.md:40` | "trước khi xuất chứng nhận an toàn phòng ngừa té ngã": trái nguyên tắc 5 của Contract V1 và `reports/page.tsx:168` ("không phải chứng nhận"); không có chức năng cấp chứng nhận | P1 | B09 |
| 15 | `docs/audit/REMAINING_LIMITATIONS.md:50-53` | Nói EXIF "được loại bỏ" trước khi xử lý; cần đối chiếu với mã `imageMetadata.ts`/`imageStorage.ts` (chưa kiểm trong B01) | P1 | B07 |
| 16 | `README.md:11, 88, 111` | Quảng bá "Photorealistic", "mô phỏng ánh sáng 0-520 Lux" cạnh số đo; chưa đối chiếu hết | P1 | B09 |

Không tìm thấy `Math.random` nào quyết định kết quả vision/rủi ro; chỉ dùng tạo ID (`spatialReconstructor.ts:88`, `visionProvider.ts:349`). `docs/ML_STATE.md` đã khai rõ: mAP/precision/recall **chưa đánh giá được**, ONNX chưa hoàn tất; không trích số nào trong B01.

## 5. Nghi vấn lệch/nổi/tỉ lệ 3D (đọc mã, **chưa xác minh bằng mắt**)

1. `ModelRenderer.tsx:125-127` đặt `position={object.position}` + `scale={object.scale}` rồi nhiều nhánh đặt con ở `dimensions.height * 0.5` (L137, L157): nếu `object.position.y` đã là tâm thay vì đáy thì vật bị nổi nửa chiều cao. Cần kiểm hợp đồng "y là đáy hay tâm" giữa `spatialReconstructor` (y=0 cho sàn) và renderer.
2. GLB (`resolvedGlb`, L134-): kích thước hiển thị phụ thuộc `object.scale`; chưa thấy bước chuẩn hóa bounding box GLB về `dimensions` (chưa đọc hết file).
3. Vật treo/trần dùng y tuyệt đối (`spatialReconstructor.ts:244-249`, `1.55`) nên đổi chiều cao phòng thủ công vẫn lệch (tranh cố định 1.55 m).
4. `unprojectBboxTo3D` kẹp `t` bằng đường chéo phòng và `widthM ≥ 0.15`, `lengthM` từ hai cạnh bbox: vật không nằm sàn (tủ, sofa sát tường) cho kích thước sai; nhánh dùng `unproj` cho cả vật dựa tường.
5. Hệ số `×0.9` và FOV/pitch cố định: ảnh chụp bằng camera khác (góc rộng) sẽ lệch tỉ lệ. Chưa có hiệu chỉnh.
6. `src/components/three/RoomCanvas.tsx` (1410 dòng) và `ProceduralFurniture.tsx` (955 dòng) chưa được đọc đủ cho B01; cần B04 đo thực nghiệm bằng ảnh chụp.

## 6. Bản đồ chủ sở hữu (tham chiếu CONTRACT V1 §5)

| Khu vực | Chủ | Ghi chú cho B01 |
| :--- | :-: | :--- |
| `src/app/workflow/**` (UI) | B (không có dòng riêng; xếp theo UI) | Sửa #1-3 do B; #3 cần A xác nhận cách dùng snapshot |
| `src/lib/vision/**`, `src/app/ai-vision/**`, `src/components/three/**`, `src/app/digital-twin/**` | B owner | Fix #4-12 |
| `src/app/api/vision/**` | B sửa trong phạm vi vision, A là reviewer bắt buộc (tự merge nếu 24h không phản hồi, kèm log test); **không đổi shape contract v1** | #4 chạm `assess-item/route.ts` |
| `src/lib/risk/**`, `src/lib/contracts/**`, `prisma/**`, `src/app/api/v1/**` | A | Test #3 đỏ nằm ở đây |
| `src/lib/reconstruction/**` | **không có dòng riêng trong §5** | Đề nghị gộp vào B (xem câu hỏi) |
| `src/components/scanner/**`, `src/components/chat/**`, `src/app/vision/**`, `src/app/simulations/**` | **không có dòng riêng trong §5** | Như trên |
| `docs/audit/**`, `README.md` | không quy định | #13-16 cần thống nhất |

## 7. Câu hỏi cho A

1. `tests/riskIntegration.test.ts:114` (BATHROOM → BEDROOM) và hai test đỏ còn lại: A đã biết chưa? A sửa hay B được phép sửa test vision (`visionEngine`, `visionIntegration`)?
2. `/workflow` nên lưu qua snapshot A11 (`/api/v1/snapshots`) hay giữ `save-state`? Nếu snapshot: payload tối thiểu cho `RoomV1`/`AssessmentResultV1` là gì khi chỉ có ảnh + `vision_estimated`?
3. Có đồng ý xóa/đánh dấu deprecated `analyzeRoomPhotoWithGemini` và `getFallbackRoomDetections` (mã chết) cùng test của chúng không?
4. Fallback `assess-item` khi không có Gemini: A chấp nhận đổi thành trả "chưa xác định" (như `CONTEXT.md`) thay vì template điểm số? Đây là thay đổi hành vi API vision (không đổi shape).
5. `docs/audit/REMAINING_LIMITATIONS.md` và README do A hay B sở hữu? (cần để sửa #13-16)
6. Thêm `src/lib/reconstruction/**`, `src/components/scanner/**`, `src/app/workflow/**` vào bảng §5 cho B?
7. `tests/globalSetup.ts` dùng `--accept-data-loss`: có chấp nhận chạy trên DB dev của B không?

## 8. Cách smoke-test luồng 7 bước (chưa thực hiện)

Repo chưa có harness E2E cho `/workflow` (`scripts/completion/browser.cjs` kiểm cả luồng vision/consent bằng Chromium + `next build` + detector giả cổng riêng; `scripts/verify_cinematic_experience.cjs` cho `/experience`). Không thêm framework mới. Quy trình tay/Playwright để đưa vào B06:

1. Chạy server như §2; đăng ký tài khoản demo; vào `/workflow`.
2. Đi hết 7 bước bằng ảnh stock/fixture (ghi DEMO).
3. Tại bước 3, khẳng định **không có** nhãn phần trăm khi chưa gọi vision API (hiện tại: có, đây là lỗi #1).
4. Kiểm bước lưu: một request tới `save-state`; reload thì khôi phục đúng.
5. Ghi lại console error và ảnh chụp từng bước ở 1440 và 375.
