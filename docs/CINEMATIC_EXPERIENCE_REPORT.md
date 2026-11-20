# SafeHome 3D AI — Cinematic Digital Twin

Ngày kiểm chứng: 21/11/2026 (Asia/Saigon). Triển khai trực tiếp trong repository, tại `/experience` và trình xem Digital Twin hiện có. Không thay đổi schema Prisma hay công thức chấm điểm.

## Chạy và kiểm thử

```powershell
npm run dev:experience
# http://localhost:3210/experience

npm run build:experience
npm run start:experience

npm run test:experience
npx vitest run --config vitest.experience.config.ts
npx tsc --noEmit --incremental false
```

Các script experience dùng `.scratch/cinematic-dev` hoặc `.scratch/cinematic-production`, tránh tranh chấp output `.next` với server phát triển khác. Có thể đổi cổng qua `SAFEHOME_PREVIEW_PORT`. Build experience dùng `next build --no-lint`; kết quả build không bao gồm kiểm tra ESLint.

Kiểm thử trình duyệt là công cụ phát triển tùy chọn, không thêm dependency production. Cần cài Playwright và Chromium, hoặc chỉ định một browser Chromium đã có:

```powershell
npm install --no-save --package-lock=false playwright
npx playwright install chromium
npm run test:experience:browser
node scripts/measure_experience.cjs
```

Biến tùy chọn: `PLAYWRIGHT_MODULE` (đường dẫn module Playwright), `SAFEHOME_BROWSER_EXECUTABLE` (Edge/Chrome), `SAFEHOME_PREVIEW_URL` (mặc định `http://localhost:3210`). Cần chạy preview trước. Lần kiểm chứng này dùng Playwright 1.65.1 từ npm cache và Edge 157.0.4341.60, không cài thêm dependency vào repository.

## Đánh giá kiến trúc ban đầu

Ứng dụng đã có Next.js 14, R3F/Drei, GLB, texture PBR, mô hình phòng, bộ kiểm tra không gian, risk engine xác định, AI Vision adapter và Zustand với Undo/Redo. Đây là nền tảng được tái sử dụng.

Trang experience cũ dùng điểm số, marker và số liệu cố định; chuyển chương dựa trên nút/thời gian, chưa gắn với vị trí cuộn thật. Các phần đó được thay bằng dữ liệu phòng và kết quả risk engine. Backend, route đánh giá, luồng khảo sát, AI Assistant/RAG và editor tiếp tục dùng kiến trúc hiện tại.

## Kiến trúc sau triển khai

```text
RoomState / AI scene adapter / phòng mẫu có nhãn
                 |
       snapshot baseline + scenario
                 |
       homeExperience domain helpers
       |                          |
 existing risk engine       interventions + history
       |                          |
 findings / evidence / score / resolved findings
                 |
 /experience: sáu chương + inspector + điều khiển
                 |
 CinematicScene (một WebGL canvas)
   camera timeline, selection, model rendering, lighting
   comparison: baseline scene portal + scissor, cùng camera
                 |
 "Áp dụng kịch bản" -> Zustand -> editor / Scenario Simulator
```

`homeExperience.ts` không phụ thuộc renderer. `camera.ts` tính pose/timeline, `navigation.ts` kiểm tra vị trí đi bộ. Dữ liệu quan sát và đánh giá tách khỏi ánh sáng trình diễn. Không thêm GSAP, engine 3D thứ hai hoặc dependency production mới.

## Những chức năng đã triển khai

