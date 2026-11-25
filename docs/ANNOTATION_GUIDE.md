# Hướng dẫn gán nhãn ảnh — 18 lớp và 8 nguy cơ

> **Ảnh thật có consent (bộ kiểm thử khóa B02/B03):** dùng `docs/collaboration/B03_ANNOTATION_GUIDELINE.md` (4 trạng thái present/absent/uncertain/not_assessable, hai người gán độc lập). Tài liệu dưới đây áp dụng cho tập ảnh công khai qua Label Studio.

## Điều kiện và trạng thái

Chỉ gán nhãn ảnh đã được người dùng Giữ, đủ metadata giấy phép và có checksum đúng trong snapshot chia tập đóng băng. Không dùng ảnh pending/reject/replace. Không chỉnh tập test sau khi đóng băng.

Tiền gán của Gemini luôn có review_status=prelabeled, nằm trong predictions của Label Studio. Không phải verified dù confidence cao. Người duyệt phải xem ảnh, kiểm/sửa mọi bbox và cả tám nguy cơ, ghi tên và xác nhận thủ công trước khi submit. Bản export Label Studio còn phải được kiểm tra xác nhận này trước khi dùng làm verified; không tự đổi human_risk_verified trong manifest raw.

Test cần người gán nhãn độc lập, ưu tiên gán mù không xem tiền gán để tránh thiên lệch từ cùng Gemini sẽ được benchmark. Không dùng test để chỉnh prompt, lớp hoặc hyperparameter. Mặc định tiền gán chỉ chạy train/val.

## Quy tắc bbox

Vẽ khít phần vật thể nhìn thấy. Không đoán phần bị che hoặc vật ở ngoài khung. Một vật thể một nhãn đúng nhất; không gán cùng một bbox cho cả chair và obstacle_route chỉ vì có ghế. obstacle_route dùng cho vùng/đồ chắn lối chưa có lớp vật thể phù hợp, mô tả quan hệ với tuyến đi trong evidence.

JSON nội bộ dùng xMin/yMin/xMax/yMax ở 0..1. COCO dùng x/y/width/height theo pixel; Label Studio dùng phần trăm 0..100. Không đảo hai quy ước. Không có bbox không chứng minh cả phòng không có vật.

## Định nghĩa 18 lớp

| ID | Tên | Định nghĩa |
| --- | --- | --- |
| `bed` | Giường ngủ | Khu vực nghỉ ngơi chính, tâm điểm đánh giá tiếp cận ban đêm |
| `chair` | Ghế ngồi / Ghế đẩu | Ghế sinh hoạt; nếu nằm trên luồng di chuyển có thể là vật cản |
| `table` | Bàn / Bàn trà | Bàn sinh hoạt hoặc bàn trà cạnh giường có góc nhọn |
| `cabinet` | Tủ quần áo / Tủ đồ | Tủ lưu trữ đồ đạc lớn |
| `nightstand` | Tab đầu giường | Tủ tab cạnh giường chứa đèn ngủ và vật dụng thiết yếu |
| `door` | Cửa ra vào / Cửa phòng | Vị trí giao cắt và bắt đầu tuyến di chuyển chính |
| `toilet` | Bồn cầu vệ sinh | Khu vực trọng yếu cần thanh tay vịn trợ lực đứng - ngồi |
| `sink` | Chậu rửa mặt / Lavabo | Khu vực vệ sinh cá nhân, bề mặt sứ dễ gây chấn thương nếu va đập |
| `bathtub` | Bồn tắm / Sen tắm | Vùng ẩm ướt trơn trượt có nguy cơ té ngã gãy xương cao nhất |
| `sofa` | Ghế Sofa | Nội thất phòng khách |
| `rug` | Thảm trải sàn | Thảm trang trí hoặc thảm lau chân có nguy cơ trượt xô lệch (RISK-001) |
| `electrical_cable` | Dây điện / Dây sạc | Dây dẫn nguồn vắt ngang mặt sàn tạo bẫy vấp ngón chân (RISK-002) |
| `grab_bar` | Thanh tay vịn an toàn | Thiết bị trợ lực chống ngã gắn tường nhà vệ sinh (RISK-006) |
| `obstacle_route` | Vật cản lối đi | Đồ đạc làm hẹp hành lang thông thủy dưới 0.85m (RISK-003) |
| `threshold_step` | Gờ bậc cửa | Độ chênh cốt nền tại lối ra vào nhà tắm hoặc phòng (RISK-007) |
| `lamp` | Đèn chiếu sáng | Bộ đèn bàn, đèn ngủ, đèn đứng, đèn tường hoặc đèn trần nhìn thấy được; không gồm cửa sổ hay phản chiếu. Không suy ra lux hoặc tình trạng chiếu sáng ban đêm từ sự hiện diện của đèn (RISK-004). |
| `light_switch` | Công tắc đèn | Mặt công tắc điều khiển đèn gắn tường nhìn thấy rõ; không gồm ổ cắm, phích cắm, aptomat hoặc điều khiển từ xa. Không suy ra khả năng với tới từ giường khi thiếu đo đạc hoặc xác nhận (RISK-008). |
| `other` | Vật thể khác | Đồ dùng hoặc vật dụng gia đình khác |

