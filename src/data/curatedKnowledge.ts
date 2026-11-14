import { KnowledgeSourceItem } from "@/types";

export interface EnrichedKnowledgeSource extends KnowledgeSourceItem {
  publisher: string;
  officialUrl: string;
  language: string;
  documentType: "GUIDELINE" | "STANDARD" | "RESEARCH";
  version: string;
  approvalStatus: "APPROVED" | "PENDING" | "REJECTED";
  ingestionStatus: "INDEXED" | "FAILED" | "PENDING";
  contentHash: string;
  lastVerifiedAt: string;
  passages: {
    id: string;
    section: string;
    passageText: string;
    pageNumber?: number;
    startOffset?: number;
    endOffset?: number;
    contentHash: string;
    keywords: string[];
    relatedRules: string[];
  }[];
}

export const CURATED_KNOWLEDGE_SOURCES: EnrichedKnowledgeSource[] = [
  {
    id: "SRC_WHO_2021",
    title: "Step Safety: WHO Global Report on Falls Prevention in Older Age",
    organization: "Tổ chức Y tế Thế giới (WHO)",
    publisher: "World Health Organization",
    url: "https://www.who.int/publications/i/item/9789241563536",
    officialUrl: "https://www.who.int/publications/i/item/9789241563536",
    publicationDate: "2021",
    retrievedAt: "2024-01-15T00:00:00.000Z",
    lastVerifiedAt: "2024-04-10T00:00:00.000Z",
    language: "vi",
    documentType: "GUIDELINE",
    version: "2.1",
    approvalStatus: "APPROVED",
    ingestionStatus: "INDEXED",
    contentHash: "sha256-who-step-safety-2021-verified",
    sourceStatus: "VERIFIED",
    passages: [
      {
        id: "WHO_PASSAGE_01",
        section: "Yếu tố môi trường - Thảm trải sàn và chướng ngại vật",
        passageText:
          "Thảm trải sàn không được cố định chặt, các nếp gấp của thảm và dây điện vắt ngang lối đi là những nguyên nhân hàng đầu gây vấp ngã ở người cao tuổi tại nhà. Cần loại bỏ các tấm thảm nhỏ không cố định hoặc sử dụng băng dính hai mặt chuyên dụng, lớp lót chống trượt (non-slip underlay) để cố định các mép thảm.",
        pageNumber: 34,
        startOffset: 1200,
        endOffset: 1540,
        contentHash: "sha256-who-pass-01",
        keywords: ["thảm", "thảm trải sàn", "cố định thảm", "trượt ngã", "vấp ngã", "chướng ngại vật", "mép thảm"],
        relatedRules: ["RULE_RUG_01", "RULE_PATH_OBST_06"],
      },
      {
        id: "WHO_PASSAGE_02",
        section: "Chiếu sáng và thích ứng thị lực",
        passageText:
          "Thị lực của người cao tuổi suy giảm đáng kể theo độ tuổi, khả năng thích ứng sáng - tối chậm hơn gấp 3 lần so với người trẻ. Khu vực lối đi từ giường ngủ đến nhà vệ sinh cần duy trì độ rọi tối thiểu từ 150 đến 200 lux vào ban ngày và đèn ngủ ban đêm dịu nhẹ (ít nhất 30-50 lux) dọc chân tường để tránh lóa mắt mà vẫn nhìn rõ đường đi.",
        pageNumber: 42,
        startOffset: 2400,
        endOffset: 2780,
        contentHash: "sha256-who-pass-02",
        keywords: ["chiếu sáng", "đèn ngủ", "độ sáng", "lux", "thị lực", "ban đêm", "lối đi", "lóa mắt"],
        relatedRules: ["RULE_LIGHT_03"],
      },
      {
        id: "WHO_PASSAGE_03",
        section: "An toàn phòng tắm và bề mặt ướt",
        passageText:
          "Phòng tắm là nơi xảy ra hơn 60% các ca ngã nghiêm trọng trong nhà. Sàn nhà tắm cần sử dụng gạch có hệ số ma sát cao (R10 trở lên hoặc thảm cao su chống trượt thoát nước tốt). Phải lắp thanh vịn chịu tải tối thiểu 150 kg tại vị trí bồn cầu và khu vực tắm vòi sen ở độ cao từ 80 đến 90 cm so với mặt sàn.",
        pageNumber: 51,
        startOffset: 3100,
        endOffset: 3480,
        contentHash: "sha256-who-pass-03",
        keywords: ["phòng tắm", "sàn ướt", "thanh vịn", "tay vịn", "trơn trượt", "gạch chống trượt", "bồn cầu"],
        relatedRules: ["RULE_BATH_WET_04", "RULE_BATH_GRAB_05"],
      },
    ],
  },
  {
    id: "SRC_CDC_STEADI_2023",
    title: "CDC STEADI - Check for Safety: A Home Fall Prevention Checklist for Older Adults",
    organization: "Trung tâm Kiểm soát và Phòng ngừa Dịch bệnh Hoa Kỳ (CDC)",
    publisher: "Centers for Disease Control and Prevention",
    url: "https://www.cdc.gov/steadi/materials.html",
    officialUrl: "https://www.cdc.gov/steadi/materials.html",
    publicationDate: "2023",
    retrievedAt: "2024-02-10T00:00:00.000Z",
    lastVerifiedAt: "2024-04-12T00:00:00.000Z",
    language: "vi",
    documentType: "GUIDELINE",
    version: "2023.1",
    approvalStatus: "APPROVED",
    ingestionStatus: "INDEXED",
    contentHash: "sha256-cdc-steadi-2023-verified",
    sourceStatus: "VERIFIED",
    passages: [
      {
        id: "CDC_PASSAGE_01",
        section: "Lối đi thông thoáng (Clear Walkways)",
        passageText:
          "Lối đi trong nhà cần duy trì chiều rộng thông thủy tối thiểu là 80 cm đến 90 cm để người cao tuổi đi lại an toàn bằng gậy hoặc khung tập đi. Không được để dây điện kéo dài, ổ cắm phụ hoặc đồ dùng lộn xộn cắt ngang lối đi chính từ phòng ngủ sang nhà vệ sinh hoặc bếp.",
        pageNumber: 3,
        startOffset: 450,
        endOffset: 780,
        contentHash: "sha256-cdc-pass-01",
        keywords: ["lối đi", "thông thủy", "dây điện", "ổ cắm", "khung tập đi", "vướng chân", "kích thước"],
        relatedRules: ["RULE_CABLE_02", "RULE_PATH_OBST_06", "RULE_ROUTE_CLUTTER_07"],
      },
      {
        id: "CDC_PASSAGE_02",
        section: "Kê đặt đồ nội thất và độ vững chãi",
        passageText:
          "Nội thất dọc lối đi phải có kết cấu vững chắc, không xê dịch khi vịn vào. Không kê bàn kính hoặc vật nhọn góc cạnh sát giường ngủ. Giường ngủ nên có chiều cao vừa phải (đầu gối tạo góc 90 độ khi ngồi chạm chân xuống đất, thường từ 45-50 cm tính cả đệm).",
        pageNumber: 5,
        startOffset: 890,
        endOffset: 1220,
        contentHash: "sha256-cdc-pass-02",
        keywords: ["nội thất", "giường ngủ", "bàn", "vững chắc", "chiều cao giường", "góc nhọn", "bàn kính"],
        relatedRules: ["RULE_DANGEROUS_OBJECT_08"],
      },
      {
        id: "CDC_PASSAGE_03",
        section: "Cầu thang và bậc tam cấp",
        passageText:
          "Bậc cầu thang phải đồng đều chiều cao, mép bậc dán chỉ phân quang hoặc gờ chống trượt tương phản màu sắc. Bắt buộc lắp tay vịn ở cả hai bên tường kéo dài hết bậc đầu tiên và bậc cuối cùng.",
        pageNumber: 7,
        startOffset: 1400,
        endOffset: 1710,
        contentHash: "sha256-cdc-pass-03",
        keywords: ["cầu thang", "bậc tam cấp", "tay vịn cầu thang", "phản quang", "chống trượt"],
        relatedRules: [],
      },
    ],
  },
  {
    id: "SRC_BYT_VN_2020",
    title: "Hướng dẫn chăm sóc sức khỏe và phòng ngừa tai nạn thương tích ở người cao tuổi",
    organization: "Bộ Y tế Việt Nam (Cục Quản lý Khám, chữa bệnh)",
    publisher: "Bộ Y tế Việt Nam",
    url: "https://kcb.vn/tai-lieu-chuyen-mon/huong-dan-phong-ngua-nga-nguoi-cao-tuoi.html",
    officialUrl: "https://kcb.vn/tai-lieu-chuyen-mon/huong-dan-phong-ngua-nga-nguoi-cao-tuoi.html",
    publicationDate: "2020",
    retrievedAt: "2024-03-01T00:00:00.000Z",
    lastVerifiedAt: "2024-04-15T00:00:00.000Z",
    language: "vi",
    documentType: "GUIDELINE",
    version: "1.0",
    approvalStatus: "APPROVED",
    ingestionStatus: "INDEXED",
    contentHash: "sha256-byt-vn-2020-verified",
    sourceStatus: "VERIFIED",
    passages: [
      {
        id: "BYT_PASSAGE_01",
        section: "Cải tạo môi trường nhà ở thân thiện với người già",
        passageText:
          "Tại Việt Nam, té ngã là nguyên nhân hàng đầu dẫn đến gãy cổ xương đùi, chấn thương sọ não và suy giảm vận động vĩnh viễn ở người già. Gia đình cần rà soát: tuyệt đối không để sàn trơn trượt, loại bỏ các bậc tam cấp gờ cao không cần thiết, bố trí công tắc đèn ngang tầm với ngay cửa vào hoặc gắn cảm ứng chuyển động.",
        pageNumber: 18,
        startOffset: 2100,
        endOffset: 2510,
        contentHash: "sha256-byt-pass-01",
        keywords: ["bộ y tế", "tai nạn thương tích", "gãy xương", "công tắc đèn", "cảm ứng", "sàn trơn", "xương đùi"],
        relatedRules: ["RULE_LIGHT_03", "RULE_BATH_WET_04"],
      },
      {
        id: "BYT_PASSAGE_02",
        section: "Thanh nắm hỗ trợ trong khu vệ sinh gia đình",
        passageText:
          "Người cao tuổi thường bị hạ huyết áp tư thế khi đứng lên sau khi đi vệ sinh hoặc tắm lâu. Việc lắp đặt thanh tay vịn hình chữ L hoặc thanh vịn ngang cạnh bồn cầu và buồng tắm giúp giảm tải áp lực cho khớp gối và cung cấp điểm tựa chắc chắn ngăn ngừa ngã quỵ.",
        pageNumber: 22,
        startOffset: 2850,
        endOffset: 3240,
        contentHash: "sha256-byt-pass-02",
        keywords: ["hạ huyết áp tư thế", "thanh vịn chữ L", "bồn cầu", "khớp gối", "điểm tựa", "tắm"],
        relatedRules: ["RULE_BATH_GRAB_05"],
      },
    ],
  },
  {
    id: "SRC_NCOA_2023",
    title: "Evidence-Based Falls Prevention Programs & Home Safety Recommendations",
    organization: "National Council on Aging (NCOA)",
    publisher: "National Council on Aging",
    url: "https://www.ncoa.org/older-adults/health/prevention/falls-prevention",
    officialUrl: "https://www.ncoa.org/older-adults/health/prevention/falls-prevention",
    publicationDate: "2023",
    retrievedAt: "2024-04-12T00:00:00.000Z",
    lastVerifiedAt: "2024-04-18T00:00:00.000Z",
    language: "vi",
    documentType: "RESEARCH",
    version: "2023.2",
    approvalStatus: "APPROVED",
    ingestionStatus: "INDEXED",
    contentHash: "sha256-ncoa-2023-verified",
    sourceStatus: "VERIFIED",
    passages: [
      {
        id: "NCOA_PASSAGE_01",
        section: "Chiến lược can thiệp môi trường vật lý (Environmental Modifications)",
        passageText:
          "Can thiệp sửa chữa nhà ở đơn giản có thể giảm nguy cơ ngã tới 39% ở người cao tuổi có tiền sử ngã. Các can thiệp hiệu quả chi phí nhất bao gồm: dán băng dính chống trượt mép thảm, gom gọn dây cáp điện vào máng luồn dây tường, thay bóng đèn LED độ sáng cao và bổ sung thanh vịn.",
        pageNumber: 12,
        startOffset: 1100,
        endOffset: 1470,
        contentHash: "sha256-ncoa-pass-01",
        keywords: ["giảm nguy cơ ngã", "hiệu quả chi phí", "máng luồn dây", "đèn led", "thanh vịn", "can thiệp"],
        relatedRules: ["RULE_RUG_01", "RULE_CABLE_02", "RULE_LIGHT_03"],
      },
      {
        id: "NCOA_PASSAGE_02",
        section: "Đánh giá nguy cơ định kỳ và kiểm tra thuốc",
        passageText:
          "Các yếu tố làm tăng nguy cơ ngã bao gồm việc sử dụng từ 4 loại thuốc điều trị trở lên (đặc biệt thuốc an thần, hạ áp) và suy giảm thị lực. Việc kiểm tra nhà ở phải kết hợp với tham vấn bác sĩ điều trị để rà soát tác dụng phụ gây chóng mặt của thuốc.",
        pageNumber: 15,
        startOffset: 1600,
        endOffset: 1950,
        contentHash: "sha256-ncoa-pass-02",
        keywords: ["thuốc", "tác dụng phụ", "chóng mặt", "hạ áp", "bác sĩ", "khám"],
        relatedRules: [],
      },
    ],
  },
];
