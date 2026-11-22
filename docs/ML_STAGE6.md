# Giai đoạn 6 — Tích hợp provider vào repo

> Bản tích hợp đầu tiên, giữ để truy vết. Đã có lần hoàn thiện tiếp theo: [ML_COMPLETION.md](ML_COMPLETION.md). Gemini, lưu trữ, đồng bộ và các số kiểm thử hiện hành theo báo cáo mới; các mô tả adapter cũ và giới hạn lưu metadata dưới đây không còn đại diện bản hiện tại.

Ngày: 22/11/2026. Hoàn thành tích hợp và kiểm thử hợp đồng phần mềm. Chưa có đánh giá chính thức hoặc model ONNX được fine-tune trên dữ liệu người dùng.

## 1. Đã làm gì

- Tạo interface `VisionProvider`, triển khai `GeminiProvider` và `LocalDetectorProvider`; chọn server-side bằng `VISION_PROVIDER=gemini|local`. Giá trị khác bị từ chối. Không đổi provider ngầm khi lỗi.
- `GeminiProvider` gọi adapter hiện có với `isCustom=true`, kiểm tra model thật, nguồn detection, taxonomy, confidence và bbox. Không chấp nhận model dự phòng. Kết quả rỗng hợp lệ được giữ rỗng. Không sửa prompt hay chạy lại thí nghiệm/test Giai đoạn 4.
- `LocalDetectorProvider` gửi byte ảnh tới `/detect` của FastAPI Giai đoạn 5. Kiểm tra phiên bản hợp đồng, SHA model, 18 lớp phân chia thành đã/chưa huấn luyện và chỉ nhận bbox của lớp đã huấn luyện. Không tải weights, không gọi cloud dự phòng. FastAPI bổ sung metadata lớp và `contract_version=1` cho health/detect; startup vẫn yêu cầu ONNX đã kiểm tra checksum/parity.
- Hai API nhận ảnh đều qua provider mới, giữ cấu trúc `detections`, `observations`, `modelUsed` cho consumer hiện có. Nhận MIME từ magic bytes, giới hạn 10 MB, xử lý APP1 JPEG bằng helper hiện có; endpoint scan giới hạn cả body stream. Lỗi provider trả 503, ảnh không hợp lệ trả 400, quá giới hạn body trả 413.
- Mọi vật thể máy nhận diện vẫn `PENDING_REVIEW`. Không dùng ghi chú hazard suy đoán hoặc vật liệu được cho là chống trượt làm sự kiện đã xác nhận. Hai provider chỉ cung cấp ứng viên vật thể, tám nguy cơ luôn `unknown`, `risk_supported=false`. Trạng thái này phản ánh giới hạn hiện tại, không phải nhãn âm.
- Ảnh thật không còn nhánh dùng caption hoặc bố cục mẫu để tạo detection. Demo cần cờ riêng; API chỉ cho những ID demo có sẵn và trả nguồn `MOCK_DEMO`. Manual review vẫn không gọi model.
- Giữ câu hỏi khảo sát để người dùng xác nhận, với lựa chọn chưa rõ. Sửa nhánh mapping `unknown`/`unlabeled`/trống để không ghi sự kiện đã xác nhận về tay vịn hoặc sàn.
- Giao diện ảnh không còn tự điền chiều rộng, lux, ma sát, cao độ hoặc chấm điểm từ ảnh; hiển thị cần kiểm tra, giữ applicability của registry. Bỏ kết luận “đạt tiêu chuẩn an toàn” khi chưa có finding và bỏ finding HIGH giả để mở Copilot. Luồng đánh giá lại từ hồ sơ khảo sát vẫn riêng biệt.
- README ghi đúng số đo thăm dò, giới hạn dữ liệu, cách chọn provider và điều kiện chạy local; bỏ tuyên bố tuyệt đối và bảng 109 test lịch sử dùng như kết quả hiện tại. `width="100%"` của ảnh là thuộc tính bố cục, không phải tuyên bố chất lượng.

