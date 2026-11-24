# Hoàn thiện luồng Vision sau Giai đoạn 6

> Báo cáo lịch sử của đợt hoàn thiện Vision. Các task tiếp theo, tài khoản gia đình, xóa ảnh và kiểm thử mới được theo dõi trong [PROJECT_COMPLETION_TASKS.md](PROJECT_COMPLETION_TASKS.md). Hướng dẫn triển khai/sao lưu ở [ACCOUNTS_OPERATIONS.md](ACCOUNTS_OPERATIONS.md). Những số liệu bên dưới chỉ áp dụng cho phiên bản đã kiểm thử khi lập báo cáo này.

**Cập nhật sau rà soát toàn dự án:** đã hoàn thành T1–T5 và T7 trong [bảng task](PROJECT_COMPLETION_TASKS.md): 294 ca đạt, 1 ca bỏ qua; 10 kiểm tra HTTP và 22 kiểm tra trình duyệt đạt; build, TypeScript và sao lưu/khôi phục đạt. Dữ liệu gia đình được tách theo tài khoản. T6 còn phụ thuộc nhãn người xác nhận: train/val verified đều 0, nên chất lượng ML chính thức và fine-tune vẫn chưa hoàn thành. [Bằng chứng mới](../reports/completion/verification.json).

Ngày 22/11/2026. Báo cáo này thay thế kết luận nghiệm thu phần mềm trong bản Giai đoạn 6 đầu tiên; các thí nghiệm ML cũ vẫn giữ nguyên để truy vết.

## 1. Đã làm gì

### Xác nhận, thu hồi và đồng bộ

- Thống nhất câu hỏi Vision với question bank chính. Các ID `BED_007`, `BATH_003..007` không còn được dùng với ý nghĩa hoặc enum khác trong câu hỏi mới.
- Giữ bộ chuyển đổi cho câu trả lời cũ: `SECURED/UNSECURED` thành `YES/NO`; tay vịn `TOILET_ONLY/SHOWER_ONLY` thành vị trí tương ứng; có thảm chống trượt không suy ra sàn đang khô, không trơn hay đã đo ma sát.
- Lưu câu trả lời, thu hồi dữ kiện cũ do chính câu trả lời đó sở hữu, cập nhật SurveyAnswer/RoomProfile và audit trong cùng transaction. Unknown rút lại xác nhận cũ. Không xóa bằng chứng của câu hỏi khác hoặc ghi đè câu trả lời khảo sát độc lập mới hơn.
- Đổi câu trả lời cha không tự khôi phục câu trả lời con cũ. Đồng bộ và đánh giá lại không còn tạo phòng ngủ mặc định khi thiếu hồ sơ.
- Profile không còn gán 5 cm chỉ từ câu trả lời “có gờ bậc”, không lưu `UNKNOWN` như một vị trí tay vịn và giữ đúng câu trả lời không có vật cản theo loại phòng.
- Luồng đánh giá lại Vision chỉ gọi luật hiện có khi có đủ dữ kiện cho luật đó. Các thông số chưa đo và điều kiện chưa xác nhận giữ `NEEDS_VERIFICATION`; điểm tổng hợp giữ null khi chưa đủ dữ liệu. Không đổi ngưỡng trong registry.

### Gemini structured và nguồn kết quả

- `GeminiProvider` dùng SDK đã có trong repo, JSON Schema và kiểm tra runtime bằng Zod. Prompt/schema được xuất từ recipe `structured` đã khóa ở Giai đoạn 4; giữ seed 20261122, temperature 0.1 và object threshold 0.5.
- Recipe phục vụ là `structured-serving-v1`, có digest và tham chiếu config Giai đoạn 4. Việc port không phải lần benchmark mới và không gán điểm thăm dò cũ cho phần mềm mới. Biến thể phòng khách chưa được đánh giá.
- Timeout mặc định 60 giây, cấu hình `VISION_TIMEOUT_MS` trong 1000..120000; SDK một attempt, không retry ngầm, không chuyển model/provider khi lỗi. Phản hồi không đầy đủ, sai schema hoặc suy đoán phép đo bị từ chối.
- Gợi ý nguy cơ của Gemini nằm riêng trong `riskCandidates`, chưa được con người xác nhận. `risks` trước xác nhận vẫn unknown, `risk_supported=false`. Detector local chỉ trả vật thể và không suy nguy cơ.
- APP1 JPEG được loại bỏ trên tất cả segment metadata trước khi suy luận/lưu ảnh; dữ liệu scan nén được giữ nguyên. JPEG có segment hỏng bị từ chối.

### Lưu trữ, giao diện và kiểm thử

- Ảnh thật, detection, observation, câu hỏi và nguồn suy luận được lưu cùng một transaction; file vừa tạo được thu hồi nếu lưu database thất bại. Lỗi lưu không còn được trả như phân tích thành công.
- Liên kết câu hỏi với đúng phiên phân tích. Metadata provider/config/SHA model/gợi ý AI được lưu trong ngữ cảnh evidence hiện có, không cần migration xóa hay tạo lại dữ liệu.
- Khôi phục ảnh, bbox, nhãn đã sửa và câu trả lời sau tải lại trang; không tự gọi AI lại. Endpoint đọc ảnh hỗ trợ file được tạo sau khi Next production khởi động.
- Giao diện chỉ cập nhật xác nhận sau khi server lưu thành công, báo lỗi khi thất bại và thu hồi kết quả đang hiển thị khi suy luận mới không thành công. Demo không ghi detection/câu trả lời giả vào hồ sơ thật.
- Bỏ lần upload nền trùng từng tạo thêm ảnh không có phiên phân tích. Nhãn được người dùng sửa hiển thị đúng trạng thái đã điều chỉnh. Header của trang ảnh không lấy điểm an toàn, số nguy cơ hoặc lux của mô phỏng 3D để hiển thị cho ảnh.
- Prisma dùng `DATABASE_URL` thay cho ghim cứng `dev.db`, cho phép tách SQLite kiểm thử. Không chạy migration làm mất dữ liệu trên database người dùng.