Phân biệt: nightstand là tab cạnh giường; cabinet là tủ lưu trữ lớn, table là bàn. bathtub gồm bồn tắm/khu sen tắm. grab_bar là thanh trợ lực, không phải thanh treo khăn. lamp là bộ đèn nhìn thấy, light_switch chỉ mặt công tắc đèn gắn tường; ổ cắm điện thuộc other. Đèn đặt trên tab: vẽ hai bbox tách biệt khi thấy rõ, không gộp đèn vào nightstand. Sự hiện diện lamp/light_switch không chứng minh RISK-004/008.

## Nhãn nguy cơ: 1 / 0 / unknown

- 1 (Có): bằng chứng đủ để khẳng định điều kiện nguy cơ trong vùng quan sát, ghi rõ vị trí/cơ chế. Ưu tiên phát hiện dấu hiệu HIGH, nhưng không đoán thuộc tính vô hình.
- 0 (Không): có bằng chứng đủ loại trừ điều kiện nguy cơ trong phạm vi đánh giá. Không dùng ô trống/unlabeled, không nhìn thấy hoặc thiếu đo đạc làm 0.
- unknown (Chưa rõ): ảnh bị che/thiếu góc nhìn, chưa kiểm tra điều kiện hoặc chưa đo/khảo sát. Ghi lý do cần bổ sung.
- Không áp dụng: lưu applicable=false và present=unknown; không tính là nhãn âm khi đánh giá. UNKNOWN về severity cũng không phải LOW.

visible nói về khả năng quan sát dấu hiệu, không thay bằng chứng định lượng. Nếu present unknown thì severity UNKNOWN. Mỗi nguy cơ cần chọn nguồn bằng chứng Chỉ ảnh hoặc Đo/khảo sát thực tế. Khi có số đo/khảo sát thực tế bổ sung, ghi nguồn, đơn vị, người đo và ngày; không suy ra số đo từ pixel chưa hiệu chuẩn. RISK-003/004/005/007/008 chỉ nhận nhãn 1/0 khi có xác nhận nguồn đo/khảo sát; còn lại phải unknown.

## Định nghĩa tám nguy cơ từ CSV nguồn

### RISK-001 — Thảm trải sàn lỏng lẻo, quăn mép hoặc dễ trượt

Dấu hiệu nhìn thấy: Thảm, mép cuộn, vị trí trên đường đi.

Khi thiếu bằng chứng: Cố định đáy thảm có thể không quan sát được từ ảnh.

Phòng ghi trong CSV: bedroom, hallway. Phòng áp dụng trong registry hiện tại: bedroom, living_room, hallway.

### RISK-002 — Dây điện/cáp băng ngang lối đi không có nẹp bảo vệ

Dấu hiệu nhìn thấy: Dây, ổ cắm, tuyến đi qua.

Khi thiếu bằng chứng: Góc chụp có thể bỏ sót dây điện.

Phòng ghi trong CSV: bedroom, bathroom, hallway. Phòng áp dụng trong registry hiện tại: bedroom, living_room, hallway, kitchen.

### RISK-003 — Vật cản lấn chiếm lối đi; thông thủy hẹp

Dấu hiệu nhìn thấy: Vật cản, hành lang, đồ bừa bộn.

Khi thiếu bằng chứng: Đo chính xác bề rộng lối đi cần thước hoặc dữ liệu chiều sâu.

Phòng ghi trong CSV: bedroom, bathroom, hallway. Phòng áp dụng trong registry hiện tại: bedroom, bathroom, living_room, hallway, kitchen.

### RISK-004 — Độ chiếu sáng ban đêm không đủ hoặc thiếu đèn dẫn đường

Dấu hiệu nhìn thấy: Đèn, ảnh ánh sáng ban đêm.

Khi thiếu bằng chứng: Không thể suy ra chỉ số lux chính xác bằng ảnh đơn.

Phòng ghi trong CSV: bedroom, bathroom, hallway. Phòng áp dụng trong registry hiện tại: bedroom, bathroom, hallway, living_room.

### RISK-005 — Sàn nhà tắm ướt và có nguy cơ trơn trượt

Dấu hiệu nhìn thấy: Sàn ướt hoặc vũng nước, thảm chống trượt.

Khi thiếu bằng chứng: Hệ số ma sát cần đo hoặc xác nhận vật liệu.