## 2. File đã tạo/sửa

| Nhóm | File |
| --- | --- |
| Hợp đồng và triển khai | [providers/contracts.ts](../src/lib/vision/providers/contracts.ts), [GeminiProvider.ts](../src/lib/vision/providers/GeminiProvider.ts), [LocalDetectorProvider.ts](../src/lib/vision/providers/LocalDetectorProvider.ts), [normalization.ts](../src/lib/vision/providers/normalization.ts), [index.ts](../src/lib/vision/providers/index.ts) |
| Điều phối, xác nhận | [visionProvider.ts](../src/lib/vision/visionProvider.ts), [clarificationEngine.ts](../src/lib/vision/clarificationEngine.ts), [photoClarifications.ts](../src/lib/vision/photoClarifications.ts), [photoRiskAssessment.ts](../src/lib/vision/photoRiskAssessment.ts) |
| API, giao diện | [scan-photo/route.ts](../src/app/api/vision/scan-photo/route.ts), [images/analyze route](../src/app/api/vision/images/[imageId]/analyze/route.ts), [ai-vision/page.tsx](../src/app/ai-vision/page.tsx) |
| Dịch vụ local | [serve_stage5.py](../scripts/ml/serve_stage5.py) |
| Kiểm thử | [visionProviders.test.ts](../tests/visionProviders.test.ts), [visionRoutes.test.ts](../tests/visionRoutes.test.ts), [visionEngine.test.ts](../tests/visionEngine.test.ts), [visionIntegration.test.ts](../tests/visionIntegration.test.ts), [geminiVision.test.ts](../tests/geminiVision.test.ts) |
| Cấu hình, tài liệu | [.env.example](../.env.example), [package.json](../package.json), [CI](../.github/workflows/ci.yml), [README](../README.md), [ML_STATE](ML_STATE.md) |
| Xác minh | [verify_stage6.py](../scripts/ml/verify_stage6.py), [smoke_stage6.cjs](../scripts/ml/smoke_stage6.cjs), [verification.json](../reports/stage6/verification.json), [Vitest JSON](../reports/stage6/vitest.json), [risk-regression.json](../reports/stage6/risk-regression.json), [HTTP smoke](../reports/stage6/http-smoke.json) |

Không sửa nguồn đã fingerprint của Giai đoạn 4: adapter Gemini lịch sử, helper chấm ảnh cũ, taxonomy, types và luật/ngưỡng y khoa. Helper chấm ảnh cũ chỉ được giữ cho baseline lịch sử, UI hiện tại dùng helper thận trọng mới.

## 3. Kết quả số liệu thật

- `npm run test:vision`: **80 passed, 1 skipped**, 5 file. Trong đó 54 ca provider/geometry/unknown, 8 ca API, 14 ca vision engine, 2 ca tích hợp cũ và 2 ca adapter offline; ca Gemini thật bỏ qua có chủ đích. Test không tự đọc `.env`, không gọi API trả phí, không chạy Prisma global setup.
- Regression luật: **24 passed**, 3 file (`riskEngine`, `riskIntelligence`, `riskIntegration`).
- `npx tsc --noEmit`: đạt. `npm run build:experience`: đạt, 39 trang prerender, build tách biệt và không chạy lint trong lệnh này. **5 kiểm tra HTTP trên Next production thật đạt**: trang ảnh render, provider offline trả 503, ảnh sai trả 400, stream quá lớn trả 413, phân tích ảnh thất bại trước persistence. Không chạy kiểm thử trình duyệt hay suy luận model thật. CI chạy bộ hợp đồng và smoke HTTP sau build.
- JSON reporter Vitest 1.x ghi summary 81 passed dù một assertion có status `skipped`; script xác minh đếm `assertionResults` và ghi đúng 80 passed/1 skipped như terminal.
- Giao tiếp HTTP local có test thực qua loopback với máy chủ trả fixture; không phải suy luận FastAPI/ONNX. Kiểm tra MIME, byte ảnh và payload qua mạng nội bộ, lỗi/timeout và phạm vi lớp. Python service kiểm tra cú pháp; chưa cài dependency optional hoặc khởi động model thật.
- Xác minh 506 file raw khớp ZIP gốc; manifest, quyết định duyệt của người dùng và các nguồn fingerprint Giai đoạn 4 giữ nguyên. Không mở nhãn test để chỉnh cấu hình, không gọi lại test thăm dò, không thay nhãn AI thành nhãn người.
- Số chất lượng gần nhất vẫn là **thăm dò trên nhãn AI**: `structured` val mAP50 **0.7822** (6 ảnh), test mAP50 **0.7092** (5 ảnh), mỗi tập không lỗi inference ở cấu hình đó. Không có HIGH dương tính nên HIGH recall/F1 nguy cơ chưa đánh giá được. Đây không phải số đo của provider mới.
- Số ảnh train/val có bbox con người xác nhận: **0**; model fine-tune thực, ONNX xuất thực và độ trễ model thực: **chưa có/chưa đo**.

