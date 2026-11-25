# B04 — Đường vision thật cho `/workflow`, `assess-item`, scanner

## Đã đổi
| File | Mục đích |
| :--- | :--- |
| `src/app/workflow/page.tsx` | Bước 3: bỏ bbox cứng, "TB 88.2%", detection khởi tạo `confirmed:true`, câu trả lời làm rõ điền sẵn, ảnh Unsplash mặc định. Thay bằng: chọn ảnh, đồng ý, upload + analyze, bbox từ phản hồi, chấp nhận/sửa/loại từng mục (PATCH), câu hỏi làm rõ thật, nút "Bỏ qua AI, dùng checklist". |
| `src/lib/vision/workflowVision.ts` (mới) | Điều phối client (`runWorkflowVision`), `bboxToPercentStyle`, `averageConfidence`, `patchWorkflowDetection`. |
| `src/lib/vision/itemHazardAnalyzer.ts`, `itemHazardTypes.ts`, `api/vision/assess-item/route.ts` | Hết Gemini/lỗi: ném `ItemAssessmentUnavailableError` -> 503 `PROVIDER_UNAVAILABLE`. Preset chỉ còn là DEMO (`demo:true`), không gọi provider. Bỏ nhãn "Clinical Intelligence Engine". |
| `src/components/chat/ItemAssessmentModal.tsx` | Hiện lỗi "Chưa xác định", banner DEMO, DEMO không đẩy vào chat. |
| `src/components/scanner/AiRoomScannerWizard.tsx` | Bỏ "xác nhận tất cả" ngầm; từng mục Chấp nhận/Loại, chỉ mục đã chấp nhận/sửa vào cảnh; nút hàng loạt có nhãn "Chấp nhận tất cả gợi ý đã xem". Ảnh Unsplash chỉ sau tab "Ảnh minh họa (DEMO)" kèm banner; mặc định không ảnh. Đổi từ ngữ theo glossary. |
| `tests/visionEngine.test.ts`, `tests/visionIntegration.test.ts` | Sửa fixture/chuỗi lỗi thời (xem dưới). |
| `tests/workflowVision.test.ts`, `tests/itemHazardAssessment.test.ts` | Test mới; thêm vào `test:vision`. |

Hai test đỏ cũ: PNG fixture chỉ 6 byte, mà A07 yêu cầu chữ ký 8 byte + IHDR hợp lệ (code đúng, fixture sai). Test rationale mong "Người cao tuổi" nhưng RISK-001 canonical (A03) viết "không có lớp lót cao su" (test lỗi thời).

## Hành vi lỗi / đồng ý
| Tình huống | Kết quả |
| :--- | :--- |
| Chưa tick đồng ý | Không gọi mạng; nút phân tích bị khóa; thông báo chưa gửi ảnh. |
| Server từ chối đồng ý (403 / thu hồi) | `no_consent`, provider không được gọi (có test route). |
| Provider 429/500/timeout/chưa cấu hình | 503 -> "Chưa xác định", 0 detection, nút Thử lại + "Bỏ qua AI, dùng checklist"; không lưu gì. |
| Thành công | Mọi detection `PENDING_REVIEW` cho tới khi người dùng thao tác; điểm TB chỉ hiện khi có dữ liệu, nhãn "chưa hiệu chuẩn". |
| assess-item không Gemini | 503 `PROVIDER_UNAVAILABLE`, không có điểm/template. |
| assess-item preset | `demo:true`, banner DEMO, không vào chat. |

## Còn lại
- Bước 4 của `/workflow` chưa nhận detection đã xác nhận (chưa nối `buildVerifiedPhotoDraft`); cảnh 3D vẫn từ store mẫu. 
- Lưu `/workflow` vẫn qua `save-state`, chưa dùng snapshot A11; chưa lưu danh sách detection đã xác nhận vào save-state.
- Hazard 4 trạng thái theo output RISK chưa làm. `ai-vision` vẫn có ảnh `img-demo-*` (MOCK_DEMO) cần banner (chưa kiểm). `analyzeRoomPhotoWithGemini` / `getFallbackRoomDetections` còn là mã chết.
- Header shell hiển thị "Điểm an toàn 28/100" từ store mẫu (ngoài phạm vi).
- Gemini SDK nạp qua `new Function(import)` nên test không mô phỏng được lỗi 429 ở tầng SDK; test chỉ khẳng định kết quả cuối là lỗi.
- Screenshot chỉ có trạng thái sau (không có Gemini key nên là trạng thái lỗi); trạng thái "trước" chỉ dựa trên mã cũ (B01 chưa chụp bước 3).

## Yêu cầu cho A
- `tests/riskIntegration.test.ts:114` (BATHROOM -> BEDROOM) vẫn đỏ, thuộc `src/lib/risk`; B không đụng.
- Xác nhận 503 cho assess-item không đổi shape contract v1 và chấp nhận đổi hành vi (câu hỏi B01 #4).