- Sáu chương theo cuộn: tổng quan, nội thất, phát hiện nguy cơ, cơ chế/bằng chứng, can thiệp, so sánh. Canvas sticky, camera nội suy, intro mái cắt lớp khoảng 1,5 giây và nút bỏ qua.
- Sáu chế độ Dollhouse, mặt bằng, nội thất, đi bộ, nguy cơ, trước/sau; xoay/pan/zoom, fit/reset, chọn khu vực/đồ vật, focus, bật/tắt tường và lối đi. WASD có chặn biên phòng, vật cản AABB và các vách ngăn của preset dollhouse.
- Marker xuất phát từ finding thực, gắn vào đối tượng/vị trí bằng chứng, có nhãn chữ và mức độ. Inspector hiển thị rule, trạng thái xác nhận, nguồn quan sát, kích thước/độ chắc chắn và liên kết khuyến nghị.
- Cố định thảm, thu gọn dây, dọn vật cản, thêm thanh vịn, đèn đêm và chống trượt cập nhật snapshot rồi gọi risk engine hiện có. Chỉ tác động đối tượng/finding phù hợp; thêm thiết bị dùng ID ổn định. Điểm không được cộng sẵn.
- So sánh dùng một canvas, hai scene và cùng camera/projection. Slider kéo hoặc dùng bàn phím; kết quả liệt kê nguy cơ đã giải quyết/còn lại/mới xuất hiện. Editor cũng có chế độ so sánh thật.
- Undo/Redo riêng cho bản thử nghiệm; lưu/nạp trên thiết bị bằng localStorage; chỉ cập nhật Zustand workspace khi bấm áp dụng. **Không phải lưu tài khoản hoặc đồng bộ server.**
- Năm preset ánh sáng; thay ánh sáng hiển thị không đổi lux hay điểm đánh giá. Can thiệp đèn đêm được ghi rõ là giả định mô phỏng.
- Mô hình giường có đệm/gối/chăn dạng lưới cong; toilet và lavabo dùng hình học gốc bo tròn. GLB khác tiếp tục được tái sử dụng; sửa vật liệu phi kim và texture clone để các instance không sửa texture dùng chung.
- Đo bounding box mesh thật, gồm nested transform, trước khi chuẩn hóa kích thước mét và điểm đỡ. Giữ elevation của đồ gắn tường, không ép Y của mọi đồ vật về 0.
- HIGH/LOW quality, DPR giới hạn, tải GLB theo nhu cầu, texture/geometry được sở hữu có dispose, contact shadow chỉ ở HIGH. IBL tạo trong scene, không tải HDRI bên ngoài.
- Giao diện sáng, panel thu gọn, chế độ xem rộng, mobile mặc định LOW; reduced-motion tắt autoplay và giảm chuyển động. Có fallback khi không tạo được WebGL và khôi phục context bị mất.

## Tệp tạo mới và sửa đổi

| Nhóm | Tệp | Vai trò |
| --- | --- | --- |
| Tạo | `src/lib/experience/homeExperience.ts` | Snapshot, intervention, đánh giá, provenance, so sánh |
| Tạo | `src/lib/experience/camera.ts`, `navigation.ts` | Pose/timeline, bắt đầu đi bộ và collision guard |
| Tạo | `src/app/experience/experience.css` | Theme và layout responsive |
| Tạo | `src/lib/assets/modelPlacement.ts` | Chuẩn hóa mesh bounds thật |
| Tạo | `src/components/three/ArchitecturalBed.tsx`, `ArchitecturalFixtures.tsx` | Hình học nội thất gốc |
| Tạo | `src/components/three/ComparisonViewer.tsx`, `WebGLBoundary.tsx` | So sánh editor và fallback |
| Tạo | `tests/homeExperience.test.ts`, `modelPlacement.test.ts` | Domain/camera/store và GLB geometry |
| Tạo | `vitest.experience.config.ts` | Chạy regression không sửa database phát triển |
| Tạo | `scripts/run-experience.cjs`, `verify_cinematic_experience.cjs`, `measure_experience.cjs` | Preview/build, browser QA, benchmark |
| Tạo | Các báo cáo JSON/Markdown và `docs/images/experience/*.png` | Bằng chứng kiểm chứng |
| Sửa | `src/app/experience/page.tsx` | Điều phối trải nghiệm dựa trên dữ liệu |
| Sửa | `src/components/experience/{CinematicScene,ChapterOverlay,experienceData}.tsx/ts` | Renderer, overlay, nội dung sáu chương |
| Sửa | `src/components/three/{ModelRenderer,RoomEnvironment,RoomCanvas,RoomViewer}.tsx` | Asset, ánh sáng, camera mượt, tích hợp so sánh |
| Sửa | `src/data/assetRegistry.ts` | Physical contract, loại bỏ khai báo LOD không có file |
| Sửa | `src/lib/reconstruction/sceneToRoomAdapter.ts` | Giữ source image/detection, confirmation và geometry provenance |
| Sửa | `src/stores/useSimulationStore.ts` | Baseline đúng phòng, áp snapshot, recompute và history |
| Sửa | `src/components/layout/{AppHeader,AppSidebar}.tsx` | Layout riêng tại `/experience` |
| Sửa | `next.config.mjs`, `package.json` | Output build riêng và script kiểm chứng |
| Sửa | `tests/copilotToolData.test.ts` | Callback beforeEach trả void để TypeScript hợp lệ |

## Asset và bản quyền

Chi tiết tại [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md). Không tải hoặc sao chép tài sản từ ảnh tham chiếu/website tham chiếu. Source mới là hình học tự xây dựng trong repository MIT. Các GLB và texture cũ tiếp tục được dùng với nhãn giấy phép đã có; manifest nguồn upstream đầy đủ của tài sản cũ chưa được xác minh độc lập. Không coi tên nhãn trong registry là chứng nhận giấy phép mới.

## Kết quả kiểm chứng