Phòng ghi trong CSV: bathroom. Phòng áp dụng trong registry hiện tại: bathroom.

### RISK-006 — Thiếu tay vịn an toàn tại bồn cầu / vòi sen

Dấu hiệu nhìn thấy: Vị trí tay vịn trong vùng bồn cầu, vòi sen.

Khi thiếu bằng chứng: Phải nhìn rõ khu vực và xác nhận bố trí thực tế.

Phòng ghi trong CSV: bathroom. Phòng áp dụng trong registry hiện tại: bathroom.

### RISK-007 — Gờ cửa / bậc chênh cao không có vát dốc

Dấu hiệu nhìn thấy: Gờ cửa và đường tiếp cận.

Khi thiếu bằng chứng: Cần vật chuẩn hoặc đo cao độ (cm).

Phòng ghi trong CSV: bedroom, bathroom, hallway. Phòng áp dụng trong registry hiện tại: bathroom, bedroom, hallway.

### RISK-008 — Công tắc / vật thiết yếu ngoài tầm với từ giường

Dấu hiệu nhìn thấy: Giường, công tắc đèn, tab đầu giường.

Khi thiếu bằng chứng: Cần kiểm tra khả năng với và khoảng cách thực tế.

Phòng ghi trong CSV: bedroom. Phòng áp dụng trong registry hiện tại: bedroom, living_room.

## Trường hợp phải giữ unknown

RISK-003: không xác định bề rộng thông thủy theo mét nếu chưa hiệu chuẩn/đo. RISK-004: ảnh sáng ban ngày không chứng minh đèn dẫn đường ban đêm hoặc lux. RISK-005: sàn bóng/nước nhìn thấy không đo được ma sát hay DCOF. RISK-007: không suy cm chiều cao gờ từ ảnh đơn. RISK-008: không suy tầm với của người sử dụng chỉ từ vị trí đèn/công tắc.

Với RISK-001, thảm phẳng không chứng minh đã cố định/chống trượt. Với RISK-006, vắng tay vịn trong ảnh cận lavabo không chứng minh cả bồn cầu và khu sen thiếu tay vịn; độ chịu lực luôn cần kiểm tra khác. Không có người trong ảnh cũng không xác nhận các điều kiện sinh hoạt.

## Khác biệt định nghĩa cần biết

CSV nguồn và registry có phạm vi phòng không khớp hoàn toàn (đặc biệt RISK-002 có bathroom trong CSV nhưng không có trong registry). Công cụ giữ nguyên cả hai, dùng registry hiện có để đánh dấu applicable; chưa sửa ngưỡng hay luật. Nếu muốn đổi phạm vi cần quyết định riêng, không sửa nhãn âm để làm khớp.

## Chuẩn bị và nhập vào Label Studio

Chạy `prepare_annotations.py` để tạo scripts/ml/annotation/label_studio.xml, response_schema.json, taxonomy.json, risk_definitions.json. Dán XML vào cấu hình labeling interface. Export bằng `export_annotations.py` tạo COCO riêng từng split và label_studio_<split>.json; risk giữ trong tasks và CSV vì COCO detection không mô tả đầy đủ nhãn nguy cơ.

Dữ liệu ảnh local: đặt LABEL_STUDIO_LOCAL_FILES_SERVING_ENABLED=true và LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT trỏ tới thư mục data/raw/ tuyệt đối trên máy chạy Label Studio. Task dùng /data/local-files/?d=images/... . Nếu dùng Docker, mount thư mục và dùng đường dẫn bên trong container. Không public ảnh gia đình lên một máy chủ không kiểm soát.

Chưa tự cài hoặc khởi chạy Label Studio. Bản Community dùng [Apache-2.0](https://github.com/HumanSignal/label-studio/blob/develop/LICENSE); cần giữ license/notice nếu phân phối. Định dạng predictions/bbox/local-files đối chiếu với [predictions](https://labelstud.io/guide/predictions), [RectangleLabels](https://labelstud.io/tags/rectanglelabels), [local storage](https://labelstud.io/guide/storage_local).

## Chạy các bước

Xem docs/ML_STAGE2.md để biết lệnh chia tập, khóa test, dry-run, gọi Gemini và export. Không ghi API key vào file; bridge chỉ đọc GEMINI_API_KEY từ môi trường tiến trình. Model phải được chọn rõ bằng --model hoặc GEMINI_MODEL; không tự đổi model dự phòng.

Structured output sử dụng responseMimeType + responseJsonSchema qua @google/genai có sẵn (Apache-2.0 theo package lock); JSON được kiểm tra lại trước khi lưu. Temperature thấp và seed chỉ giảm biến thiên, không bảo đảm kết quả tất định. Tham khảo [Google structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

**Dừng sau tiền gán để con người kiểm/sửa/xác nhận; chưa đánh giá baseline khi chưa có nhãn verified.**
