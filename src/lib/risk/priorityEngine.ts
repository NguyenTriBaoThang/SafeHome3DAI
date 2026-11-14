import { FindingPriority, RuleEvaluationState } from "./types";

export interface PriorityPolicyRule {
  priority: FindingPriority;
  vietnameseLabel: string;
  badgeColor: string;
  description: string;
  criteria: string[];
}

export const PRIORITY_POLICIES: Record<FindingPriority, PriorityPolicyRule> = {
  HIGH: {
    priority: "HIGH",
    vietnameseLabel: "Cần ưu tiên kiểm tra (Khẩn thiết)",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    description: "Các yếu tố nguy cơ có tương quan cao nhất với té ngã nghiêm trọng, gãy xương chậu hoặc chấn thương sọ não.",
    criteria: [
      "Sàn nhà vệ sinh ướt trơn trượt không có thảm cao su giác hút hoặc xử lý chống trơn (RISK-005)",
      "Nhà vệ sinh hoàn toàn không có thanh tay vịn chịu lực trợ lực khi đứng lên từ bồn cầu hoặc tắm (RISK-006)",
      "Dây điện hoặc cáp sạc vắt ngang lối đi lại chính trong đêm (RISK-002)",
      "Thảm trải sàn lỏng lẻo nằm trên lối đi chính từ giường đến cửa/nhà vệ sinh (RISK-001)",
      "Hành lang di chuyển bị thắt hẹp dưới 0.70m hoặc bậc thềm cửa chênh lệch trên 3.5cm (RISK-003, RISK-007)",
      "Không có ánh sáng hoặc đèn ngủ dẫn đường trên tuyến di chuyển ban đêm (RISK-004)",
    ],
  },
  MEDIUM: {
    priority: "MEDIUM",
    vietnameseLabel: "Nên xem xét cải thiện",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    description: "Các yếu tố làm tăng tải trọng vận động, cản trở thao tác hoặc tiềm ẩn nguy cơ té ngã khi người cao tuổi mệt mỏi.",
    criteria: [
      "Nhà vệ sinh mới có 1 thanh tay vịn, còn thiếu ở vị trí tắm hoặc bồn cầu (RISK-006)",
      "Gờ bậc cửa chênh lệch từ 1.5cm đến 3.5cm chưa có dốc vát mép (RISK-007)",
      "Công tắc đèn hoặc vật dụng thiết yếu ngoài tầm với cánh tay từ giường (RISK-008)",
      "Lối đi bị thu hẹp từ 0.70m đến 0.85m do đồ đạc phụ (RISK-003)",
      "Thảm chưa cố định mép nhưng nằm ở góc phòng ít bước qua (RISK-001)",
    ],
  },
  LOW: {
    priority: "LOW",
    vietnameseLabel: "Theo dõi hoặc cải thiện khi phù hợp",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    description: "Các yếu tố nguy cơ thứ yếu, có thể duy trì theo dõi và khắc phục khi sắp xếp lại đồ đạc tiện nghi.",
    criteria: [
      "Đồ dùng sắp xếp chưa tối ưu nhưng không lấn chiếm lối đi",
      "Vật dụng trong phòng có góc cạnh nhẹ có thể bọc mút đệm khi có điều kiện",
      "Ánh sáng ban ngày đầy đủ, chỉ cần chú ý thay bóng đèn khi suy giảm độ sáng",
    ],
  },
  UNKNOWN: {
    priority: "UNKNOWN",
    vietnameseLabel: "Cần bổ sung thông tin khảo sát",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    description: "Dữ liệu hiện trường chưa đủ để kết luận chắc chắn. Hệ thống không đoán mò và khuyến nghị kiểm tra thêm.",
    criteria: [
      "Chưa đo đạc khoảng thông thủy hoặc chiều cao gờ bậc cửa",
      "Người khảo sát chọn 'Chưa rõ / Không biết' cho câu hỏi thảm trải sàn hoặc dây điện",
      "Ảnh hiện trường mờ hoặc chưa bao quát đủ các góc phòng",
    ],
  },
};

/**
 * Explains the priority decision in Vietnamese.
 */
export function explainPriorityDecision(
  ruleId: string,
  state: RuleEvaluationState,
  priority: FindingPriority
): string {
  if (state === "NEEDS_VERIFICATION") {
    return "Xếp loại [Cần bổ sung thông tin] do hồ sơ khảo sát chưa thu thập đủ số đo hoặc trạng thái của yếu tố môi trường này.";
  }
  if (state === "NOT_DETECTED") {
    return "Xếp loại [An toàn / Đã đạt chuẩn], không kích hoạt cảnh báo nguy cơ.";
  }
  if (state === "NOT_APPLICABLE") {
    return "Quy tắc không áp dụng cho loại phòng này.";
  }

  switch (ruleId) {
    case "RISK-001":
      return priority === "HIGH"
        ? "Ưu tiên CAO vì thảm lỏng lẻo nằm trực tiếp trên luồng di chuyển chính cạnh giường ngủ, dễ trượt quăn mép khi lê chân."
        : "Ưu tiên VỪA vì thảm nằm ở khu vực phụ ít bước chân qua.";
    case "RISK-002":
      return "Ưu tiên CAO vì dây điện vắt ngang mặt sàn là nguyên nhân vấp ngã bất ngờ phổ biến hàng đầu theo CDC STEADI.";
    case "RISK-003":
      return priority === "HIGH"
        ? "Ưu tiên CAO vì lối đi bị thu hẹp dưới 0.70m, không đủ không gian di chuyển an toàn cho người già."
        : "Ưu tiên VỪA vì có chướng ngại vật làm lối đi dưới chuẩn 0.85m.";
    case "RISK-004":
      return priority === "HIGH"
        ? "Ưu tiên CAO vì bóng đêm làm giảm triệt để thị lực người già khi thức giấc đi vệ sinh."
        : "Ưu tiên VỪA vì cần bổ sung ánh sáng dịu mắt để nâng cao độ rọi sinh hoạt.";
    case "RISK-005":
      return "Ưu tiên CAO vì sàn ướt trong nhà tắm là vị trí phát sinh chấn thương gãy xương chậu nghiêm trọng nhất.";
    case "RISK-006":
      return priority === "HIGH"
        ? "Ưu tiên CAO vì không có bất kỳ điểm tựa chịu lực nào trong nhà vệ sinh khi thay đổi tư thế đứng - ngồi."
        : "Ưu tiên VỪA vì mới chỉ lắp thanh vịn tại 1 trong 2 vị trí trọng yếu.";
    case "RISK-007":
      return priority === "HIGH"
        ? "Ưu tiên CAO vì gờ cửa chênh lệch cao trên 3.5cm tạo ra độ giật cấp đột ngột rất dễ vấp ngón chân."
        : "Ưu tiên VỪA vì gờ cửa chênh trên 1.5cm cần được lắp dốc thoải chuyển tiếp.";
    case "RISK-008":
      return "Ưu tiên VỪA vì phải rướn người hoặc mò mẫm trong bóng tối để bật đèn dễ gây mất thăng bằng ngã khỏi giường.";
    default:
      return "Được phân loại theo tiêu chuẩn đánh giá nguy cơ té ngã WHO 2021.";
  }
}