## 4. Rủi ro và giả định

- Gemini giữ adapter lịch sử để tương thích, gồm timeout 3.5 giây và prompt chưa có schema chặt. Trong Giai đoạn 4, baseline này lỗi 6/6 ảnh val; không diễn giải thành độ chính xác model bằng không. Tích hợp không tự tuyên bố đạt điểm của prompt `structured` thí nghiệm.
- Guard đầu ra từ chối bbox NaN/Infinity, confidence ngoài khoảng và lớp ngoài taxonomy. Bbox được chuẩn hóa với scale/order chỉ định; clipping và đảo góc áp dụng cho bbox hợp lệ. Không suy diễn metadata vật lý từ tọa độ ảnh.
- FastAPI chỉ nên chạy loopback như hướng dẫn. URL được cấu hình bởi người vận hành, không lấy từ request người dùng; triển khai dịch vụ ở máy khác cần cấu hình truy cập phù hợp.
- Chưa chạy FastAPI/ONNX thật vì chưa có artifact Giai đoạn 5. Test fixture chỉ xác minh giao thức. Chưa benchmark chính thức cho provider mới, chưa đo độ trễ cloud/local sau tích hợp.
- Dữ liệu chủ yếu Wikimedia, ít nhà Việt Nam và không có bằng chứng đại diện quần thể. Unknown vẫn cần khảo sát/đo; xác nhận vật thể không đồng nghĩa xác nhận nguy cơ.
- Cấu trúc phản hồi có thêm provenance nhưng schema database không đổi. `modelId`/`modelVersion` và detection được lưu theo schema cũ; trường `risks`, `untrainedClasses`, SHA riêng được trả trong response, chưa có cột database riêng cho toàn bộ metadata này.
- Không thêm model/thư viện mới. Điều kiện giấy phép RT-DETR/ONNX/FastAPI giữ như [Giai đoạn 5](ML_STAGE5.md).

## 5. Việc người dùng cần làm thủ công

- Muốn dùng cloud: cấu hình key/model ở môi trường server; mặc định `VISION_PROVIDER=gemini`. Không cần gửi key vào hội thoại.
- Muốn dùng local thật: bổ sung ảnh và bbox/nhãn đã được con người xác nhận, đạt cổng Giai đoạn 5, chạy notebook huấn luyện/export/parity, rồi khởi động FastAPI và đặt `VISION_PROVIDER=local`. Hiện chưa có model để bật local thành công.
- Với kết quả ảnh: xác nhận vật thể, trả lời câu hỏi hoặc hoàn thành khảo sát, đo những thông số không đọc được từ ảnh trước khi dùng kết quả nguy cơ.

## 6. Câu hỏi cần quyết

Không có quyết định chặn hoàn tất tích hợp. Không commit, deploy, huấn luyện hoặc chạy lại tập test đóng băng trong Giai đoạn 6 này. Dừng sau Giai đoạn 6 theo yêu cầu từng giai đoạn.
