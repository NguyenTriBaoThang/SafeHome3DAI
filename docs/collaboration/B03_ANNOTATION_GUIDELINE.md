# B03 — Hướng dẫn gán nhãn bộ kiểm thử khóa (phiên bản 1.0)

> **Phạm vi tài liệu này:** ảnh **thật có consent** (phòng ngủ, phòng tắm) trong bộ kiểm thử khóa, do **hai người gán độc lập** (B-track = người gán 1, Person A = người gán 2, review 100%). Kết quả là **nhãn tham chiếu** (xem `CONTEXT.md`). Dự án chưa có thẩm định lâm sàng, nên không gọi đây là nhãn được phê duyệt về mặt y khoa.
> `docs/ANNOTATION_GUIDE.md` vẫn là hướng dẫn cho **tập ảnh công khai** (18 lớp, Label Studio, nhãn 1/0/unknown). Tài liệu này **bổ sung** cho ảnh thật và dùng 4 trạng thái của `CONTEXT.md`. Khi hai tài liệu khác nhau về ảnh thật, theo tài liệu này.

## 1. Phạm vi

- **Nhãn mức ảnh** cho từng mã RISK-001..008 **áp dụng cho loại phòng** (theo `docs/RISK_RULE_REGISTRY.md`):
  - `BEDROOM`: RISK-001, 002, 003, 004, 007, 008.
  - `BATHROOM`: RISK-003, 004, 005, 006, 007 (RISK-002 tùy chọn: CSV nguồn có, registry không).
  - Mã không áp dụng thì **không ghi** khóa đó (script từ chối khóa thừa/thiếu).
- **Bbox chỉ cho 6 nhóm** (7 id trong `src/lib/vision/taxonomy.ts`): `bed`, `rug`, `electrical_cable`, `chair`, `sink` + `toilet` (nhóm "sink/toilet"), `grab_bar`. Không vẽ lớp khác. Bbox chuẩn hóa `[xMin,yMin,xMax,yMax]` trong 0..1; vẽ khít **phần nhìn thấy**, `visibility` = `full` hoặc `partial`; vật bị che gần hết thì không vẽ. Không có bbox không chứng minh phòng không có vật.
- Mã RISK theo **registry và `ANNOTATION_GUIDE.md`**: RISK-007 = gờ/bậc cửa, RISK-008 = tầm với công tắc/vật thiết yếu từ giường. `SHARED_CONTRACT_V1.md` §4 ghi RISK-007 = chiều cao giường, RISK-008 = gờ cửa: **lệch với registry** (xem câu hỏi mở). Chiều cao giường **không** được gán nhãn.

## 2. Bốn trạng thái và nguyên tắc chung

| Trạng thái | Dùng khi |
| :--- | :--- |
| `present` | Thấy trực tiếp bằng chứng mối nguy trong ảnh; ghi `evidence_note` (vị trí + cơ chế). |
| `absent` | Vùng liên quan **nhìn rõ, đủ khung** và mối nguy không có. |
| `uncertain` | Có dấu hiệu nhưng chưa đủ để khẳng định/phủ định, hoặc vùng bị che/mờ/góc xấu. Ghi lý do. |
| `not_assessable` | Dù ảnh rõ, **ảnh không thể chứng minh** (cần đo, thử, hỏi người ở). Không phải nhãn âm. |

Quy tắc: (1) chỉ dựa vào điều **nhìn thấy**, không suy ra lux, cm, ma sát, độ chịu lực; (2) thiếu bằng chứng ≠ `absent`; (3) nghi ngờ giữa `present`/`absent` thì chọn `uncertain`; (4) `present` và `uncertain` bắt buộc có `evidence_note`.

