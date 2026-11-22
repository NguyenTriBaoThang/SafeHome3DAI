> Cập nhật sau Giai đoạn 6 (22/11/2026): đã hoàn thiện luồng xác nhận/thu hồi/đồng bộ nguyên tử, port Gemini structured, lưu và khôi phục ảnh/nhãn/nguồn suy luận. Xem [ML_COMPLETION.md](ML_COMPLETION.md) và [README](../README.md). Đánh giá ML chính thức và ONNX vẫn chưa đủ dữ liệu người xác nhận; không được coi là đã hoàn tất.
>
> Giai đoạn 5: đã chuẩn bị pipeline/notebook fine-tune detector, nhưng chưa đủ dữ liệu verified để huấn luyện. Xem [ML_STAGE5.md](ML_STAGE5.md), [báo cáo thiếu nhãn](../reports/stage5/readiness.md) và [Giai đoạn 4 thăm dò với nhãn AI](ML_STAGE4.md). Phần dưới là ảnh chụp hiện trạng Giai đoạn 0, giữ để truy vết lịch sử.

# Hiện trạng ML — Giai đoạn 0

Ngày khảo sát: 22/11/2026 (Asia/Saigon). Commit nguồn: `b82195381a962dddb90a62415e16dee7658cacb6`.

## 1. Đã làm gì

Đọc mã nguồn vision, risk, các API liên quan, Prisma, package lock và các test/tài liệu hiện có. Chỉ tạo báo cáo này; chưa sửa mã chạy, luật rủi ro, README hay `.gitignore`. Chưa giải nén ZIP, gọi API, tải model, suy luận, chia tập, train hoặc đánh giá dữ liệu.

**Kết luận:** repo có luồng phân tích ảnh và hỏi người dùng xác nhận, nhưng chưa có pipeline dữ liệu/benchmark đáp ứng yêu cầu. Taxonomy thực tế có **16 lớp**, không phải 18. Chất lượng phát hiện vật thể và nguy cơ trên bộ ảnh đính kèm: **chưa đánh giá được**.

### 1.1. Các điểm gọi Gemini cho vision

#### A. Phân tích toàn cảnh phòng