| Kiểm tra | Kết quả | Bằng chứng/phạm vi |
| --- | --- | --- |
| Production build | PASS | `npm run build:experience`: compile, TypeScript và generate 39 trang thành công |
| TypeScript riêng | PASS | `npx tsc --noEmit --incremental false`, exit 0 |
| Regression | PASS | 24 suite, **170/170** test; gồm risk, vision adapter, simulation, RAG/Copilot và geometry |
| Browser QA | PASS | **15/15** nhóm; [JSON kết quả](EXPERIENCE_BROWSER_RESULTS.json) |
| Asset geometry | PASS | Parse buffers/nodes/mesh thật của toàn bộ 12 GLB, kiểm tra kích thước và đáy bounds; unit test không decode ảnh texture |
| Kiểm tra ảnh kết quả | PARTIAL | Đã xem ảnh desktop/mobile/fallback; hình học và giao diện hoạt động, chưa đạt mức ảnh chụp nội thất tham chiếu |

Regression dùng cấu hình không chạy global database setup. Hai suite `workflowIntegration.test.ts` và `surveyIntegration.test.ts` có ghi DB không chạy trong lần này. Test Gemini đã dùng fallback local khi live inference timeout; không chứng minh dịch vụ AI bên ngoài hoạt động. Không chạy kiểm tra deployment, authentication và persistence server mới vì không thêm các luồng đó.

Ví dụ được quan sát trong browser: phòng ngủ mẫu có nguy cơ đạt 28/100, 6 findings; cố định thảm và thu gọn dây tính lại thành 58/100, còn 4 findings. Đây là kết quả của fixture và engine, không phải mức cải thiện cam kết cho mọi phòng. Lưu/nạp giữ 7 object và điểm 58; thay preset ánh sáng không đổi điểm; comparison chỉ có một canvas.

### Ma trận 18 tiêu chí nghiệm thu

PASS chỉ áp dụng phạm vi có bằng chứng thực thi dưới đây. PARTIAL chỉ ra phần chưa kiểm chứng đầy đủ; NOT TESTED không đồng nghĩa đã đạt.

| # | Tiêu chí | Trạng thái | Phạm vi và giới hạn |
| --- | --- | --- | --- |
| 1 | Tải nhà, không thiếu asset | PASS | Browser có pixel WebGL thật, không request asset lỗi hoặc page error ngoài dự kiến |
| 2 | Geometry phòng ngủ/phòng tắm | PARTIAL | Test preset layout và ảnh tổng quan hợp lệ; chưa có đo đạc nhà thực để đối chiếu |
| 3 | Đồ nội thất không nổi | PARTIAL | Parse/ground bounds cả 12 GLB và nested transform; chưa chứng minh mọi tổ hợp layout không xuyên nhau |
| 4 | Đồ treo tường/trần | PARTIAL | Test giữ elevation/rotation của fixture tường và spatial-validation regression; chưa kiểm tra mọi fixture trần trên nhà thực |
| 5 | Camera và chuyển cảnh | PASS | Scroll, top view, walkthrough, keyboard và ảnh trước/sau thao tác; unit test timeline liên tục |
| 6 | Chọn phòng | PASS | Browser chọn khu vực/phòng, viewport và panel đổi theo dữ liệu |
| 7 | Chọn hotspot | PASS | Browser chọn marker và mở bằng chứng |
| 8 | Finding gắn đúng object | PASS | Domain test target identity/vị trí và browser đọc `RULE_RUG_01` |
| 9 | Chương theo cuộn | PASS | Browser cuộn, phím điều hướng, autoplay và reduced-motion |
| 10 | Đồng bộ AI Vision | PARTIAL | Test adapter giữ ID/source/confirmation và vision integration; chưa upload ảnh mới qua live provider trong QA này |
| 11 | Thay đổi kịch bản | PASS | Intervention, Undo/Redo và apply sang editor chạy trong browser; unit test stable IDs/idempotence |
| 12 | Tính lại rủi ro | PASS | Engine được gọi với snapshot mới; browser kiểm chứng 28 -> 58 và findings thay đổi |
| 13 | So sánh trước/sau | PASS | Slider dùng một canvas/camera, keyboard đổi 50 -> 51; cả experience và editor hoạt động |
| 14 | Mobile responsive | PARTIAL | Emulation 390x844 có touch, LOW quality và không tràn ngang; chưa kiểm tra điện thoại vật lý |
| 15 | WebGL recovery | PASS | Browser chủ động lose/restore context; negative test getContext=null vẫn có fallback hữu ích |
| 16 | Hiệu năng tải thực tế | PARTIAL | Có số đo scene mẫu dưới đây; chưa có stress scene lớn hoặc benchmark điện thoại tầm trung thật |
| 17 | Lưu/nạp nhất quán | PASS | LocalStorage reload giữ object IDs, baseline và score; chỉ trong thiết bị/browser hiện tại |
| 18 | Không hồi quy module cũ | PARTIAL | 170 test, build và editor apply/comparison đạt; hai suite ghi DB và toàn bộ luồng backend chưa chạy |