**Nguồn trích dẫn:** chỉ dùng mã trong registry đã xác minh của repo (`src/data/curatedKnowledge.ts`, mô tả ở `docs/SOURCE_VERIFICATION.md`, `docs/KNOWLEDGE_BASE.md`): `SRC_WHO_2021` (WHO, https://www.who.int/publications/i/item/9789241563536), `SRC_CDC_STEADI_2023` (CDC STEADI, https://www.cdc.gov/steadi/materials.html), `SRC_BYT_VN_2020` (Bộ Y tế VN, https://kcb.vn/tai-lieu-chuyen-mon/huong-dan-phong-ngua-nga-nguoi-cao-tuoi.html). Lưu ý: các đoạn trong registry là đoạn **đã tuyển chọn trong repo**; người viết tài liệu này chưa mở lại tài liệu gốc để so nguyên văn. Tiêu chí nào không có đoạn registry hỗ trợ được ghi **"quy ước nội bộ của nhóm"**; đó là lựa chọn để gán nhãn nhất quán, không phải khuyến cáo y tế.

## 3. Tiêu chí theo từng RISK

### RISK-001 — Thảm không cố định / quăn mép (BEDROOM)
Nguồn: `SRC_WHO_2021` / `WHO_PASSAGE_01` (thảm không cố định, nếp gấp, cần lớp lót chống trượt).
- **present:** thấy thảm có mép quăn, nếp gấp/gợn sóng, bị xô lệch khỏi vị trí, hoặc nhỏ, rời, nằm trên lối đi.
- **absent:** vùng sàn đi lại nhìn rõ và **không có thảm rời**. (Thảm phủ kín tường-đến-tường dán sàn: ghi `uncertain` trừ khi thấy rõ cố định.) — quy ước nội bộ của nhóm.
- **uncertain:** thảm phẳng, mép thẳng: ảnh không cho thấy mặt dưới/lớp lót nên không chứng minh được cố định. Thảm bị đồ vật che mép.
- **not_assessable:** không dùng cho thảm nhìn thấy; chỉ dùng nếu khung không có sàn nào.

### RISK-002 — Dây điện băng ngang lối đi (BEDROOM; BATHROOM tùy chọn)
Nguồn: `SRC_WHO_2021` / `WHO_PASSAGE_01`; `SRC_CDC_STEADI_2023` / `CDC_PASSAGE_01` (không để dây kéo dài cắt ngang lối đi phòng ngủ ↔ vệ sinh).
- **present:** thấy dây/ dây sạc nằm trên mặt sàn đi qua khu vực đi lại (cửa ↔ giường ↔ lối ra) và không có nẹp.
- **absent:** sàn khu vực đi lại nhìn rõ, không có dây hở trên sàn; dây đi sát chân tường/trên nẹp che dây, không cắt lối đi. — phần "sát chân tường" là quy ước nội bộ của nhóm.
- **uncertain:** dây thấy được nhưng không rõ có cắt lối đi hay không; dây chui sau đồ đạc; sàn khu vực đi lại bị che.
- **not_assessable:** hầu như không dùng; chỉ khi khung không chứa sàn.

### RISK-003 — Vật cản / lối đi hẹp (BEDROOM, BATHROOM)
Nguồn: `SRC_CDC_STEADI_2023` / `CDC_PASSAGE_01` (thông thủy tối thiểu 80–90 cm, không để đồ lộn xộn chắn lối; registry dùng ngưỡng 0,85 m).
- **present:** đồ đạc/vật dụng nằm **trên tuyến đi** và chặn gần hết hoặc buộc phải đi vòng/bước qua (ví dụ ghế, túi, thùng giữa cửa và giường).
- **absent:** tuyến đi giữa cửa và giường/bồn cầu thấy rõ, không có vật trên sàn, và bề rộng nhìn **rõ ràng lớn hơn** bề rộng cánh cửa trong cùng khung. — quy ước nội bộ của nhóm (ảnh không đo được 0,85 m).
- **uncertain:** lối đi hẹp nhưng không có vật chắn rõ; không có vật tham chiếu để so bề rộng; một phần tuyến bị che.
- **not_assessable:** muốn kết luận bề rộng theo mét. Không bao giờ ghi `present` chỉ vì "có vẻ dưới 85 cm".

### RISK-004 — Chiếu sáng ban đêm (BEDROOM, BATHROOM)
Nguồn: `SRC_WHO_2021` / `WHO_PASSAGE_02` (đèn ngủ dịu 30–50 lux dọc lối đi giường ↔ vệ sinh).
- **not_assessable (mặc định):** lux và tình trạng ban đêm **không suy ra từ ảnh đơn**, kể cả ảnh chụp ban đêm hay có đèn. Có đèn trong khung không chứng minh `absent`.
- **uncertain:** thấy rõ bóng đèn ngủ/đèn cảm biến trên tuyến đi nhưng không biết có bật/đủ sáng; hoặc ảnh thiếu sáng đến mức không đánh giá được gì (xem mục 4).
- **present:** chỉ khi ảnh chụp đêm, **tuyến đi giường ↔ vệ sinh nhìn thấy rõ ràng tối đen** và không có nguồn sáng nào trong khung — quy ước nội bộ của nhóm; thận trọng, ưu tiên `uncertain`.
- **absent:** không dùng khi chỉ có ảnh (cần đo lux; ngoài phạm vi B03).

### RISK-005 — Sàn nhà tắm trơn khi ướt (BATHROOM)
Nguồn: `SRC_WHO_2021` / `WHO_PASSAGE_03` (sàn nhà tắm cần ma sát cao hoặc thảm chống trượt); `SRC_BYT_VN_2020` / `BYT_PASSAGE_01` (không để sàn trơn).
- **present:** thấy nước đọng/vũng, sàn ướt rõ ràng ở khu đi lại hoặc cạnh buồng tắm, **không** có thảm chống trượt hay gạch nhám thấy được.
- **uncertain:** sàn bóng/men bóng, ẩm nhẹ, có thể là phản chiếu; thảm nhỏ nhưng không rõ chống trượt.
- **not_assessable:** sàn khô, rõ ràng: **hệ số ma sát (DCOF/R) không đo được từ ảnh**, nên khô không phải `absent`.
- **absent:** không dùng khi chỉ có ảnh, trừ khi thấy rõ sàn gạch nhám/thảm cao su giác hút phủ khu vực ướt — quy ước nội bộ của nhóm.

### RISK-006 — Thiếu thanh vịn tại bồn cầu / buồng tắm (BATHROOM)
Nguồn: `SRC_WHO_2021` / `WHO_PASSAGE_03`; `SRC_BYT_VN_2020` / `BYT_PASSAGE_02` (thanh vịn cạnh bồn cầu và buồng tắm). Registry yêu cầu cả hai vị trí.
- **present:** khu bồn cầu **hoặc** khu tắm nhìn rõ trong khung (cả vùng tường cạnh đó) và **không** có thanh vịn trong tầm với của khu đó.
- **absent:** mọi khu (bồn cầu, khu tắm) xuất hiện trong khung đều có thanh vịn gắn tường, **và** ít nhất khu bồn cầu thấy rõ. — quy ước nội bộ của nhóm.
- **uncertain:** chỉ thấy một khu, khu đó có thanh vịn nhưng khu còn lại ngoài khung; hoặc thanh trông như thanh treo khăn.
- **not_assessable:** chỉ thấy lavabo/cận cảnh không chứa bồn cầu hay khu tắm (vắng thanh vịn ở đó không chứng minh gì; độ chịu lực luôn không đánh giá được bằng ảnh).

### RISK-007 — Gờ / bậc cửa chênh cao (BEDROOM, BATHROOM)
Nguồn: `SRC_BYT_VN_2020` / `BYT_PASSAGE_01` (loại bỏ bậc tam cấp/gờ cao không cần thiết). Ngưỡng 1,5 cm là của `docs/RISK_RULE_REGISTRY.md`; **registry không có đoạn trích dẫn đo được cho con số này** nên không dùng để phán trong ảnh.
- **present:** gờ/bậc **lồi rõ** ngang lối vào, nhìn rõ so với vật tham chiếu (giày, chân cửa, gạch), và không có vát dốc. — quy ước nội bộ của nhóm.
- **absent:** lối vào nhìn rõ, mặt sàn hai bên liền mạch, không thấy gờ.
- **uncertain:** thấy ngưỡng/ray cửa nhưng không đủ để biết cao hay thấp.
- **not_assessable:** không thấy lối vào/ngưỡng trong khung (không có vùng liên quan).

### RISK-008 — Tầm với công tắc/vật thiết yếu từ giường (BEDROOM)
Nguồn: `SRC_BYT_VN_2020` / `BYT_PASSAGE_01` (bố trí công tắc đèn ngang tầm với). Ngưỡng 50–60 cm là của registry, không có đoạn trích dẫn đo được.
- **absent:** giường và (công tắc/đèn/tab đầu giường) cùng trong khung, vật đó **sát cạnh giường** (liền đầu giường, trong khoảng một sải tay nhìn thấy rõ). — quy ước nội bộ của nhóm.
- **present:** giường nhìn rõ, công tắc/đèn nhìn thấy **ở xa** (đầu kia phòng/cạnh cửa) và không có đèn/tab nào sát giường.
- **uncertain:** công tắc/đèn thấy được nhưng khoảng cách không rõ; không thấy công tắc nhưng cũng không chắc không có.
- **not_assessable:** không thấy giường trong khung. Tầm với thật của người dùng (chiều cao, khả năng vận động) không suy ra được.

## 4. Trường hợp khó

| Tình huống | Cách xử lý |
| :--- | :--- |
| Ảnh mờ (nhòe) | Nếu vùng của RISK không đọc được: `uncertain`; nếu cả ảnh không đọc được gì thì **loại ảnh** khỏi bộ (ghi lý do vào log, không đổi nhãn). |
| Thiếu sáng / ngược sáng | Vùng không phân biệt được: `uncertain`, không `absent`. |
| Phản chiếu (gương, gạch bóng, kính) | Không gán hazard dựa vào ảnh phản chiếu; sàn bóng ướt/khô không phân biệt được → `uncertain` (RISK-005). |
| Bị che (occlusion) | Phần bị che coi như không thấy; chỉ vẽ bbox phần thấy; `visibility=partial`; hazard liên quan `uncertain`. |
| Vật chồng nhau | Một vật một nhãn đúng nhất; dây trên thảm vẽ hai bbox (`rug`, `electrical_cable`). |
| Phòng ít nguy cơ | Không "gài" `present`; nhiều `absent`/`not_assessable` là bình thường. |
| Sai loại phòng so với manifest | Không tự sửa; ghi vào log, nhờ người giữ manifest xác nhận, tạm loại ảnh. |
| Có người, khuôn mặt (cả ảnh treo tường), giấy tờ, thuốc có nhãn, địa chỉ, màn hình | **Loại ảnh**, không gán nhãn; báo người giữ manifest xóa theo B02 (mục 3, 5). |

## 5. Quy trình

1. Mỗi người gán **độc lập, không trao đổi, không xem nhãn của người kia**. Mỗi người ghi một file JSON mảng bản ghi (`data_schemas/hazard_labels.schema.json`) với `annotator_id` riêng và đúng `guideline_version`.
2. **Dự đoán Gemini/AI không được hiển thị cho người gán trước khi họ gán xong** và **không bao giờ được dùng làm nhãn** (`CONTEXT.md`). Tiền gán của pipeline ảnh công khai không áp dụng cho bộ này.
3. Chạy `b03_labels.py validate`, rồi `agreement` để lấy κ theo RISK và **danh sách bất đồng** (CSV).
4. Hai người họp **sau khi cả hai nộp**, thảo luận từng dòng bất đồng, điền `final_state` và `resolution_note` trong CSV. Nếu không thống nhất được: `uncertain` kèm lý do.
5. `finalize` tạo `hazard_ground_truth.json`: giữ `final`, **cả hai nhãn thô** (`raw`), `resolution` (`agreed`/`discussed`) và tham chiếu tới nhật ký bất đồng. Không ghi đè nhãn thô.
6. Nếu hướng dẫn phải đổi: tăng `guideline_version`, ghi lý do, gán lại **toàn bộ** ảnh bị ảnh hưởng (không sửa lẻ nhãn).
7. Không dùng bộ kiểm thử khóa để chỉnh prompt/tham số.

## 6. Ví dụ minh họa (mô tả bằng lời, không kèm ảnh)

Mọi ví dụ là **tình huống giả định** để thống nhất quy ước.

1. **Phòng ngủ, thảm tròn, mép phải quăn lên khoảng nửa bàn tay, nằm giữa cửa và giường.** RISK-001 = `present` (mép quăn, trên lối đi). Bbox `rug`. RISK-003 = `uncertain` nếu lối đi còn rộng.
2. **Phòng ngủ, thảm phẳng đẹp, mép thẳng, góc bị chân giường đè.** RISK-001 = `uncertain`: không thấy mặt dưới nên không biết có lớp chống trượt; phẳng không chứng minh an toàn.
3. **Phòng ngủ, dây sạc điện thoại kéo từ ổ cắm đầu giường, vắt qua sàn lối ra cửa.** RISK-002 = `present`; bbox `electrical_cable`.
4. **Phòng ngủ, dây điện chạy sát chân tường rồi chui sau tủ.** RISK-002 = `absent` nếu vùng đi lại sàn nhìn rõ và sạch; nếu phần dây sau tủ có thể cắt lối thì `uncertain`.
5. **Phòng tắm, chụp từ cửa: thấy bồn cầu và buồng tắm, tường cạnh cả hai trống.** RISK-006 = `present`. Nếu có thanh vịn cạnh bồn cầu nhưng tường buồng tắm trống: vẫn `present` (khu tắm nhìn rõ không có thanh).
6. **Phòng tắm, ảnh cận lavabo và gương, không thấy bồn cầu/khu tắm.** RISK-006 = `not_assessable`.
7. **Phòng tắm, sàn gạch bóng, có vệt sáng dài (không rõ là nước hay phản chiếu đèn).** RISK-005 = `uncertain`. Nếu chắc chắn thấy vũng nước và không có thảm: `present`.
8. **Phòng tắm, sàn khô, gạch rõ nhưng loại gạch không rõ.** RISK-005 = `not_assessable` (ma sát không đo được), không phải `absent`.
9. **Phòng ngủ chụp ban ngày, có đèn ngủ trên tab đầu giường.** RISK-004 = `not_assessable` (không suy ra ban đêm/lux từ ảnh ban ngày); RISK-008 = `absent` nếu công tắc/đèn sát đầu giường nhìn rõ. Hai người dễ bất đồng ở đây: ghi bất đồng rồi chốt theo mục 3.
10. **Phòng ngủ, ảnh tối, giường mờ, thấy hình chữ nhật sáng của tivi và một người ngồi ở mép giường.** **Loại ảnh** (có người), không gán nhãn, báo xóa theo B02.
11. **Ảnh phòng ngủ nhưng manifest ghi BATHROOM.** Không gán; ghi log và nhờ xác nhận manifest.

## 7. Giới hạn cần nêu khi báo cáo

Nhãn tham chiếu do hai người gán theo quy ước trên, chưa có thẩm định lâm sàng; κ là độ đồng thuận giữa hai người, không phải độ đúng. Số ảnh nhỏ (~30–45 ảnh, ~10 hộ): mọi chỉ số P/R/F1/κ là **thăm dò**, kèm khoảng Wilson 95% và cảnh báo "mẫu nhỏ, thăm dò"; không công bố một con số "accuracy" duy nhất.
