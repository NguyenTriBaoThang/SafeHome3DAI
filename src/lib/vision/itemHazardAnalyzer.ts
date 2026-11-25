import { StructuredCitation } from "@/lib/rag/types";
export * from "./itemHazardTypes";
import {
  ItemDangerHotspot,
  ItemRemediation,
  ItemHazardAssessment,
  getCanonicalRuleForItemCategory,
} from "./itemHazardTypes";

// Pre-curated knowledge base for deterministic fall-hazard assessment
const HEURISTIC_KNOWLEDGE: Record<
  string,
  Omit<ItemHazardAssessment, "id" | "imageUrl" | "analyzedAt" | "modelProvider" | "demo">
> = {
  rug: {
    itemName: "Thảm trải sàn nỉ/vải không có lớp bám chống trượt",
    itemCategory: "rug",
    riskScore: 86,
    severity: "HIGH",
    severityLabel: "NGUY CƠ CAO (86/100)",
    urgencyLevel: "KHẨN CẤP",
    whyDangerous: {
      summary:
        "Thảm rời không cố định là một trong những căn nguyên hàng đầu gây chấn thương té ngã trong nhà ở người cao tuổi (chiếm tới 35% các vụ té ngã sinh hoạt theo CDC STEADI).",
      biomechanicalRationale:
        "Người già thường có dáng đi lê bước (shuffling gait) với độ nhấc bàn chân thấp (chỉ từ 1.0 - 2.5 cm). Khi mũi dép hoặc đầu ngón chân chạm vào mép thảm bị cong vênh, lực quán tính đẩy toàn bộ trọng tâm cơ thể ra trước gây mất thăng bằng bất thình lình. Đồng thời, mặt dưới thảm không có lớp bám silicone/cao su khiến thảm bị trượt văng khi người già đặt gót chân xuống.",
      clinicalReference:
        "CDC STEADI (2019) & WHO Guidelines on Fall Prevention in Older Age (Chương 3 - Home Environmental Hazards).",
      consequenceRisk:
        "Nguy cơ cao gãy cổ xương đùi, chấn thương khớp háng và xuất huyết dưới màng cứng khi ngã đập đầu xuống nền cứng.",
    },
    whereDangerous: [
      {
        id: "spot-1",
        number: 1,
        title: "Mép viền thảm bị quăn góc & cong vênh",
        description:
          "Các góc thảm nhô cao hơn mặt sàn từ 1 đến 2 cm, tạo thành cái bẫy vấp ngã trực diện ngay trên lối di chuyển.",
        coordinates: { x: 22, y: 78 },
        severity: "CRITICAL",
        mechanism: "Vấp mũi chân khi đi bước ngắn (Toe Catch / Trip Hazard)",
      },
      {
        id: "spot-2",
        number: 2,
        title: "Mặt đế thảm thiếu giác hút cao su ma sát",
        description:
          "Lớp đế vải dệt nhẵn bóng, hệ số ma sát tĩnh < 0.3 trên nền gạch men hoặc gỗ bóng, rất dễ trôi trượt khi chịu tải trọng nghiêng.",
        coordinates: { x: 50, y: 52 },
        severity: "HIGH",
        mechanism: "Trượt gót chân khi chịu tải (Heel Slip Hazard)",
      },
      {
        id: "spot-3",
        number: 3,
        title: "Màu sắc tương phản thấp so với nền gạch",
        description:
          "Thảm có gam màu tiệp với sàn nhà, gây khó khăn cho người cao tuổi bị giảm thị lực tương phản hoặc đục thủy tinh thể nhận diện biên độ viền thảm.",
        coordinates: { x: 74, y: 32 },
        severity: "MEDIUM",
        mechanism: "Suy giảm thị giác nhận biết chướng ngại vật (Low Visual Contrast)",
      },
    ],
    remediation: [
      {
        id: "rem-1",
        step: "Dán cố định 4 mép thảm và đường viền bằng băng dính hai mặt chuyên dụng cho thảm sàn (Rug Tape) hoặc thay thế bằng thảm có đế cao su TPE chống trượt.",
        priority: "IMMEDIATE",
        costEstimate: "45.000 - 80.000 VNĐ",
        materialsNeeded: "Cuộn băng dán thảm cường lực hai mặt hoặc miếng lót silicon Rug Gripper",
        timeEstimate: "5 phút",
      },
      {
        id: "rem-2",
        step: "Di chuyển thảm ra khỏi luồng giao thông chính (đặc biệt là lối đi từ giường ngủ đến nhà vệ sinh ban đêm).",
        priority: "IMMEDIATE",
        costEstimate: "0 VNĐ",
        materialsNeeded: "Không cần",
        timeEstimate: "2 phút",
      },
      {
        id: "rem-3",
        step: "Dán viền phản quang hoặc tạo độ tương phản màu sắc rõ rệt để người già dễ nhận diện đường biên thảm trong điều kiện ánh sáng yếu.",
        priority: "PREVENTIVE",
        costEstimate: "30.000 VNĐ",
        materialsNeeded: "Băng keo chỉ phản quang",
        timeEstimate: "10 phút",
      },
    ],
    citations: [
      {
        citationId: "cit-cdc-rug",
        citationNumber: 1,
        documentId: "doc-cdc-steadi",
        chunkId: "chunk-cdc-rug-1",
        publisher: "CDC STEADI",
        documentTitle: "Check for Safety: A Home Fall Prevention Checklist for Older Adults",
        sectionTitle: "Floors and Rugs Safety Guidelines",
        pageNumber: 2,
        supportingExcerpt:
          "Throw rugs should be either removed entirely or fastened to the floor with double-faced tape or non-skid backing to prevent sliding and edge tripping.",
        officialUrl: "https://www.cdc.gov/steadi/materials.html",
      },
      {
        citationId: "cit-who-env",
        citationNumber: 2,
        documentId: "doc-who-falls",
        chunkId: "chunk-who-env-2",
        publisher: "World Health Organization",
        documentTitle: "WHO Global Report on Falls Prevention in Older Age",
        sectionTitle: "Environmental Hazards in the Living Space",
        pageNumber: 14,
        supportingExcerpt:
          "Unsecured floor coverings such as mats and rugs on polished tiles are significant environmental risk factors for severe hip fractures.",
        officialUrl: "https://www.who.int/publications/i/item/9789241563536",
      },
    ],
  },

  electrical_cable: {
    itemName: "Dây nguồn ổ cắm & cáp sạc thả tự do trên lối đi",
    itemCategory: "electrical_cable",
    riskScore: 92,
    severity: "CRITICAL",
    severityLabel: "CỰC KỲ NGUY HIỂM (92/100)",
    urgencyLevel: "KHẨN CẤP",
    whyDangerous: {
      summary:
        "Dây điện vắt ngang sàn là chướng ngại vật dạng sợi vô cùng nguy hiểm. Khi vướng vào chân hoặc gậy chống, dây sẽ móc chặt giữ chân lại trong khi thân người tiếp tục lao về phía trước.",
      biomechanicalRationale:
        "Tạo ra mô-men xoắn ngã chúi đầu (Forward Fall Dynamic). Do người già phản xạ chống đỡ bằng tay bị chậm đi đáng kể (thời gian phản ứng tăng thêm 200–300ms), cú ngã thường trực diện xuống sàn cứng dẫn đến chấn thương sọ não hoặc gãy xương đài quay cổ tay.",
      clinicalReference:
        "CDC STEADI (2019) Fall Risk Prevention Checklist & National Council on Aging (NCOA).",
      consequenceRisk:
        "Chấn thương sọ não, vỡ xương bánh chè, gãy cổ tay Colles fracture và gãy xương đùi.",
    },
    whereDangerous: [
      {
        id: "spot-1",
        number: 1,
        title: "Đoạn dây võng vắt ngang hành lang di chuyển",
        description: "Dây điện nằm ngang tầm chân bước, không được gắn cố định vào nẹp hoặc sàn.",
        coordinates: { x: 45, y: 72 },
        severity: "CRITICAL",
        mechanism: "Mắc kẹt ngón chân hoặc gót chân (Loop Entanglement)",
      },
      {
        id: "spot-2",
        number: 2,
        title: "Ổ cắm nối tiếp lơ lửng gần chân giường",
        description: "Cục chia ổ cắm nằm tự do dưới gầm bàn/giường, dễ bị đá phải trong bóng tối.",
        coordinates: { x: 75, y: 48 },
        severity: "HIGH",
        mechanism: "Va đập bàn chân và giật điện nếu ẩm ướt (Mechanical & Electrical Hazard)",
      },
      {
        id: "spot-3",
        number: 3,
        title: "Búi dây rối không được bó gọn",
        description: "Búi dây tạo thành cấu trúc mạng nhện dễ vướng mắc vào khung tập đi hoặc gậy chống.",
        coordinates: { x: 25, y: 60 },
        severity: "HIGH",
        mechanism: "Vướng thiết bị trợ khí di chuyển (Mobility Aid Jamming)",
      },
    ],
    remediation: [
      {
        id: "rem-1",
        step: "Dùng nẹp luồn dây bán nguyệt áp sàn (Floor Cord Cover) dán cố định dây áp sát chân tường.",
        priority: "IMMEDIATE",
        costEstimate: "35.000 - 75.000 VNĐ",
        materialsNeeded: "Nẹp nhựa/cao su bán nguyệt chuyên dụng",
        timeEstimate: "10 phút",
      },
      {
        id: "rem-2",
        step: "Sử dụng dây thít nhựa (cable ties) hoặc móc dán kẹp cáp vào hông tủ/bàn để nâng dây khỏi mặt đất.",
        priority: "IMMEDIATE",
        costEstimate: "20.000 VNĐ",
        materialsNeeded: "Bộ kẹp giữ cáp dán tường 3M",
        timeEstimate: "5 phút",
      },
    ],
    citations: [
      {
        citationId: "cit-cdc-cable",
        citationNumber: 1,
        documentId: "doc-cdc-steadi",
        chunkId: "chunk-cdc-cable-1",
        publisher: "CDC STEADI",
        documentTitle: "Check for Safety",
        sectionTitle: "Living Areas and Pathways",
        pageNumber: 3,
        supportingExcerpt:
          "Keep wires, cords, and cables away from walking paths and coiled or taped next to the baseboards.",
        officialUrl: "https://www.cdc.gov/steadi/materials.html",
      },
    ],
  },

  chair: {
    itemName: "Ghế đôn hoặc ghế không có tay vịn / Chân ghế yếu",
    itemCategory: "chair",
    riskScore: 74,
    severity: "HIGH",
    severityLabel: "NGUY CƠ CAO (74/100)",
    urgencyLevel: "ƯU TIÊN CAO",
    whyDangerous: {
      summary:
        "Ghế thiếu tay vịn hoặc đệm ngồi quá trũng/thấp khiến người cao tuổi gặp khó khăn khi chuyển tư thế từ ngồi sang đứng (Sit-to-Stand Transition), dễ mất thăng bằng ngã ngửa ra sau.",
      biomechanicalRationale:
        "Khi đứng dậy, người cao tuổi bị suy giảm sức cơ tứ đầu đùi (quadriceps sarcopenia) cần một điểm tỳ tay trợ lực để nâng trọng tâm. Nếu ghế không có tay vịn vững chãi hoặc chân ghế trơn trượt trên sàn bóng, người già sẽ phải dồn lực đột ngột gây choáng váng tư thế (orthostatic hypotension) hoặc trượt ngã.",
      clinicalReference:
        "CDC STEADI Sit-to-Stand Assessment & WHO Functional Ability Standards.",
      consequenceRisk:
        "Ngã đập lưng ra sau, lún xẹp đốt sống thắt lưng, chấn thương khớp gối.",
    },
    whereDangerous: [
      {
        id: "spot-1",
        number: 1,
        title: "Thiếu điểm tỳ tay vịn hai bên",
        description: "Hai bên hông ghế trống, không có điểm tựa để chống tay khi đứng lên hoặc ngồi xuống.",
        coordinates: { x: 30, y: 45 },
        severity: "HIGH",
        mechanism: "Mất điểm trợ lực nâng trọng tâm cơ thể (Absence of Armrest Support)",
      },
      {
        id: "spot-2",
        number: 2,
        title: "Chân ghế trơn thiếu nút đệm cao su",
        description: "Đầu mút chân ghế tiếp xúc trực tiếp sàn trơn bóng, dễ bị đẩy lùi về sau khi người ngồi ngả người.",
        coordinates: { x: 50, y: 88 },
        severity: "HIGH",
        mechanism: "Trượt lùi ghế khi tiếp xúc ngồi (Chair Push-back Instability)",
      },
      {
        id: "spot-3",
        number: 3,
        title: "Chiều cao mặt ghế chưa đạt chuẩn công thái học",
        description: "Mặt ghế quá thấp (<42cm) hoặc quá êm lún khiến đầu gối gập quá góc 90 độ.",
        coordinates: { x: 50, y: 58 },
        severity: "MEDIUM",
        mechanism: "Quá tải cơ khớp thoái hóa khi đứng dậy (Knee Joint Overload)",
      },
    ],
    remediation: [
      {
        id: "rem-1",
        step: "Bọc nút cao su chống trượt vào cả 4 chân ghế để tăng ma sát với sàn nhà.",
        priority: "IMMEDIATE",
        costEstimate: "25.000 - 40.000 VNĐ",
        materialsNeeded: "Bộ đệm cao su chụp chân ghế",
        timeEstimate: "5 phút",
      },
      {
        id: "rem-2",
        step: "Ưu tiên trang bị ghế có tay vịn chắc chắn và chiều cao mặt ngồi đạt từ 45 - 48 cm.",
        priority: "PREVENTIVE",
        costEstimate: "250.000 - 600.000 VNĐ",
        materialsNeeded: "Ghế công thái học có tay vịn cho người cao tuổi",
        timeEstimate: "1 ngày",
      },
    ],
    citations: [
      {
        citationId: "cit-chair-who",
        citationNumber: 1,
        documentId: "doc-who-chair",
        chunkId: "chunk-who-chair-1",
        publisher: "WHO Guidelines",
        documentTitle: "Falls Prevention: Assistive Devices and Furniture Standards",
        sectionTitle: "Seating Ergonomics for Older Adults",
        pageNumber: 19,
        supportingExcerpt:
          "Chairs should have rigid armrests extending to the front edge and a firm seat height of 45-48 cm to ensure safe transitions.",
        officialUrl: "https://www.who.int/publications/i/item/9789241563536",
      },
    ],
  },

  threshold_step: {
    itemName: "Bậc tam cấp / Gờ cửa chuyển phòng cao không vát",
    itemCategory: "threshold_step",
    riskScore: 89,
    severity: "CRITICAL",
    severityLabel: "CỰC KỲ NGUY HIỂM (89/100)",
    urgencyLevel: "KHẨN CẤP",
    whyDangerous: {
      summary:
        "Gờ cửa chuyển phòng (đặc biệt là cửa vào nhà vệ sinh hoặc ban công) cao hơn 1.5cm là thủ phạm gây ra các ca chấn thương té ngã nặng nề nhất do chênh lệch độ cao đột ngột.",
      biomechanicalRationale:
        "Khi di chuyển trong nhà, não bộ người cao tuổi thường tự động ước lượng mặt sàn là mặt phẳng liên tục. Khi gặp gờ cửa chênh cao mà không có sự cảnh báo thị giác, chân sau sẽ vấp thẳng vào gờ cứng trong khi chân trước chưa kịp hạ cánh vững chắc, dẫn đến cú ngã bay về phía trước.",
      clinicalReference:
        "WHO Environmental Safety & ADA Standards for Accessible Design.",
      consequenceRisk:
        "Gãy xương đùi, chấn thương hàm mặt, dập lồng ngực do va đập vào cánh cửa.",
    },
    whereDangerous: [
      {
        id: "spot-1",
        number: 1,
        title: "Gờ bậc cao vuông góc > 1.5 cm không vát",
        description: "Mép gờ bậc sắc nhọn vuông góc, tạo thành chướng ngại chặn đứng bước chân.",
        coordinates: { x: 50, y: 70 },
        severity: "CRITICAL",
        mechanism: "Va chạm ngón chân trực diện (Perpendicular Edge Impact)",
      },
      {
        id: "spot-2",
        number: 2,
        title: "Thiếu vạch dán phản quang tương phản",
        description: "Màu gờ cùng màu với sàn gạch, rất khó nhìn thấy trong điều kiện ban đêm hoặc mắt kém.",
        coordinates: { x: 25, y: 70 },
        severity: "HIGH",
        mechanism: "Ảo giác mặt phẳng liên tục (Visual Elevation Illusion)",
      },
      {
        id: "spot-3",
        number: 3,
        title: "Khu vực tiếp giáp dễ đọng nước trơn trượt",
        description: "Ngay sát cửa nhà tắm, nước văng làm giảm mạnh ma sát tại điểm tiếp đất sau bước vượt.",
        coordinates: { x: 75, y: 70 },
        severity: "HIGH",
        mechanism: "Trượt chân tiếp đất sau bước chân (Post-step Slip)",
      },
    ],
    remediation: [
      {
        id: "rem-1",
        step: "Lắp nẹp dốc thoai thoải bằng cao su hoặc nhôm vát cạnh (Threshold Ramp) giảm chênh cốt sàn.",
        priority: "IMMEDIATE",
        costEstimate: "65.000 - 150.000 VNĐ",
        materialsNeeded: "Thanh nẹp dốc cao su vát viền",
        timeEstimate: "15 phút",
      },
      {
        id: "rem-2",
        step: "Dán dải decal phản quang màu vàng-đen tương phản nổi bật ngay trên mép gờ bậc.",
        priority: "IMMEDIATE",
        costEstimate: "25.000 VNĐ",
        materialsNeeded: "Băng keo dán sàn phản quang chống trượt",
        timeEstimate: "5 phút",
      },
    ],
    citations: [
      {
        citationId: "cit-ada-threshold",
        citationNumber: 1,
        documentId: "doc-ada-threshold",
        chunkId: "chunk-ada-threshold-1",
        publisher: "CDC & ADA Standards",
        documentTitle: "Home Modifications to Prevent Falls",
        sectionTitle: "Thresholds and Level Changes",
        pageNumber: 8,
        supportingExcerpt:
          "Thresholds should not exceed 1/2 inch (13 mm) in height and must have beveled edges with high color contrast.",
        officialUrl: "https://www.cdc.gov/steadi/materials.html",
      },
    ],
  },

  table: {
    itemName: "Bàn học / Bàn làm việc góc nhọn chân sắt",
    itemCategory: "table",
    riskScore: 72,
    severity: "HIGH",
    severityLabel: "NGUY CƠ CAO (72/100)",
    urgencyLevel: "ƯU TIÊN CAO",
    whyDangerous: {
      summary:
        "Bàn làm việc hoặc bàn ăn có các góc vuông 90° sắc nhọn nhô ra hành lang di chuyển và chân kim loại thanh mảnh dễ trơn trượt trên sàn gạch men khi người cao tuổi tỳ vịn đứng dậy.",
      biomechanicalRationale:
        "Da và mao mạch người cao tuổi rất mỏng manh do lão hóa biểu mô. Một cú va đập vào góc bàn 90 độ sẽ tập trung toàn bộ động năng tại một điểm hẹp (Focal Impact), gây rách da sâu, tụ máu cơ hông hoặc gãy xương sườn nếu ngã đập mạn sườn. Ngoài ra, chân bàn sắt không có giác hút cao su dễ bị trượt văng khi người già mất thăng bằng cố bám vào mép bàn.",
      clinicalReference:
        "Bộ Y tế Việt Nam - Hướng dẫn Chăm sóc Dự phòng Chấn thương Người Cao Tuổi & CDC STEADI.",
      consequenceRisk:
        "Chấn thương phần mềm đụng giập, toác da mạn sườn, vỡ xương bánh chè và trượt ngã do điểm tựa không vững.",
    },
    whereDangerous: [
      {
        id: "spot-1",
        number: 1,
        title: "Góc bàn vuông 90° sắc nhọn (Mép trước trái)",
        description:
          "Góc bàn nhô thẳng ra luồng di chuyển, tiềm ẩn nguy cơ chấn thương đụng giập hoặc rách da sâu khi người già ngã va quẹt.",
        coordinates: { x: 9, y: 41 },
        severity: "HIGH",
        mechanism: "Tập trung áp lực va đập tại góc nhọn (Focal Blunt Impact)",
      },
      {
        id: "spot-2",
        number: 2,
        title: "Mép bàn cạnh ngoài nhô vào lối đi (Mép trước phải)",
        description:
          "Mép bàn góc phải chiếm khoảng không gian bước chân, làm thu hẹp khoảng cách an toàn khi người già xoay trở.",
        coordinates: { x: 44, y: 43 },
        severity: "MEDIUM",
        mechanism: "Thu hẹp luồng di chuyển an toàn (<80cm)",
      },
      {
        id: "spot-3",
        number: 3,
        title: "Thanh giằng chéo & cơ chế gấp dưới gầm bàn",
        description:
          "Thanh giằng sắt đan chéo dưới gầm dễ móc vào mũi chân khi bước ngắn hoặc làm kẹt đầu gậy chống / khung tập đi.",
        coordinates: { x: 23, y: 56 },
        severity: "HIGH",
        mechanism: "Mắc kẹt ngón chân hoặc thiết bị trợ khí (Mobility Aid Jamming)",
      },
      {
        id: "spot-4",
        number: 4,
        title: "Đế chân sắt tiếp xúc sàn thiếu đệm chống trượt",
        description:
          "Chân sắt dạng ống tròn dễ trượt xê dịch trên nền gạch men khi người cao tuổi tỳ tay vịn để lấy lực đứng dậy.",
        coordinates: { x: 35, y: 73 },
        severity: "HIGH",
        mechanism: "Trượt lùi bất ổn khi tỳ vịn (Support Instability)",
      },
    ],
    remediation: [
      {
        id: "rem-1",
        step: "Dán miếng đệm silicon bo tròn góc bàn (Corner Guards) để tiêu biến điểm nhọn 90 độ nguy hiểm.",
        priority: "IMMEDIATE",
        costEstimate: "20.000 - 35.000 VNĐ",
        materialsNeeded: "Bộ 4 miếng đệm góc bàn silicon chống va đập",
        timeEstimate: "5 phút",
      },
      {
        id: "rem-2",
        step: "Lắp nút bọc cao su chống trượt cho cả 4 chân bàn để tăng độ ma sát trên sàn gạch men.",
        priority: "IMMEDIATE",
        costEstimate: "25.000 - 40.000 VNĐ",
        materialsNeeded: "Nút cao su chụp chân bàn kim loại",
        timeEstimate: "5 phút",
      },
      {
        id: "rem-3",
        step: "Dịch chuyển bàn áp sát tường để duy trì hành lang di chuyển tối thiểu rộng ≥ 80cm theo chuẩn CDC.",
        priority: "IMMEDIATE",
        costEstimate: "0 VNĐ",
        materialsNeeded: "Không cần",
        timeEstimate: "2 phút",
      },
    ],
    citations: [
      {
        citationId: "cit-bytvn-table",
        citationNumber: 1,
        documentId: "doc-bytvn-table",
        chunkId: "chunk-bytvn-table-1",
        publisher: "Bộ Y tế Việt Nam",
        documentTitle: "Hướng dẫn quốc gia về dự phòng té ngã ở người cao tuổi",
        sectionTitle: "Sắp xếp nội thất và vật cản trong nhà",
        pageNumber: 12,
        supportingExcerpt:
          "Loại bỏ các đồ nội thất có góc cạnh sắc nhọn trên lối đi hoặc sử dụng nẹp bọc bảo vệ; đảm bảo lối đi thông thoáng tối thiểu 80cm.",
        officialUrl: "https://moh.gov.vn",
      },
    ],
  },
};