## 2. File chính

- [visionAnswerContract.ts](../src/lib/vision/visionAnswerContract.ts), [clarificationEngine.ts](../src/lib/vision/clarificationEngine.ts), [surveySyncAdapter.ts](../src/lib/vision/surveySyncAdapter.ts), [confirmedRiskAssessment.ts](../src/lib/vision/confirmedRiskAssessment.ts).
- [GeminiProvider.ts](../src/lib/vision/providers/GeminiProvider.ts), [structuredGemini.ts](../src/lib/vision/providers/structuredGemini.ts), [structuredConfig.json](../src/lib/vision/providers/structuredConfig.json), [export_serving_config.py](../scripts/ml/export_serving_config.py).
- [visionPersistence.ts](../src/lib/vision/visionPersistence.ts), [page.tsx](../src/app/ai-vision/page.tsx), các API vision và [schema.prisma](../prisma/schema.prisma).
- [visionState.test.ts](../tests/visionState.test.ts), [structuredGemini.test.ts](../tests/structuredGemini.test.ts), [visionProfile.test.ts](../tests/visionProfile.test.ts), [browser_stage6.cjs](../scripts/ml/browser_stage6.cjs).

## 3. Bằng chứng chạy thật

Các báo cáo JSON là nguồn kết quả hiện hành, không suy ra tỷ lệ chính xác mô hình từ số test phần mềm:

Kết quả cuối: **120 ca Vision đạt, 1 ca live API lịch sử bỏ qua; 33 ca hồi quy khảo sát/luật đạt; 14 kiểm tra trình duyệt đạt; 5 kiểm tra HTTP đạt**. TypeScript và build Next production đạt. Database người dùng có checksum không đổi; 506 file raw khớp ZIP gốc, quyết định duyệt của người dùng và các nguồn fingerprint Giai đoạn 4 giữ nguyên.

| Kiểm tra | Bằng chứng |
| --- | --- |
| Vitest provider/API/profile/SQLite tạm | [vitest.json](../reports/stage6/vitest.json) |
| Hồi quy luật và khảo sát | [risk-regression.json](../reports/stage6/risk-regression.json) |
| HTTP trên Next production | [http-smoke.json](../reports/stage6/http-smoke.json) |
| Chromium + Next + SQLite tạm | [browser.json](../reports/stage6/browser.json) |
| Một request Gemini thật | [gemini-live.json](../reports/stage6/gemini-live.json) |
| Kiểm tra nguồn và raw | [verification.json](../reports/stage6/verification.json) |

Gemini live: một request trên `hallway_0001`, ảnh đã có quyết định giữ của người dùng và không thuộc toàn bộ nhóm nguồn/ảnh gần trùng của test được bảo vệ; schema hợp lệ, 0 object, khoảng 18.9 giây. Không có bbox/risk verified để chấm chất lượng. Đây không phải độ chính xác, recall HIGH hay benchmark độ trễ. Payload nằm trong `data/processed/stage6/`, được gitignore. Kiểm tra lại báo cáo dùng cache, không gọi API thêm.

Browser QA dùng ảnh file thật, Chromium thật, API thật và SQLite tạm riêng; đầu ra detector là fixture có ghi rõ. Không có ONNX thật hoặc phép đo chất lượng model trong bài kiểm thử giao diện. Screenshot nằm trong `data/review/qa_stage6/`, được gitignore.

## 4. Giới hạn còn lại

- Chưa có bbox/risk train/val được con người xác nhận để đánh giá chính thức hay fine-tune. Không tự đổi nhãn AI thành verified.
- Giai đoạn 5 vẫn chưa đủ điều kiện: không có model fine-tune/ONNX hoặc độ trễ local thật. Việc đã có provider local không làm các điều kiện này biến mất.
- Mẫu Wikimedia nhỏ, không đại diện nhà Việt Nam; chưa có HIGH dương tính trong bộ thăm dò để tính recall HIGH.
- Thử Gemini một lần chỉ chứng minh kết nối/schema hoạt động tại thời điểm kiểm tra. Lỗi mạng, quota và biến thiên đầu ra vẫn có thể xảy ra; UI báo lỗi thay vì bịa bố cục.
- Phạm vi hoàn thiện là luồng Vision và đồng bộ khảo sát của nó; không phải kiểm định lâm sàng hoặc chứng nhận toàn bộ sản phẩm.

## 5. Việc cần người kiểm tra

1. Duyệt cảnh và bbox/nhãn thật trong công cụ review; giữ unknown cho thông tin chưa nhìn rõ hoặc chưa đo.
2. Bổ sung trường hợp nguy cơ HIGH và nhà Việt Nam, cùng số đo thực địa cần thiết. Không gộp nhóm nhà/nguồn sang các tập khác nhau hoặc tái sử dụng test đã xem để chỉnh cấu hình.
3. Chạy benchmark chính thức sau khi đủ nhãn, rồi quyết định có cần fine-tune detector hay không. Chỉ xuất/chạy ONNX sau khi đạt cổng dữ liệu và parity Giai đoạn 5.

## 6. Trạng thái kết thúc

Phần sửa phần mềm được kiểm thử theo các bằng chứng trên. Chất lượng mô hình chính thức và fine-tune vẫn phụ thuộc dữ liệu người xác nhận; không được ghi là đã hoàn tất. Không commit hoặc deploy trong phiên này.
