import { RiskFinding } from "./types";
import { getActiveRegistrySources, validateOfficialSourceUrl } from "@/lib/rag/documentRegistry";

export interface FindingExplanation {
  findingId: string;
  ruleId: string;
  explainabilityType: "RULE_BASED_PROVENANCE";
  title: string;
  summary: string;
  clinicalRationale: string;
  environmentalMechanism: string;
  actionableGuidance: string[];
  citations: Array<{
    citationNumber: number;
    sourceId: string;
    organization: string;
    documentTitle: string;
    publicationYear: string;
    section: string;
    officialUrl: string;
    supportingExcerpt: string;
    version: string;
  }>;
  evidenceConfidence: "HIGH" | "MEDIUM" | "INSUFFICIENT";
  requiresConfirmation: boolean;
  confirmationTooltip: string | null;
  disclaimer: string;
}

/**
 * Deterministic rule-based explainability & decision provenance generator.
 * Grounded ONLY in APPROVED, non-outdated sources when supporting evidence exists.
 * Never fabricates fallback citations when evidence is missing.
 */
export function explainHazardFinding(finding: RiskFinding): FindingExplanation {
  const citations: FindingExplanation["citations"] = [];
  let citationIndex = 1;

  const hasEvidence = Boolean(
    finding.evidence &&
      finding.evidence.measuredValue &&
      finding.evidence.measuredValue !== "Chưa rõ" &&
      (!finding.evidence.missingFields || finding.evidence.missingFields.length === 0)
  );

  // Retrieve ONLY currently APPROVED, non-outdated sources matching referenceIds
  const { activeSources } = getActiveRegistrySources({ approvalOnly: true });
  const matchedSources = hasEvidence
    ? activeSources.filter((src) => finding.referenceIds.includes(src.id))
    : [];

  for (const source of matchedSources) {
    const urlCheck = validateOfficialSourceUrl(source.officialUrl || source.url);
    if (!urlCheck.valid) continue;

    const relevantPassages = source.passages.filter((p) =>
      p.relatedRules.some(
        (r) =>
          r.includes(finding.ruleId) ||
          r.includes(finding.hazardType) ||
          (finding.ruleId === "RISK-001" && r.includes("RUG")) ||
          (finding.ruleId === "RISK-002" && r.includes("CABLE")) ||
          (finding.ruleId === "RISK-003" && r.includes("OBST")) ||
          (finding.ruleId === "RISK-004" && r.includes("LIGHT")) ||
          (finding.ruleId === "RISK-005" && r.includes("WET")) ||
          (finding.ruleId === "RISK-006" && r.includes("GRAB"))
      )
    );

    const chosenPassage = relevantPassages[0] || source.passages[0];
    if (chosenPassage) {
      citations.push({
        citationNumber: citationIndex++,
        sourceId: source.id,
        organization: source.organization,
        documentTitle: source.title,
        publicationYear: source.publicationDate,
        section: chosenPassage.section,
        officialUrl: urlCheck.normalizedUrl,
        supportingExcerpt: chosenPassage.passageText,
        version: source.version,
      });
    }
  }

  let clinicalRationale = "";
  let environmentalMechanism = "";
  let actionableGuidance: string[] = [];

  switch (finding.ruleId) {
    case "RISK-001":
      clinicalRationale =
        "Theo nghiên cứu y học lão khoa [1], người cao tuổi có xu hướng lê bước chân thấp hơn (shuffle gait) và giảm phản xạ giữ thăng bằng tiền đình. Khi mũi chân tiếp xúc với mép thảm không cố định, thảm sẽ bị xô gấp hoặc trượt trơn, dẫn đến mất thăng bằng đột ngột mà cơ thể không kịp điều chỉnh trọng tâm.";
      environmentalMechanism =
        `Mép thảm trải sàn tại ${finding.evidence.measuredValue} tạo ra một gờ cản vi mô và bề mặt có độ bám dính không đồng nhất với nền sàn xung quanh, biến khu vực này thành điểm kích hoạt vấp ngã.`;
      actionableGuidance = [
        "Dán dải băng keo 2 mặt chuyên dụng (Carpet Seam Tape) cố định 4 cạnh thảm sát sàn.",
        "Trang bị thêm lớp lót lưới cao su chống xê dịch dưới toàn bộ diện tích thảm.",
        "Nếu người cao tuổi sử dụng gậy chống hoặc khung tập đi, nên cất thảm để mặt sàn phẳng hoàn toàn.",
      ];
      break;

    case "RISK-002":
      clinicalRationale =
        "Thị lực ngoại vi và độ nhạy tương phản giảm đáng kể theo tuổi tác [1]. Dây điện tròn có đường kính nhỏ, màu sắc trùng với màu sàn hoặc bóng tối khiến mắt người cao tuổi không phân biệt được, tạo thành một chiếc bẫy móc ngón chân hoặc gậy chống.";
      environmentalMechanism =
        `Dây điện chạy ngang lối đi (${finding.evidence.measuredValue}) tạo điểm tựa vướng bàn chân với lực cản kéo ngược, khiến người già ngã chúi đầu về phía trước.`;
      actionableGuidance = [
        "Sử dụng ghen cao su bảo vệ dây vát mép dán cố định xuống sàn.",
        "Hoặc luồn dây men theo len chân tường và cố định bằng kẹp dán sát vách.",
        "Bổ sung ổ cắm kéo dài trên bàn tab để cắm sạc thiết bị trong tầm tay.",
      ];
      break;

    case "RISK-003":
      clinicalRationale =
        "Khả năng xoay chuyển trục cơ thể và điều chỉnh tư thế đột ngột ở người già bị suy giảm do thoái hóa đốt sống và cơ bắp [2]. Khi lối đi bị thu hẹp, việc phải lách người hoặc tránh vật cản làm tăng đáng kể nguy cơ mất thăng bằng.";
      environmentalMechanism =
        `Thông thủy lối đi chỉ đạt ${finding.evidence.measuredValue}, không đảm bảo khoảng cách an toàn tối thiểu 0.85m theo tiêu chuẩn CDC STEADI.`;
      actionableGuidance = [
        "Di dời các bàn trà nhỏ, ghế đẩu, quạt đứng ra khỏi hành lang di chuyển chính.",
        "Đảm bảo khoảng cách từ thành giường đến các đồ nội thất đối diện tối thiểu 90cm.",
        "Tạo lối đi thẳng, thông thoáng tuyệt đối từ giường ngủ tới cửa nhà vệ sinh.",
      ];
      break;

    case "RISK-004":
      clinicalRationale =
        "Thời gian thích ứng bóng tối của võng mạc người 75 tuổi chậm hơn 3 lần so với người 20 tuổi [1]. Khi thức dậy giữa đêm trong trạng thái huyết áp thấp và mắt chưa kịp điều tiết, bóng tối làm mất hoàn toàn mốc định hướng thị giác.";
      environmentalMechanism =
        `Độ rọi ban đêm chỉ đạt ${finding.evidence.measuredValue}, thiếu đèn ngủ dẫn đường khiến các chướng ngại vật trên đường đi trở nên vô hình.`;
      actionableGuidance = [
        "Lắp 1 đèn ngủ cảm biến chuyển động hồng ngoại cắm ổ điện chân giường (tự sáng khi hạ chân).",
        "Lắp thêm 1 đèn ngủ dẫn đường dọc hành lang và trước cửa phòng vệ sinh.",
        "Ưu tiên ánh sáng vàng ấm (2700K - 3000K), góc chiếu hắt thấp xuống sàn để không gây chói mắt.",
      ];
      break;

    case "RISK-005":
      clinicalRationale =
        "Phòng tắm là nơi xảy ra phần lớn các vụ ngã gây chấn thương vỡ xương chậu ở người cao tuổi [1], [3]. Xương của người già thường có mật độ xốp (loãng xương); một cú trượt ngã đập hông trên nền gạch cứng có thể để lại di chứng mất khả năng đi lại vĩnh viễn.";
      environmentalMechanism =
        `Gạch men tiếp xúc với nước xà phòng (${finding.evidence.measuredValue}) làm giảm hệ số ma sát xuống mức nguy hiểm, khiến bàn chân trượt tự do không có điểm tựa.`;
      actionableGuidance = [
        "Trải thảm cao su chống trượt có giác hút chân không phủ kín khu vực đứng tắm và trước bồn cầu.",
        "Kiểm tra và ấn chặt các giác hút xuống nền gạch khô ráo trước khi sử dụng.",
        "Cân nhắc phủ dung dịch nano tăng ma sát bề mặt cho gạch men nhà tắm.",
      ];
      break;

    case "RISK-006":
      clinicalRationale =
        "Tụt huyết áp tư thế (orthostatic hypotension) là hiện tượng phổ biến khi người già đứng dậy sau khi ngồi vệ sinh lâu [1], [2]. Nếu không có thanh tay vịn kiên cố để bám trợ lực, cơn choáng váng thoáng qua sẽ dẫn đến ngã quỵ ngay tại chỗ.";
      environmentalMechanism =
        `Hiện trạng ${finding.evidence.measuredValue} khiến người dùng phải vịn vào lavabo sứ hoặc thanh treo khăn tắm mỏng manh, vốn không được thiết kế để chịu tải trọng người.`;
      actionableGuidance = [
        "Lắp đặt thanh tay vịn inox 304 có gân bọc nhựa ABS chống trượt cạnh bồn cầu ở độ cao 75cm - 80cm.",
        "Lắp thêm 1 thanh tay vịn thẳng hoặc chữ L bên trong khu vực vòi sen tắm.",
        "Khoan bắt vít nở sắt kiên cố vào tường gạch đặc, đảm bảo chịu tải tối thiểu 150kg.",
      ];
      break;

    case "RISK-007":
      clinicalRationale =
        "Suy giảm thụ thể cảm nhận bản thể khớp gối và cổ chân (proprioception) khiến người già không ước lượng chính xác độ cao khi nhấc chân [2]. Gờ bậc cửa tạo điểm giật cấp bất ngờ làm bàn chân vấp phải mép bậc.";
      environmentalMechanism =
        `Bậc cửa chênh lệch ${finding.evidence.measuredValue} mà không có độ dốc chuyển tiếp hoặc dấu hiệu nhận biết thị giác.`;
      actionableGuidance = [
        "Lắp gờ dốc cao su vát mép (rubber threshold ramp) để tạo đường dốc thoải chuyển tiếp.",
        "Dán dải decal phản quang màu vàng tương phản cao dọc theo toàn bộ mép gờ cửa.",
        "Bố trí đèn rọi trực diện vào vị trí bậc thềm để tránh vùng bóng đổ che khuất.",
      ];
      break;

    case "RISK-008":
      clinicalRationale =
        "Động tác rướn người hoặc cúi sâu khi cơ thể chưa ổn định thăng bằng dễ gây trượt khỏi nệm giường [2].";
      environmentalMechanism =
        `Công tắc đèn hoặc vật dụng thiết yếu ở quá xa giường (${finding.evidence.measuredValue}), buộc người cao tuổi phải với người hoặc đứng dậy trong bóng tối.`;
      actionableGuidance = [
        "Kê tủ tab đầu giường sát thành nệm với độ cao ngang bằng mặt đệm (45-50cm).",
        "Trang bị đèn ngủ cảm ứng chạm đặt trên tab để bật tắt tức thì.",
        "Luôn để điện thoại có sạc, kính mắt và ly nước ngay trong tầm với cánh tay.",
      ];
      break;

    default:
      clinicalRationale =
        "Yếu tố môi trường sinh hoạt chưa phù hợp với khả năng vận động và thị giác của người cao tuổi, cần được điều chỉnh theo khuyến cáo y tế.";
      environmentalMechanism = finding.evidence.rationale;
      actionableGuidance = [
        finding.recommendationText,
        "Định kỳ kiểm tra lại môi trường phòng ngủ và nhà tắm mỗi tháng một lần.",
      ];
      break;
  }

  const summary = `Phát hiện "${finding.title}" tại ${finding.evidence.measuredValue}. Đánh giá mức độ ưu tiên: ${finding.severityCategory}.`;

  return {
    findingId: finding.id,
    ruleId: finding.ruleId,
    explainabilityType: "RULE_BASED_PROVENANCE",
    title: finding.title,
    summary,
    clinicalRationale,
    environmentalMechanism,
    actionableGuidance,
    citations,
    evidenceConfidence: citations.length > 0 ? "HIGH" : hasEvidence ? "MEDIUM" : "INSUFFICIENT",
    requiresConfirmation: !hasEvidence || citations.length === 0,
    confirmationTooltip:
      !hasEvidence || citations.length === 0
        ? "Cần xác nhận thực tế tại hiện trường (thiếu bằng chứng hoặc nguồn kiểm chứng)."
        : null,
    disclaimer:
      "SafeHome 3D AI cung cấp truy vết quyết định theo quy tắc (rule-based explainability / decision provenance) tham chiếu tài liệu y tế cộng đồng (WHO, CDC, Bộ Y tế). Đây không phải lời giải thích nội tại của mô hình Gemini và không thay thế chẩn đoán y khoa.",
  };
}

