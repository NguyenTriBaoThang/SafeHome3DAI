# SafeHome 3D AI — Ma trận Quy tắc Rủi ro & Tình trạng Thẩm định Lâm sàng (Task A04)

**Mã tài liệu:** `CLIN-MATRIX-2026.1`  
**Phiên bản cấu hình:** `2026.1`  
**Ngày cập nhật:** 24/11/2026  
**Trạng thái thẩm định:** `REFERENCE_ONLY` / `PENDING_REVIEW` (Chờ hội đồng chuyên gia độc lập ký duyệt)  

---

## 1. Nguyên tắc cốt lõi về Tính Minh bạch Y tế

Hệ thống SafeHome 3D AI tuân thủ nghiêm ngặt các nguyên tắc đạo đức và an toàn y tế số:
1. **Tuyệt đối không giả mạo sự phê duyệt của chuyên gia:** Mọi quy tắc nếu chưa có biên bản thẩm định chính thức mang chữ ký và mã chứng chỉ hành nghề của bác sĩ/chuyên gia sẽ chỉ được gắn nhãn `REFERENCE_ONLY` (Dẫn chiếu y văn) hoặc `PROPOSED_INTERNAL` (Đang đề xuất nội bộ).
2. **Phân định rạch ròi căn cứ y khoa:**
   - **Tham khảo y văn chính thống (`REFERENCE_ONLY`):** Dựa trên tài liệu đồng thuận quốc tế (CDC STEADI, WHO Guidelines 2021, IES RP-28, AGS/BGS, BS 7976-2, QCVN 10:2014/BXD).
   - **Đang đề xuất nội bộ (`PROPOSED_INTERNAL`):** Các ngưỡng kinh nghiệm kiến trúc hoặc giả định kỹ thuật của nhóm phát triển chưa được kiểm chứng lâm sàng độc lập.
   - **Đã phê duyệt (`EXPERT_APPROVED`):** Chỉ áp dụng khi có phiếu thẩm định chuyên môn hợp lệ kèm chữ ký số / biên bản nghiệm thu y khoa.

---

## 2. Ma trận Chi tiết 8 Quy tắc (`RISK-001` đến `RISK-008`)

### `RISK-001`: Thảm trải sàn không cố định / quăn mép
- **Nhóm hành động:** `SECURE_RUG`
- **Phạm vi áp dụng:** Phòng ngủ, Phòng khách, Hành lang
- **Dữ liệu đầu vào cần đo:** `rugs.present`, `rugs.items.isSecured`, `rugs.items.edgesCurled`, vị trí luồng di chuyển.
- **Căn cứ y văn:** CDC STEADI (2019) Home Hazard Checklist; WHO Guidelines on Fall Prevention (2021) Chương 3.
- **Ngưỡng an toàn định lượng:** Hệ số ma sát động mặt đế thảm $\text{DCOF} \ge 0.42$ trên nền gạch/gỗ; hoặc dán cố định 100% 4 mép viền bằng băng dán thảm chuyên dụng; không có nếp gấp nhô cao quá $0.6\text{ cm}$.
- **Cơ chế cơ sinh học:** Dáng đi lê gót chân (shuffling gait) của người cao tuổi với độ nâng chân thấp ($1.0 - 2.5\text{ cm}$) dễ vấp vào mép thảm bị quăn góc. Lực quán tính đẩy toàn bộ trọng tâm cơ thể ra trước gây mất thăng bằng đột ngột.
- **Mức độ nghiêm trọng (`severity`):** `HIGH`
- **Mức độ ưu tiên can thiệp (`priority`):** `HIGH` (khi nằm trên luồng di chuyển chính) / `MEDIUM` (góc phụ).
- **Trạng thái thẩm định:** `REFERENCE_ONLY` (Dẫn chiếu CDC STEADI).

---

### `RISK-002`: Dây điện / cáp thiết bị vắt ngang lối đi thông thủy
- **Nhóm hành động:** `REROUTE_CABLE`
- **Phạm vi áp dụng:** Toàn bộ các không gian sinh hoạt trong nhà
- **Dữ liệu đầu vào cần đo:** `cables.crossingWalkway`, `cables.items.hasCordCover`, `cables.items.hasSkirtingTrunking`.
- **Căn cứ y văn:** CDC STEADI (2019); Hướng dẫn Chăm sóc sức khỏe người cao tuổi - Bộ Y tế Việt Nam (2020).
- **Ngưỡng an toàn định lượng:** $0$ dây điện cắt ngang lối đi bộ thông thủy. Mọi dây băng qua hành lang bắt buộc phải có nẹp cao su bảo vệ vát mép (dốc $< 1:4$) gắn chặt xuống sàn.
- **Cơ chế cơ sinh học:** Đầu ngón chân hoặc đầu gậy chống/khung tập đi móc vào quầng dây chùng, gây vấp ngã trực diện.
- **Mức độ nghiêm trọng (`severity`):** `HIGH`
- **Trạng thái thẩm định:** `REFERENCE_ONLY` (Dẫn chiếu CDC STEADI).