- Hàm [`analyzeRoomPhotoWithGemini`](../src/lib/vision/geminiVisionAdapter.ts#L106), gọi REST `v1beta/models/{model}:generateContent` bằng `fetch`, **không dùng SDK** ở nhánh này.
- Model lấy từ `GEMINI_MODEL`, mặc định chuỗi `gemini-3.5-flash-lite`; chỉ thử một model, timeout 3.500 ms. Đây là cấu hình trong code, chưa kiểm chứng model có khả dụng trên tài khoản hay không.
- Prompt nằm trực tiếp trong [`geminiVisionAdapter.ts`](../src/lib/vision/geminiVisionAdapter.ts#L125): vai trò chuyên gia nội thất/an toàn té ngã, nhận diện nội thất và vật cản để dựng Digital Twin; yêu cầu tên Việt, bbox, confidence, vị trí tường, loại mô hình 3D và ghi chú nguy cơ.
- Request có `responseMimeType: "application/json"`; **chưa có `responseSchema`/JSON Schema**, chưa đặt temperature hoặc seed. TypeScript interface mô tả kết quả nhưng không xác thực payload lúc chạy.
- Cấu trúc mong đợi trong code/prompt:

```ts
{
  roomType?: "BEDROOM" | "BATHROOM" | "LIVING_ROOM";
  floorMaterial?: "WOOD" | "CERAMIC_TILE" | "NON_SLIP_VINYL";
  lighting?: "BRIGHT" | "ADEQUATE" | "DIM";
  detections: Array<{
    category: string;
    labelVi: string;
    sceneModelType?: string;
    placementWall?: "left" | "right" | "back" | "free";
    box_2d: [number, number, number, number]; // ymin, xmin, ymax, xmax
    confidence?: number;
    isFallHazard?: boolean;
    hazardNote?: string;
  }>;
}
```

`box_2d` được yêu cầu ở thang 0..1000; parser chấp nhận thêm thang 0..1, đảo thứ tự min/max và clamp. Parser cũng nhận mảng `objects`/`furniture` thay `detections`, hoặc `bbox`/`box` thay `box_2d`. Chưa kiểm tra đầy đủ số hữu hạn, kiểu dữ liệu và enum. Confidence bị ép vào `[0.5, 0.99]`, mặc định `0.9`, vì vậy không thể xem là xác suất đã hiệu chuẩn. `lighting` có trong phản hồi thô nhưng không được trả ra `GeminiAnalysisResult`.

Prompt hiện liệt kê **15 category**, bỏ `door`, trong khi tập hợp lệ và domain type có 16. Chưa có output riêng cho từng `RISK-001..008`, chưa có `present: true | false | unknown`, `visible`, `severity`, `evidence` theo từng nguy cơ. Các observation được tạo từ category/`isFallHazard`, thường mang `PENDING_REVIEW` và yêu cầu xác nhận.

Hai đường vào chính:

1. [`POST /api/vision/images/[imageId]/analyze`](../src/app/api/vision/images/[imageId]/analyze/route.ts#L7) → [`runVisionAnalysis`](../src/lib/vision/visionProvider.ts#L342) → Gemini khi có key và dữ liệu ảnh. Route lấy base64 từ request hoặc ảnh lưu trên đĩa, rồi lưu analysis/detection/observation/clarification qua Prisma.
2. [`POST /api/vision/scan-photo`](../src/app/api/vision/scan-photo/route.ts#L94) → Gemini → OWL-ViT → bố cục dự phòng. Hai đường vào có cơ chế fallback khác nhau; không nên coi chúng là một cấu hình benchmark duy nhất.

#### B. Thẩm định một vật dụng và hotspot

- [`analyzeItemHazardFromImage`](../src/lib/vision/itemHazardAnalyzer.ts#L469), dùng dynamic import `@google/genai`, `new GoogleGenAI({ apiKey })`, `ai.models.generateContent` với text + `inlineData` ảnh.
- Thử lần lượt chuỗi model `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.5-flash`; danh sách hard-code, không đọc `GEMINI_MODEL` tại đây. Chưa kiểm chứng tính khả dụng qua API.
- Prompt tại dòng 488 yêu cầu điểm nguy cơ 0..100, mức độ/khẩn cấp, giải thích cơ chế, ít nhất 2–4 hotspot và biện pháp/chi phí; đưa ví dụ JSON trong prompt.
- Chưa đặt JSON response schema, response MIME, temperature hoặc seed trong lời gọi SDK. Kết quả bỏ markdown fences, `JSON.parse`, gán mặc định nhiều trường; thiếu điểm số được thay bằng `80`, severity mặc định `HIGH`.
- Điểm vào là [`POST /api/vision/assess-item`](../src/app/api/vision/assess-item/route.ts#L6), nhận multipart hoặc JSON. Preset có thể dùng buffer giả thay ảnh thật.
- Fallback dùng tên tệp/`itemHint` chọn một trong 5 mẫu `rug`, `electrical_cable`, `chair`, `threshold_step`, `table`; mặc định `rug`. Điểm số, hotspot, giải thích và trích dẫn của mẫu không được suy ra từ pixel ảnh.

Các lời gọi Gemini trong [`src/lib/ai/copilotAgent.ts`](../src/lib/ai/copilotAgent.ts#L100) phục vụ chat/tool calling với phần nội dung text; không phải một detector ảnh bổ sung trong phạm vi đã khảo sát.

### 1.2. Taxonomy thực tế

[`DetectionCategory`](../src/lib/vision/types.ts#L13) và [`CATEGORY_TAXONOMY`](../src/lib/vision/taxonomy.ts#L13) khớp nhau, gồm 16 lớp:

| ID | Tên Việt trong taxonomy |
|---|---|
| `bed` | Giường ngủ |
| `chair` | Ghế ngồi / Ghế đẩu |
| `table` | Bàn / Bàn trà |
| `cabinet` | Tủ quần áo / Tủ đồ |
| `nightstand` | Tab đầu giường |
| `door` | Cửa ra vào / Cửa phòng |
| `toilet` | Bồn cầu vệ sinh |
| `sink` | Chậu rửa mặt / Lavabo |
| `bathtub` | Bồn tắm / Sen tắm |
| `sofa` | Ghế Sofa |
| `rug` | Thảm trải sàn |
| `electrical_cable` | Dây điện / Dây sạc |
| `grab_bar` | Thanh tay vịn an toàn |
| `obstacle_route` | Vật cản lối đi |
| `threshold_step` | Gờ bậc cửa |
| `other` | Vật thể khác |

Taxonomy có mô tả, màu/icon, cờ `isStandardCocoClass` và `requiresSpecializedReview`. Các cờ này là metadata của repo, chưa xác minh lại với taxonomy COCO. `normalizePredictedLabel` ánh xạ nhãn tự do; Gemini có hàm `normalizeCategory` riêng, nên hai bộ ánh xạ có thể lệch nhau. Ví dụ nhãn Việt chứa “ghế” được xét trước “sofa” ở một số đường chuẩn hóa.

Các tên `coffee_table`, `wardrobe`, `shower`, `wall_art`, v.v. có thể là `sceneModelType` hoặc prompt detector, không phải lớp taxonomy độc lập. README ghi 18 lớp nhưng chưa có định nghĩa hai lớp bổ sung trong domain type. Không tự thêm hoặc đoán hai lớp còn thiếu.

### 1.3. Bbox, hotspot và lưu trữ

| Kiểu | Quy ước hiện tại | Nguồn |
|---|---|---|
| `NormalizedBoundingBox` | `{xMin, yMin, xMax, yMax}`, mỗi tọa độ 0..1 | [`types.ts`](../src/lib/vision/types.ts#L58) |
| `VisionDetection` | category, bbox, confidence, source, verificationStatus, ID ảnh/analysis; có `sceneModelType`, `placementWall` tùy chọn | [`types.ts`](../src/lib/vision/types.ts#L65) |
| `VisionObservation` | loại quan sát, description, detection IDs, evidenceJson, uncertaintyType, requiresConfirmation, verificationStatus | [`types.ts`](../src/lib/vision/types.ts#L83) |
| `ItemDangerHotspot` | điểm `{x,y}` theo **phần trăm 0..100**, title/description/mechanism, severity `CRITICAL/HIGH/MEDIUM/LOW`; không phải bbox | [`itemHazardTypes.ts`](../src/lib/vision/itemHazardTypes.ts#L3) |
| `RuleEvidence.coordinates` | `[x,y,z]` trong không gian 3D; không phải tọa độ ảnh | [`risk/types.ts`](../src/lib/risk/types.ts#L149) |
| Prisma `ObjectDetection.bboxJson` | JSON string; route hiện serialize object bbox, dù comment schema ghi dạng array | [`schema.prisma`](../prisma/schema.prisma#L359) |

[`pixelToNormalizedBox` và `normalizedToPixelBox`](../src/lib/vision/imagePreprocessor.ts#L117) chuyển đổi bbox pixel/chuẩn hóa. [`ItemHazardCard`](../src/components/chat/ItemHazardCard.tsx#L160) hiển thị hotspot bằng CSS `left/top` theo `%`. Không dùng thẳng hotspot 0..100 làm bbox 0..1 hoặc tọa độ 3D.

Prisma có `RoomImage`, `VisionAnalysis`, `ObjectDetection`, `VisionObservation`, `VisionClarification`, `VisionRoomFact`, `VisionAuditEvent`. Trạng thái xác nhận detection gồm `PENDING_REVIEW`, `CONFIRMED`, `CORRECTED`, `REJECTED`; đây không phải `human_scene_verified` hay trạng thái nhãn benchmark. Schema chưa có split/group/hash/license/review_status theo yêu cầu dataset.

Route analyze chưa lưu `sceneModelType`, `placementWall`, `relatedDetectionIds`, `evidenceJson` của kết quả phân tích; có nguy cơ mất provenance khi đọc lại dữ liệu đã lưu.

### 1.4. Provider và các adapter đang có

| Thành phần | Hành vi hiện tại |
|---|---|
| [`visionProvider.ts`](../src/lib/vision/visionProvider.ts#L342) | Hàm `runVisionAnalysis` với `VisionProviderOptions`; manual mode → external endpoint (`apiUrl`/`VISION_SERVICE_URL`, cần base64) → Gemini → fallback. Chưa có interface `VisionProvider` với class `GeminiProvider`/`LocalDetectorProvider`. |
| [`geminiVisionAdapter.ts`](../src/lib/vision/geminiVisionAdapter.ts#L106) | Parse kết quả VLM thành `VisionDetection`/`VisionObservation`; có generator bố cục fallback. |
| [`clarificationEngine.ts`](../src/lib/vision/clarificationEngine.ts#L7) | `mapClarificationToRoomFacts`, `saveClarificationAnswer`: chuyển câu trả lời thành fact và lưu audit; nhiều câu trả lời UNKNOWN không sinh fact. |
| [`surveySyncAdapter.ts`](../src/lib/vision/surveySyncAdapter.ts#L10) | `syncConfirmedVisionFactsToSurvey` chỉ đọc fact `CONFIRMED`, đồng bộ câu trả lời, dựng lại RoomProfile; `triggerRiskAssessmentFromVision` gọi engine luật. |
| [`sceneDraftAdapter.ts`](../src/lib/vision/sceneDraftAdapter.ts#L9) | Dựng scene ước lượng từ bbox, thực tế nhận cả `CONFIRMED` và `PENDING_REVIEW`; có placeholder khi trống. Tọa độ và kích thước gắn `isEstimate: true`. |
| [`visionAssetMapper.ts`](../src/lib/vision/visionAssetMapper.ts#L26) | `mapVisionCategoryToAsset`, `convertVisionDetectionsTo3DObjects`: ánh xạ category/asset và bbox sang vị trí/kích thước 3D bằng heuristic. |
| [`risk/inputAdapter.ts`](../src/lib/risk/inputAdapter.ts#L8) | Chuẩn hóa RoomProfile, RoomState hoặc object tối thiểu thành AssessmentInput; nhiều giá trị được mặc định thay vì giữ unknown. |
| [`imagePreprocessor.ts`](../src/lib/vision/imagePreprocessor.ts#L24), [`imageStorage.ts`](../src/lib/vision/imageStorage.ts), [`videoProcessor.ts`](../src/lib/vision/videoProcessor.ts#L16) | Tiện ích kiểm tra buffer/chuyển bbox/EXIF, lưu ảnh và trích keyframe video. Không phải công cụ audit, duyệt hay gán nhãn dataset. |

### 1.5. Tám luật RISK-001..008

Registry thực tế là [`ALL_VERSIONED_RULES`](../src/lib/risk/riskRuleRegistry.ts#L1258), không có symbol `RISK_RULE_REGISTRY` tại tệp này. Tất cả tám rule hiện có version `1.0.0`, mỗi rule có `evaluate(input)` và `getRuleById` để tra cứu. [`evaluateRoomHazards`](../src/lib/risk/ruleEngine.ts#L15) chuẩn hóa input rồi chạy cả tám rule.

**Bảng sau mô tả logic trong code, không xác nhận các ngưỡng là tiêu chuẩn y khoa đã được thẩm định. Không thay đổi ngưỡng trong giai đoạn này.**

| Rule / hàm evaluate | Phòng khai báo áp dụng | Điều kiện chính và mức ưu tiên thực tế |
|---|---|---|
| [`RISK-001 / ruleRisk001.evaluate`](../src/lib/risk/riskRuleRegistry.ts#L25) | Bedroom, living room, hallway | Thảm chưa cố định hoặc quăn mép; HIGH nếu trên lối đi, còn lại MEDIUM. `rugs.present === null` → NEEDS_VERIFICATION. Có thảm nhưng items rỗng hiện đi vào NOT_DETECTED. |
| [`RISK-002 / ruleRisk002.evaluate`](../src/lib/risk/riskRuleRegistry.ts#L218) | Bedroom, living room, hallway, kitchen | `cables.crossingWalkway === null` → cần xác minh; dây cắt lối đi → HIGH. Kiểm tra từng dây có cover/nẹp, nhưng cờ crossingWalkway=true vẫn đủ kích hoạt. |
| [`RISK-003 / ruleRisk003.evaluate`](../src/lib/risk/riskRuleRegistry.ts#L377) | Cả 5 loại phòng | Có vật cản hoặc thông thủy <0.85 m; HIGH nếu <0.70 m, còn lại MEDIUM. Thiếu cả hiện diện (null) và chiều rộng (undefined) mới vào nhánh xác minh. |
| [`RISK-004 / ruleRisk004.evaluate`](../src/lib/risk/riskRuleRegistry.ts#L520) | Bedroom, bathroom, hallway, living room | Ngưỡng lux khi di chuyển: bedroom 60, phòng khác 100; xét thiếu đèn ngủ và tuyến tới WC. Khi kích hoạt, HIGH nếu lux <40 hoặc thiếu path light, còn lại MEDIUM. |
| [`RISK-005 / ruleRisk005.evaluate`](../src/lib/risk/riskRuleRegistry.ts#L661) | Bathroom | `(isWet && !isSlipResistant) || (!hasNonSlipMat && !isSlipResistant)` → HIGH; không chỉ phụ thuộc việc sàn đang ướt. Evidence nhắc DCOF 0.42 nhưng code không đo DCOF. |
| [`RISK-006 / ruleRisk006.evaluate`](../src/lib/risk/riskRuleRegistry.ts#L813) | Bathroom | Thiếu đủ 2 vị trí tay vịn tại bồn cầu/chỗ tắm → phát hiện; count=0 là HIGH, thiếu một phần là MEDIUM. Độ chịu lực không suy ra từ số thanh. |
| [`RISK-007 / ruleRisk007.evaluate`](../src/lib/risk/riskRuleRegistry.ts#L969) | Bathroom, bedroom, hallway | `(diffCm >1.5 || thresholdStepPresent) && !hasThresholdRamp`; HIGH khi diffCm >=3.5, còn lại MEDIUM. |
| [`RISK-008 / ruleRisk008.evaluate`](../src/lib/risk/riskRuleRegistry.ts#L1105) | Bedroom, living room | Không với tới công tắc hoặc đồ thiết yếu → MEDIUM. Code dùng boolean; các khoảng 50–60 cm trong evidence không được đo từ ảnh. |

Output rule có bốn trạng thái `DETECTED`, `NOT_DETECTED`, `NEEDS_VERIFICATION`, `NOT_APPLICABLE`; priority có `UNKNOWN`. Không được tự ánh xạ `NOT_APPLICABLE` hoặc thiếu nhãn thành nhãn âm. Chưa có hợp đồng nhãn dataset `1 / 0 / unknown` gắn người duyệt.

Còn một engine riêng trong [`src/features/risk-engine/rules.ts`](../src/features/risk-engine/rules.ts#L78), dùng bởi simulation store, scanner và một số API. Engine đó có tám `RULE_*`: `ruleLooseRug`, `ruleCableCrossing`, `rulePoorLighting`, `ruleWetFloor`, `ruleMissingGrabBars`, `ruleObstacleRoute`, `ruleClutteredPath`, `ruleDangerousObject`. Hai rule cuối không tương đương trực tiếp RISK-007/008. Benchmark RISK-001..008 cần chỉ định engine và đường dữ liệu rõ ràng.

### 1.6. Transformers.js và detector cục bộ

Điểm dùng `@huggingface/transformers` được tìm thấy trong [`runLocalOwlVitFallback`](../src/app/api/vision/scan-photo/route.ts#L15):

```ts
pipeline("zero-shot-object-detection", "Xenova/owlvit-base-patch32", {
  dtype: "q8",
  cache_dir: ".next/cache/room-vision",
  session_options: { intraOpNumThreads: 4 }
})
// detector: percentage=true, threshold=0.15, top_k=80
```

Đây là **OWL-ViT**, chưa phải OWLv2, RT-DETR hoặc D-FINE. Bbox được clamp 0..1; loại bbox suy biến; loại phát hiện trùng cùng category/sceneModelType bằng IoU >0.45, theo thứ tự kết quả. Pipeline được tạo trong mỗi lần gọi hàm; chưa thấy quản lý singleton ở module này.

Danh sách [`furniture`](../src/lib/vision/scannerFurniture.ts#L3) có 24 prompt, ánh xạ về 11 category khác nhau. Không có prompt trực tiếp cho **door, electrical_cable, grab_bar, obstacle_route, threshold_step**. Vì vậy fallback hiện tại chưa phủ đầy đủ các lớp trọng yếu cho nguy cơ HIGH.

Giấy phép hiện có trong [`LICENSE`](../LICENSE) là MIT. Metadata `license` của **package-lock.json**, không phải kiểm toán toàn bộ dependency/model: Next.js 14.2.5 — MIT; `@google/genai` 3.4.0, `@huggingface/transformers` 3.8.1, `@prisma/client` 5.22.0 — Apache-2.0. Giấy phép trọng số `Xenova/owlvit-base-patch32`, model gốc và điều khoản dịch vụ Gemini chưa được xác minh ở bước chỉ đọc repo này. Không suy giấy phép model từ giấy phép thư viện. Giai đoạn 0 không đề xuất hoặc cài thêm model/thư viện; trước khi chọn hay tải model ở các giai đoạn sau cần kiểm tra nguồn chính thức và ghi revision/giấy phép cụ thể.

## 2. File đã tạo/sửa

- Tạo duy nhất `docs/ML_STATE.md`.
- Không sửa `src/`, Prisma, tests, package files, `.gitignore`, license/attribution hoặc dữ liệu gốc.

## 3. Kết quả số liệu thật và giới hạn kiểm chứng

Đã chạy Node để đọc file nguồn và đếm cấu trúc bằng regex, đọc metadata package lock; kết quả in ra console trong phiên làm việc. Đây là thống kê mã nguồn, **không phải metric chất lượng ML**:

```json
{
  "taxonomy_count": 16,
  "union_count": 16,
  "taxonomy_union_match": true,
  "rule_count": 8,
  "scanner_prompt_count": 24,
  "scanner_distinct_category_count": 11,
  "scanner_missing_taxonomy": [
    "door", "electrical_cable", "grab_bar", "obstacle_route", "threshold_step"
  ],
  "ml_directory_exists": false,
  "raw_directory_exists": false,
  "models_directory_exists": false
}
```

ZIP tồn tại tại `C:\Users\ThangNTB\Desktop\SafeHome3DAI_500_images.zip`, kích thước đọc từ filesystem **127.809.390 byte**. Chưa mở nội dung hoặc kiểm đếm ảnh trong ZIP. Các con số 500 ảnh, 175/175/150 theo phòng, 4.000 hàng nhãn và trạng thái unlabeled là thông tin người dùng cung cấp, chưa được kiểm tra độc lập. Không có kết luận về số ảnh hợp lệ, số nhãn verified hay tỷ lệ loại bỏ ở bước này.

**mAP@0.5, precision, recall, F1 và bootstrap CI: chưa đánh giá được.** Chưa có nhãn người xác nhận được kiểm chứng trong giai đoạn này; không chạy benchmark trên ảnh chưa duyệt.

Repo có test bbox/taxonomy/clarification/provider trong `tests/visionEngine.test.ts`, luồng vision → survey → risk trong `tests/visionIntegration.test.ts`, luật versioned trong `tests/riskIntelligence.test.ts`, cùng `tests/riskIntegration.test.ts`. `tests/riskEngine.test.ts` chủ yếu kiểm engine `RULE_*`. Test item dùng buffer giả; test live Gemini có thể trả về sớm khi thiếu ảnh/key và có thể nhận fallback. Những test đó không chứng minh chất lượng detection/risk trên ảnh có ground truth.

Không chạy Vitest trong bước chỉ đọc: thay đổi duy nhất là tài liệu; ngoài ra `tests/globalSetup.ts` hiện gọi Prisma db push với `--accept-data-loss`. Không báo lại số test cũ trong README như kết quả mới. Các mục tiêu mAP/recall và mô tả benchmark 200 ảnh trong `docs/VISION_EVALUATION.md` chưa có bằng chứng dữ liệu/log tái lập được tìm thấy trong phạm vi khảo sát, nên không coi là kết quả thực nghiệm đã xác nhận.

## 4. Rủi ro, giả định và phần còn thiếu

### Sai lệch có thể ảnh hưởng baseline

1. **Fallback không phân tích ảnh nhưng có thể mang nhãn nguồn AI.** `getFallbackRoomDetections` tạo bố cục cố định với `source: OBJECT_DETECTOR`, `modelUsed: intelligent-local-vision-engine`. Khi adapter này trả bbox dự phòng, route scan-photo vẫn có thể trả `engine: GEMINI_VLM` và không chạy OWL-ViT. Không chỉ lọc bằng trường source/engine hiện tại là đủ để xác nhận suy luận thật.
2. **Provider có dữ liệu mẫu phụ thuộc caption/hash base64.** Sau khi Gemini thất bại, `runVisionAnalysis` dùng caption cho một số nhánh, hoặc hash chuỗi base64 để chọn profile bedroom `seed % 3`. Đó không phải kết quả thị giác. Nhiều detection có source MOCK_DEMO, nhưng một số nhánh caption dùng OBJECT_DETECTOR.
3. **Unknown chưa được giữ xuyên suốt.** `risk/inputAdapter.ts` mặc định lux đêm 120 hoặc 40, chiều rộng 1.1/0.7/0.9 m, độ chênh sàn và boolean hiện diện/khả năng với. Object tối thiểu thiếu thảm/dây thường thành false. Các default có thể tạo cả âm tính lẫn dương tính không có bằng chứng; không được tái dùng làm ground truth.
4. **Fact CONFIRMED vẫn có thể chứa null.** Ví dụ trả lời không có thảm tạo `rugs.secured = null`; survey sync chuyển `answerValue === true ? ... : ...`, có thể biến null thành câu trả lời cụ thể. Trạng thái xác nhận không thay thế kiểm tra giá trị.
5. **Thiếu dữ liệu một phần có thể bị coi là đủ.** Các guard trong RISK-004/006/007/008 thường chỉ bắt khi thiếu đồng thời nhiều trường; các toán tử phủ định sau đó có thể xử lý undefined như false. RISK-003 còn có giá trị chiều rộng dự phòng. Cần kiểm tra unknown khi triển khai pipeline, không tự sửa luật/ngưỡng ở Giai đoạn 0.
6. **Giới hạn ảnh đơn.** Không đo lux ban đêm, ma sát/DCOF, độ chắc thanh vịn, chiều cao gờ hoặc thông thủy theo mét từ một ảnh chưa hiệu chuẩn. Hiện prompt có thể yêu cầu suy ra chống trượt và tối thiểu số hotspot dù không đủ bằng chứng. Các điểm số 0..100 hiện là heuristic hoặc output VLM, chưa có hiệu chuẩn thực nghiệm.
7. **Phạm vi phòng chưa khớp.** Types/prompt Gemini chỉ có bedroom/bathroom/living room, không có hallway; rule engine có hallway. Không tự đổi nhãn ảnh hallway thành bedroom.
8. **Nguồn ngưỡng và lời khẳng định cần đối chiếu riêng.** Ví dụ ghi chú về lối đi trong Gemini nói 80 cm, còn RISK-003 dùng 85 cm; chuỗi evidence về lux có các ngữ cảnh 30–50 và 60–100. Đây là chỗ cần rà soát ngữ cảnh/nguồn, chưa kết luận giá trị nào đúng và chưa chỉnh số. Trích dẫn hard-code hoặc do model sinh trong item analyzer chưa phải bằng chứng đã xác minh.

### Các hạng mục chưa có cho pipeline yêu cầu

| Hạng mục | Hiện trạng / giai đoạn dự kiến |
|---|---|
| Bảo vệ dữ liệu local | `.gitignore` đã bỏ `.env` và uploads, **chưa bỏ `data/`, `models/`**. Cần bổ sung trước khi giải nén ở Giai đoạn 1. Không commit ảnh/key/.env. |
| Audit và bản gốc | Chưa có `scripts/ml/audit_dataset.py`, `reports/audit.md`, generator `ATTRIBUTION.md`, checksum/near-duplicate audit, chính sách license cuối cùng — Giai đoạn 1. |
| Duyệt cảnh | Chưa có UI Giữ/Loại/Cần thay gắn manifest, lịch sử người duyệt và danh sách thiếu ảnh theo phòng — Giai đoạn 1. Không dùng xác nhận detection trong app thay duyệt cảnh. |
| Chia tập có kiểm soát | Chưa có group bằng dhash/source_page/author, split 70/15/15, kiểm rò rỉ hoặc freeze test — Giai đoạn 2. |
| Hợp đồng nhãn | Chưa có nhãn risk 1/0/unknown, visible/evidence từng rule, provenance prelabel/verified hoặc mapping đủ 18 lớp được thống nhất — Giai đoạn 2. Unlabeled/ô trống phải giữ unknown. |
| Công cụ annotation | Chưa có export COCO, cấu hình CVAT/Label Studio và `ANNOTATION_GUIDE.md` theo bộ dữ liệu này — Giai đoạn 2. |
| Đánh giá tái lập | Chưa có `scripts/ml/eval_baseline.py`, metric theo lớp/rule, bootstrap, cảnh báo <20 mẫu dương, bộ ví dụ sai và log cấu hình — Giai đoạn 3 sau khi có verified. |
| Thử nghiệm và train | Chưa có quản lý thí nghiệm val, khóa test, ngưỡng quyết định fine-tune và notebook/ONNX/đo trễ đáp ứng yêu cầu — Giai đoạn 4–5, có điều kiện. |
| Tích hợp và công bố | Chưa có provider interface được yêu cầu, bảo toàn unknown end-to-end và README phản ánh benchmark thật; README vẫn có tuyên bố “18 lớp”/“100%” — Giai đoạn 6. |

“Chưa có” ở đây áp dụng cho file/luồng phù hợp yêu cầu được tìm trong repo hiện tại; không khẳng định người dùng không có dữ liệu hoặc công cụ bên ngoài repo.

## 5. Việc người dùng cần làm thủ công

- Chưa cần gán nhãn hoặc duyệt từng ảnh tại Giai đoạn 0. Sau khi có công cụ Giai đoạn 1, người dùng quyết định Giữ/Loại/Cần thay; đề xuất tự động không phải xác nhận của con người.
- Cần thống nhất hai lớp bổ sung nếu vẫn yêu cầu 18 lớp; việc này phải xong trước tiền gán nhãn Giai đoạn 2. Không cần chặn việc audit/duyệt cảnh ở Giai đoạn 1.
- Sau này cần kiểm tra trực tiếp các thuộc tính không quan sát được từ ảnh; nếu không có bằng chứng thì nhãn tương ứng là unknown.

## 6. Quyết định cần người dùng xác nhận

1. Xác nhận hoàn tất Giai đoạn 0 và cho chuyển sang Giai đoạn 1. Bước kế tiếp: bổ sung ignore `data/`, `models/` trước khi giải nén, giữ manifest gốc bất biến làm bản tham chiếu, tạo công cụ audit và duyệt cảnh. Chưa tự triển khai các bước này.
2. Trước Giai đoạn 2: giữ taxonomy 16 lớp hiện tại hay mở rộng thành 18? Nếu mở rộng, cần tên/định nghĩa hai lớp mới; chưa có căn cứ để tự chọn.
3. Ở Giai đoạn 1, cách dung hòa “giữ nguyên manifest.csv” và “ghi kết quả duyệt vào manifest” dự kiến là giữ nguyên bản raw, lưu lịch sử/working manifest riêng. Cần chốt khi triển khai công cụ duyệt để không ghi đè nguồn.

**Dừng tại Giai đoạn 0 theo yêu cầu.**