### Hiệu năng đo được

[Dữ liệu gốc](EXPERIENCE_PERFORMANCE.json). Headless Edge 157, Windows, ANGLE Direct3D11 trên **Intel HD Graphics 620**. Mỗi profile warm-up 4 giây, lấy mẫu requestAnimationFrame khoảng 5 giây, scene dollhouse mặc định, deviceScaleFactor=1.

| Profile | Viewport | Canvas pixels | rAF/giây trung bình | p95 khoảng cách frame |
| --- | --- | --- | --- | --- |
| Desktop HIGH | 1440x960 | 979x752 | 59,1 | 17,6 ms |
| Desktop LOW | 1440x960 | 979x752 | 60,2 | 17,0 ms |
| Mobile emulation LOW | 390x844 | 390x320 | 60,1 | 17,0 ms |

Đây là nhịp callback rAF trên máy chạy, không phải phép đo GPU presented FPS hay chứng minh đạt 60 FPS desktop/30 FPS mobile cho mọi thiết bị. Mobile emulation vẫn dùng GPU laptop. **NOT TESTED:** điện thoại tầm trung thật, thermal throttling, scene nhiều tầng/nhiều trăm asset và đo độ trễ dài hạn. Không áp dụng Draco/Meshopt/KTX2 hoặc LOD giả cho các GLB hiện tại; ưu tiên lazy loading, caching và quality cap. Cần profile tải lớn trước khi quyết định pipeline nén/LOD tiếp theo.

## Ảnh chụp kết quả

| Góc/chức năng | Ảnh |
| --- | --- |
| Tổng quan | [01-home-reveal.png](images/experience/01-home-reveal.png) |
| Nội thất phòng ngủ | [02-bedroom-interior.png](images/experience/02-bedroom-interior.png) |
| Nguy cơ và bằng chứng | [03-risk-evidence.png](images/experience/03-risk-evidence.png) |
| Trước/sau | [04-before-after.png](images/experience/04-before-after.png) |
| So sánh trong workspace | [05-workspace-comparison.png](images/experience/05-workspace-comparison.png) |
| Mobile tổng quan | [06-mobile-home.png](images/experience/06-mobile-home.png) |
| Mobile can thiệp | [07-mobile-simulation.png](images/experience/07-mobile-simulation.png) |
| Không có WebGL | [08-webgl-fallback.png](images/experience/08-webgl-fallback.png) |
| Mặt bằng | [09-top-plan.png](images/experience/09-top-plan.png) |
| Đi bộ | [10-walkthrough.png](images/experience/10-walkthrough.png) |

## Giới hạn và công việc còn lại

1. Chất lượng hiện tại là mô hình kiến trúc tương tác có PBR, chưa tương đương ảnh photoreal tham chiếu. Một số asset cũ vẫn ít đa giác, cây/đèn còn đơn giản, thiếu cảnh quan ngoài cửa sổ và độ chi tiết vải/bề mặt ở mức render ngoại tuyến. Cần thêm công việc mỹ thuật, không thể coi ảnh kiểm thử pixel là bằng chứng photorealism.
2. Mô hình mặc định là preset có nhãn. Một ảnh RGB không bảo đảm hình học chính xác; dữ liệu AI vẫn giữ uncertainty/confirmation và cần người dùng đo/chỉnh trong editor hiện có. Không chứng nhận an toàn hay kích thước nhà thực.
3. Bounds chuẩn hóa không thay thế kiểm tra tiếp xúc chính xác từng mesh. Collision walkthrough dùng AABB và vách preset; chưa phải navmesh/capsule physics. Một số góc focus sát tường hoặc đồ lớn có thể cần điều chỉnh tay.
4. Bộ spatial validator hiện có tiếp tục được giữ; chưa có solver tự động giải mọi va chạm, hỗ trợ đồ đặt trên bàn, xoay theo mọi tường cong, hoặc chứng nhận lắp thanh vịn/trần. Cần QA riêng từng layout và mounting assembly.
5. Can thiệp là giả định trong snapshot. Thu gọn dây chọn vị trí có ít target findings hơn, không chứng minh phương án đã đạt mọi yêu cầu hình học hoặc lắp đặt thực tế.
6. Lưu thử nghiệm chỉ ở localStorage; đồng bộ tài khoản cần API/persistence riêng nếu muốn thêm sau. Số điểm là chỉ số engine của mô hình, không phải xác suất té ngã.
7. Cần hoàn thiện manifest nguồn/giấy phép upstream cho asset cũ, kiểm thử browser/device thật và chạy các integration DB trên database thử nghiệm riêng trước khi phát hành.