/**
 * Intelligent multimodal item fall hazard assessment.
 * Evaluates risk score (0-100), clinical rationale, pinpointed danger spots, and remediation.
 */
export class ItemAssessmentUnavailableError extends Error {
  public readonly code = "PROVIDER_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "ItemAssessmentUnavailableError";
  }
}

export async function analyzeItemHazardFromImage(
  imageBuffer: Buffer,
  fileName: string,
  mimeType: string = "image/jpeg",
  itemHint?: string
): Promise<ItemHazardAssessment> {
  const apiKey = process.env.GEMINI_API_KEY;
  const imageBase64 = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
  const now = new Date().toISOString();
  const assessmentId = `item-eval-${Date.now()}`;

  // If Gemini API is available, try calling multimodal Gemini
  if (apiKey) {
    try {
      // Dynamic function import to ensure Node-only execution and bypass Webpack client bundling
      const loadGenAI = new Function('return import("@google/genai")');
      const { GoogleGenAI } = await loadGenAI();
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Bạn là chuyên gia thẩm định rủi ro an toàn té ngã cho người cao tuổi của hệ thống SafeHome 3D AI (dựa trên hướng dẫn y tế CDC STEADI và WHO).
Phân tích bức ảnh vật dụng nội thất/gia dụng này và trả lời CHÍNH XÁC theo 3 câu hỏi sau bằng tiếng Việt:

1. MỨC ĐỘ NGUY HIỂM BAO NHIÊU?
- riskScore: Điểm rủi ro từ 0 đến 100 (Ví dụ: 85)
- severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
- severityLabel: Nhãn hiển thị kèm điểm số (Ví dụ: "NGUY CƠ CAO (85/100)")
- urgencyLevel: "KHẨN CẤP" | "ƯU TIÊN CAO" | "CẦN LƯU Ý" | "AN TOÀN"

2. TẠI SAO NGUY HIỂM?
- summary: Tóm tắt nguyên nhân nguy hiểm của vật dụng này đối với người cao tuổi.
- biomechanicalRationale: Giải thích cơ chế y khoa, thăng bằng, dáng đi người già (shuffling gait), phản xạ bảo vệ, góc khớp.
- clinicalReference: Dẫn chiếu tiêu chuẩn y khoa CDC STEADI / WHO / Bộ Y tế.
- consequenceRisk: Nguy cơ chấn thương thực thể cụ thể (gãy cổ xương đùi, chấn thương sọ não, xuất huyết...).

3. NGUY HIỂM Ở CHỖ NÀO? (Chỉ ra ít nhất 2-4 điểm rủi ro cụ thể trên bức ảnh)
Với mỗi điểm rủi ro (whereDangerous):
- id: spot-1, spot-2...
- number: 1, 2...
- title: Tên vị trí rủi ro (ví dụ: "Mép thảm quăn vênh", "Đế trơn trượt", "Dây võng vướng chân")
- description: Mô tả cụ thể tại sao vị trí đó trên ảnh gây nguy hiểm.
- coordinates: { x: number, y: number } (tọa độ tỷ lệ % từ 0 đến 100 trên ảnh)
- severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
- mechanism: Cơ chế gây vấp ngã hoặc trượt ngã tại điểm đó.

4. BIỆN PHÁP KHẮC PHỤC & CHI PHÍ:
- remediation: Danh sách các bước can thiệp (step, priority, costEstimate, materialsNeeded, timeEstimate).

Trả về định dạng JSON thuần túy, không có markdown formatting hay backticks:
{
  "itemName": "Tên vật dụng nhận diện được",
  "itemCategory": "rug" | "electrical_cable" | "chair" | "table" | "bed" | "footwear" | "threshold_step" | "bathroom_fixture" | "clutter" | "other",
  "riskScore": 85,
  "severity": "HIGH",
  "severityLabel": "NGUY CƠ CAO (85/100)",
  "urgencyLevel": "KHẨN CẤP",
  "whyDangerous": {
    "summary": "...",
    "biomechanicalRationale": "...",
    "clinicalReference": "...",
    "consequenceRisk": "..."
  },
  "whereDangerous": [
    {
      "id": "spot-1",
      "number": 1,
      "title": "...",
      "description": "...",
      "coordinates": { "x": 30, "y": 70 },
      "severity": "HIGH",
      "mechanism": "..."
    }
  ],
  "remediation": [
    {
      "id": "rem-1",
      "step": "...",
      "priority": "IMMEDIATE",
      "costEstimate": "45.000 VNĐ",
      "materialsNeeded": "...",
      "timeEstimate": "5 phút"
    }
  ]
}`;

      const modelCandidates = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"];
      for (const model of modelCandidates) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType,
                      data: imageBuffer.toString("base64"),
                    },
                  },
                ],
              },
            ],
          });

          const rawText = response.text || "";
          const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
          const parsed = JSON.parse(cleaned);

          return {
            id: assessmentId,
            canonicalRuleId: getCanonicalRuleForItemCategory(parsed.itemCategory || "other"),
            itemName: parsed.itemName || "Vật dụng được thẩm định",
            itemCategory: parsed.itemCategory || "other",
            riskScore: typeof parsed.riskScore === "number" ? parsed.riskScore : 80,
            severity: parsed.severity || "HIGH",
            severityLabel: parsed.severityLabel || `NGUY CƠ CAO (${parsed.riskScore || 80}/100)`,
            urgencyLevel: parsed.urgencyLevel || "KHẨN CẤP",
            whyDangerous: parsed.whyDangerous || {
              summary: "Vật dụng tiềm ẩn nguy cơ gây vấp ngã hoặc trơn trượt theo CDC STEADI.",
              biomechanicalRationale: "Làm mất thăng bằng đột ngột khi người cao tuổi di chuyển qua.",
              clinicalReference: "CDC STEADI (2019) & WHO Fall Prevention Guidelines.",
              consequenceRisk: "Nguy cơ té ngã gây chấn thương phần mềm và gãy xương.",
            },
            whereDangerous: Array.isArray(parsed.whereDangerous) ? parsed.whereDangerous : [],
            remediation: Array.isArray(parsed.remediation) ? parsed.remediation : [],
            citations: [
              {
                citationId: "gemini-cit-steadi",
                citationNumber: 1,
                documentId: "doc-cdc-steadi-algo",
                chunkId: "chunk-cdc-steadi-algo-1",
                publisher: "CDC STEADI",
                documentTitle: "Algorithm for Fall Risk Assessment and Interventions",
                sectionTitle: "Environmental Fall Risk Mitigation",
                pageNumber: 3,
                supportingExcerpt:
                  "Identification and immediate removal of physical trip/slip hazards in living spaces prevents up to 35% of fatal home falls.",
                officialUrl: "https://www.cdc.gov/steadi/materials.html",
              },
            ],
            imageUrl: imageBase64,
            analyzedAt: now,
            modelProvider: `Gemini Multimodal VLM (${model})`,
          };
        } catch (mErr) {
          console.warn(`Model ${model} failed in item assessment:`, mErr);
        }
      }
    } catch (apiErr) {
      console.warn("Gemini API call failed, using heuristic fall intelligence:", apiErr);
    }
  }

  // No Gemini result. Never invent a score/template from filename or hint (CONTEXT.md: "chưa xác định").
  throw new ItemAssessmentUnavailableError(
    apiKey
      ? "Chưa xác định: dịch vụ AI không phản hồi hoặc trả kết quả không dùng được. Vui lòng thử lại sau hoặc dùng checklist thủ công."
      : "Chưa xác định: dịch vụ AI chưa được cấu hình trên máy chủ, nên không thể thẩm định ảnh. Vui lòng dùng checklist thủ công."
  );
}

/**
 * DEMO only: returns a fixed example for an explicit preset category. Never derived from a
 * user photo, never calls Gemini, always flagged `demo: true`.
 */
export function getDemoItemAssessment(category: string): ItemHazardAssessment | null {
  if (!Object.hasOwn(HEURISTIC_KNOWLEDGE, category)) return null;
  const base = HEURISTIC_KNOWLEDGE[category];
  return {
    id: `item-demo-${category}-${Date.now()}`,
    canonicalRuleId: getCanonicalRuleForItemCategory(base.itemCategory || category),
    ...base,
    imageUrl: "",
    analyzedAt: new Date().toISOString(),
    modelProvider: "DEMO — ví dụ minh họa cố định, không phải kết quả phân tích ảnh của bạn",
    demo: true,
  };
}

/**
 * Pre-defined sample items for quick evaluation in the UI.
 */
export const SAMPLE_ITEM_PRESETS = [
  {
    id: "sample-rug",
    title: "Thảm trải sàn nỉ phòng khách",
    subtitle: "Mép thảm cong vênh & đế không bám",
    category: "rug",
    suggestedQuery: "Thẩm định độ an toàn của thảm trải sàn này đối với người cao tuổi",
    mockImage: "/samples/rug-hazard.jpg",
  },
  {
    id: "sample-cable",
    title: "Dây điện quạt & ổ cắm vắt ngang lối đi",
    subtitle: "Chướng ngại vật vấp ngã khẩn cấp",
    category: "electrical_cable",
    suggestedQuery: "Tại sao dây điện vắt ngang sàn lại nguy hiểm cho người già?",
    mockImage: "/samples/cable-hazard.jpg",
  },
  {
    id: "sample-chair",
    title: "Ghế đôn gỗ không có tay vịn",
    subtitle: "Khó khăn khi đứng lên & dễ trượt lùi",
    category: "chair",
    suggestedQuery: "Đánh giá nguy cơ ngã khi người cao tuổi dùng ghế đôn không tay vịn",
    mockImage: "/samples/chair-hazard.jpg",
  },
  {
    id: "sample-threshold",
    title: "Gờ bậc cửa nhà vệ sinh cao 2.5cm",
    subtitle: "Chênh lệch cao độ & trơn ướt",
    category: "threshold_step",
    suggestedQuery: "Đánh giá mức độ nguy hiểm của gờ bậc cửa nhà vệ sinh",
    mockImage: "/samples/threshold-hazard.jpg",
  },
  {
    id: "sample-table",
    title: "Bàn trà mặt kính góc nhọn",
    subtitle: "Chắn luồng đi lại & nguy cơ va đập",
    category: "table",
    suggestedQuery: "Khắc phục góc bàn nhọn trên lối đi như thế nào?",
    mockImage: "/samples/table-hazard.jpg",
  },
];