---

### `RISK-003`: Vật cản lấn chiếm hành lang / thông thủy lối đi
- **Nhóm hành động:** `REMOVE_OBSTACLE`
- **Phạm vi áp dụng:** Phòng ngủ, Phòng tắm, Phòng khách, Hành lang, Bếp
- **Dữ liệu đầu vào cần đo:** `obstacles.present`, `obstacles.walkwayClearWidthM`.
- **Căn cứ y văn:** ADA Standards for Accessible Design Section 403.5.1; Quy chuẩn kỹ thuật quốc gia QCVN 10:2014/BXD.
- **Ngưỡng an toàn định lượng:**
  - Tiêu chuẩn an toàn: Khoảng thông thủy lối đi $\ge 0.85\text{ m}$ (đối với người dùng khung tập đi) và $\ge 0.90\text{ m}$ (đối với xe lăn).
  - Ngưỡng nguy hiểm cao (`HIGH`): Thông thủy $< 0.70\text{ m}$.
- **Cơ chế cơ sinh học:** Lối đi hẹp buộc người già phải đi nghiêng, xoay vặn thân mình làm thay đổi diện tích chân đế (Base of Support - BoS), dẫn đến mất thăng bằng bên (lateral falls) gây chấn thương cổ xương đùi.
- **Mức độ nghiêm trọng (`severity`):** `HIGH` ($< 0.70\text{ m}$) / `MEDIUM` ($0.70 - 0.85\text{ m}$).
- **Trạng thái thẩm định:** `REFERENCE_ONLY` (Dẫn chiếu ADA & QCVN 10:2014/BXD).

---

### `RISK-004`: Độ rọi chiếu sáng ban đêm không đủ an toàn
- **Nhóm hành động:** `IMPROVE_LIGHTING`
- **Phạm vi áp dụng:** Tuyến di chuyển từ giường ngủ đến nhà vệ sinh
- **Dữ liệu đầu vào cần đo:** `lighting.nighttimeLux`, `lighting.nightLightPresent`, `lighting.pathLightToBathroom`.
- **Căn cứ y văn:** Illuminating Engineering Society (IES) RP-28-20 *Lighting and the Visual Environment for Older Adults and the Visually Impaired*; WHO (2021).
- **Ngưỡng an toàn định lượng:**
  - Phòng ngủ ban đêm: $\ge 50 - 60\text{ Lux}$ (khu vực lối đi) hoặc trang bị đèn ngủ ánh sáng ấm ($2700\text{K}$) không gây chói.
  - Phòng tắm & Hành lang: $\ge 100\text{ Lux}$.
- **Cơ chế cơ sinh học:** Lão hóa khiến đồng tử người già co nhỏ (senile miosis) và thể thủy tinh đục, làm lượng ánh sáng đến võng mạc giảm $60 - 70\%$ so với người 20 tuổi. Thiếu sáng ban đêm làm mất tín hiệu thị giác điều chỉnh thăng bằng.
- **Mức độ nghiêm trọng (`severity`):** `HIGH` ($< 40\text{ Lux}$ hoặc không có đèn dẫn đường) / `MEDIUM` ($40 - 50\text{ Lux}$).
- **Trạng thái thẩm định:** `REFERENCE_ONLY` (Dẫn chiếu IES RP-28-20).

---

### `RISK-005`: Bề mặt sàn nhà tắm trơn trượt khi ướt
- **Nhóm hành động:** `ADD_NON_SLIP_MAT`
- **Phạm vi áp dụng:** Phòng tắm & Nhà vệ sinh (`BATHROOM`)
- **Dữ liệu đầu vào cần đo:** `floor.isWet`, `floor.isSlipResistant`, `floor.hasNonSlipMat`.
- **Căn cứ y văn:** BS 7976-2 (Pendulum Test Value); ANSI A137.1 / A326.3 Dynamic Coefficient of Friction (DCOF); CDC STEADI.
- **Ngưỡng an toàn định lượng:** Giá trị con lắc PTV $\ge 36$ khi ướt; hoặc DCOF $\ge 0.42$; hoặc trang bị thảm cao su chống trượt có giác hút bao phủ tối thiểu $70\%$ diện tích buồng tắm đứng.
- **Cơ chế cơ sinh học:** Màng nước và xà phòng tạo lớp bôi trơn thủy động (hydrodynamic lubrication) triệt tiêu lực ma sát tĩnh giữa chân trần và gạch men nhẵn, gây trượt gót bất ngờ.
- **Mức độ nghiêm trọng (`severity`):** `HIGH`. Luôn yêu cầu `requiresManualConfirmation: true` khi chỉ phân tích qua ảnh chụp.
- **Trạng thái thẩm định:** `REFERENCE_ONLY` (Dẫn chiếu BS 7976-2 / CDC STEADI).

---

### `RISK-006`: Thiếu thanh tay vịn an toàn trong nhà vệ sinh
- **Nhóm hành động:** `INSTALL_GRAB_BAR`
- **Phạm vi áp dụng:** Nhà vệ sinh & Buồng tắm (`BATHROOM`)
- **Dữ liệu đầu vào cần đo:** `grabBars.present`, `grabBars.count`, `grabBars.toiletGrabBarPresent`, `grabBars.showerGrabBarPresent`, `grabBars.inspectedSecure`.
- **Căn cứ y văn:** WHO Guidelines on Fall Prevention (2021); ADA Section 609; Hướng dẫn phòng chống tai nạn thương tích - Bộ Y tế (2020).
- **Ngưỡng an toàn định lượng:** Tối thiểu 2 thanh tay vịn chuyên dụng (đường kính $32 - 38\text{ mm}$, tải trọng chịu lực $\ge 110 - 150\text{ kg}$): 1 thanh cạnh bồn cầu (cao $75 - 85\text{ cm}$) và 1 thanh trong buồng tắm.
- **Cơ chế cơ sinh học:** Người cao tuổi bị suy giảm sức cơ tứ đầu đùi (sarcopenia) và tụt huyết áp tư thế khi đứng dậy sau khi đi vệ sinh hoặc tắm nước ấm lâu, cần điểm tựa cánh tay trợ lực.
- **Mức độ nghiêm trọng (`severity`):** `HIGH` (thiếu cả 2 vị trí) / `MEDIUM` (đã có 1 thanh nhưng còn thiếu ở vị trí tắm/bồn cầu).
- **Trạng thái thẩm định:** `REFERENCE_ONLY` (Dẫn chiếu WHO 2021).

---

### `RISK-007`: Gờ bậc cửa cao hoặc chiều cao nệm bất hợp lý
- **Nhóm hành động:** `RAMP_OR_MARK_THRESHOLD`
- **Phạm vi áp dụng:** Lối vào nhà vệ sinh, phòng ngủ, giường ngủ
- **Dữ liệu đầu vào cần đo:** `floor.levelDifferenceCm`, `floor.thresholdStepPresent`, `floor.hasThresholdRamp`, `bedDimensions.bedSurfaceHeightCm`.
- **Căn cứ y văn:** AGS/BGS Clinical Practice Guideline (2020); ADA Section 303; CDC STEADI.
- **Ngưỡng an toàn định lượng:**
  - Gờ bậc cửa: Chênh lệch $\le 1.5\text{ cm}$ (nếu cao hơn bắt buộc có gờ dốc vát mép cao su tỷ lệ $\le 1:2$).
  - Chiều cao mặt nệm ngồi (`bedSurfaceHeightCm`): $45\text{ cm} \le h \le 55\text{ cm}$ (để khi ngồi mông chạm nệm thì hai bàn chân đặt phẳng trên sàn, gối vuông góc $90^\circ$).
- **Cơ chế cơ sinh học:** Gờ cửa cao tạo chướng ngại vật trực tiếp; nệm quá thấp ($< 45\text{ cm}$) đòi hỏi mô-men lực khớp gối gấp 2 lần bình thường để đứng dậy, nệm quá cao ($> 55\text{ cm}$) khiến chân lơ lửng gây trượt ngã khi tụt xuống giường.
- **Mức độ nghiêm trọng (`severity`):** `HIGH` (gờ $\ge 3.5\text{ cm}$ hoặc nệm $< 40\text{ cm}$) / `MEDIUM` (gờ $1.5 - 3.5\text{ cm}$ hoặc nệm $40 - 45\text{ cm}$).
- **Trạng thái thẩm định:** `REFERENCE_ONLY` (Dẫn chiếu AGS/BGS & ADA).

---

### `RISK-008`: Tầm với công tắc đèn hoặc vật dụng thiết yếu khó tiếp cận
- **Nhóm hành động:** `REORGANIZE_STORAGE`
- **Phạm vi áp dụng:** Phòng ngủ người cao tuổi
- **Dữ liệu đầu vào cần đo:** `accessibility.lightSwitchReachableFromBed`, `accessibility.essentialItemsReachableFromBed`.
- **Căn cứ y văn:** CDC STEADI Environmental Safety Checklist (2019); Tiêu chuẩn công thái học thiết kế nội thất người cao tuổi.
- **Ngưỡng an toàn định lượng:** Công tắc đèn đầu giường, điện thoại khẩn cấp, kính mắt và nước uống phải nằm trong bán kính tầm với tay $\le 60\text{ cm}$ từ tư thế nằm/ngồi trên giường.
- **Cơ chế cơ sinh học:** Động tác nhoài người quá tầm với (over-reaching) khi trọng tâm cơ thể dời ra ngoài mặt chân đế của giường dẫn đến ngã rơi từ trên giường xuống sàn.
- **Mức độ nghiêm trọng (`severity`):** `MEDIUM`.
- **Trạng thái thẩm định:** `PROPOSED_INTERNAL` (Đang đề xuất nội bộ dựa trên khảo sát hiện trường).

