const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Bắt đầu nạp dữ liệu mẫu SafeHome 3D AI...");

  // Clean up previous records if needed
  await prisma.conversationMessage.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.hazardFinding.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.sceneSnapshot.deleteMany();
  await prisma.simulationScenario.deleteMany();
  await prisma.sceneObject.deleteMany();
  await prisma.room.deleteMany();
  await prisma.home.deleteMany();
  await prisma.project.deleteMany();
  await prisma.knowledgePassage.deleteMany();
  await prisma.knowledgeSource.deleteMany();

  // 1. Seed Knowledge Sources
  const whoSource = await prisma.knowledgeSource.create({
    data: {
      id: "SRC_WHO_2021",
      title: "Step Safety: WHO Global Report on Falls Prevention in Older Age",
      organization: "Tổ chức Y tế Thế giới (WHO)",
      url: "https://www.who.int/publications/i/item/9789241563536",
      publicationDate: "2021",
      sourceStatus: "VERIFIED",
      passages: {
        create: [
          {
            id: "WHO_PASSAGE_01",
            section: "Yếu tố môi trường - Thảm trải sàn và chướng ngại vật",
            passageText:
              "Thảm trải sàn không được cố định chặt, các nếp gấp của thảm và dây điện vắt ngang lối đi là những nguyên nhân hàng đầu gây vấp ngã ở người cao tuổi tại nhà. Cần loại bỏ các tấm thảm nhỏ không cố định hoặc sử dụng băng dính hai mặt chuyên dụng, lớp lót chống trượt (non-slip underlay) để cố định các mép thảm.",
            keywords: JSON.stringify(["thảm", "cố định thảm", "trượt ngã", "chướng ngại vật"]),
            relatedRules: JSON.stringify(["RULE_RUG_01", "RULE_PATH_OBST_06"]),
          },
          {
            id: "WHO_PASSAGE_02",
            section: "Chiếu sáng và thích ứng thị lực",
            passageText:
              "Thị lực của người cao tuổi suy giảm đáng kể theo độ tuổi, khả năng thích ứng sáng - tối chậm hơn gấp 3 lần so với người trẻ. Khu vực lối đi từ giường ngủ đến nhà vệ sinh cần duy trì độ rọi tối thiểu từ 150 đến 200 lux vào ban ngày và đèn ngủ ban đêm dịu nhẹ (ít nhất 30-50 lux) dọc chân tường để tránh lóa mắt mà vẫn nhìn rõ đường đi.",
            keywords: JSON.stringify(["chiếu sáng", "đèn ngủ", "lux", "ban đêm", "lối đi"]),
            relatedRules: JSON.stringify(["RULE_LIGHT_03"]),
          },
          {
            id: "WHO_PASSAGE_03",
            section: "An toàn phòng tắm và bề mặt ướt",
            passageText:
              "Phòng tắm là nơi xảy ra hơn 60% các ca ngã nghiêm trọng trong nhà. Sàn nhà tắm cần sử dụng gạch có hệ số ma sát cao (R10 trở lên hoặc thảm cao su chống trượt thoát nước tốt). Phải lắp thanh vịn chịu tải tối thiểu 150 kg tại vị trí bồn cầu và khu vực tắm vòi sen ở độ cao từ 80 đến 90 cm so với mặt sàn.",
            keywords: JSON.stringify(["phòng tắm", "sàn ướt", "thanh vịn", "trơn trượt"]),
            relatedRules: JSON.stringify(["RULE_BATH_WET_04", "RULE_BATH_GRAB_05"]),
          },
        ],
      },
    },
  });

  const cdcSource = await prisma.knowledgeSource.create({
    data: {
      id: "SRC_CDC_STEADI_2023",
      title: "CDC STEADI - Check for Safety: A Home Fall Prevention Checklist for Older Adults",
      organization: "Trung tâm Kiểm soát và Phòng ngừa Dịch bệnh Hoa Kỳ (CDC)",
      url: "https://www.cdc.gov/steadi/materials.html",
      publicationDate: "2023",
      sourceStatus: "VERIFIED",
      passages: {
        create: [
          {
            id: "CDC_PASSAGE_01",
            section: "Lối đi thông thoáng (Clear Walkways)",
            passageText:
              "Lối đi trong nhà cần duy trì chiều rộng thông thủy tối thiểu là 80 cm đến 90 cm để người cao tuổi đi lại an toàn bằng gậy hoặc khung tập đi. Không được để dây điện kéo dài, ổ cắm phụ hoặc đồ dùng lộn xộn cắt ngang lối đi chính từ phòng ngủ sang nhà vệ sinh hoặc bếp.",
            keywords: JSON.stringify(["lối đi", "thông thủy", "dây điện", "ổ cắm"]),
            relatedRules: JSON.stringify(["RULE_CABLE_02", "RULE_PATH_OBST_06", "RULE_ROUTE_CLUTTER_07"]),
          },
        ],
      },
    },
  });

  // 2. Seed Project & Home
  const project = await prisma.project.create({
    data: {
      id: "proj-safehome-vietnam",
      name: "Chương Trình Nhà Ở An Toàn Cho Người Cao Tuổi Việt Nam",
      description: "Ứng dụng Digital Twin 3D mô phỏng và loại bỏ nguy cơ ngã trong gia đình",
      homes: {
        create: [
          {
            id: "home-bac-nam",
            name: "Căn hộ mẫu - Bác Nam (75 tuổi)",
            address: "Quận Cầu Giấy, Hà Nội",
            targetResidentProfile: "Người cao tuổi 75 tuổi, giảm thị lực ban đêm, đi lại chậm, có tiền sử choáng váng nhẹ",
          },
        ],
      },
    },
    include: {
      homes: true,
    },
  });

  const home = project.homes[0];

  // 3. Seed Rooms & Objects
  const bedroom = await prisma.room.create({
    data: {
      id: "room-bedroom-01",
      homeId: home.id,
      name: "Phòng ngủ người cao tuổi (Mô phỏng ban đêm)",
      roomType: "BEDROOM",
      width: 4.5,
      length: 5.2,
      height: 2.8,
      floorMaterial: "WOOD",
      lightingLevel: 45,
      isWet: false,
      isSlipResistant: true,
      grabBarsCount: 0,
      sceneObjects: {
        create: [
          {
            id: "obj-bed-01",
            name: "Giường ngủ người cao tuổi (Cao 48cm)",
            category: "FURNITURE",
            modelType: "bed",
            positionX: 0.7,
            positionY: 0.35,
            positionZ: -1.1,
            width: 1.8,
            length: 2.0,
            height: 0.7,
            isFixed: true,
          },
          {
            id: "obj-rug-01",
            name: "Thảm chân len không chống trượt",
            category: "RUG",
            modelType: "rug",
            positionX: 0.9,
            positionY: 0.015,
            positionZ: 0.7,
            width: 1.0,
            length: 1.4,
            height: 0.03,
            isLoose: true,
            isFixed: false,
          },
          {
            id: "obj-cable-01",
            name: "Dây điện ổ cắm quạt sàn",
            category: "CABLE",
            modelType: "cable",
            positionX: 1.2,
            positionY: 0.02,
            positionZ: 1.3,
            width: 0.15,
            length: 1.2,
            height: 0.04,
            isFixed: false,
          },
          {
            id: "obj-table-01",
            name: "Bàn trà nhỏ góc nhọn cạnh giường",
            category: "OBSTACLE",
            modelType: "coffee_table",
            positionX: -0.3,
            positionY: 0.25,
            positionZ: 0.5,
            width: 0.6,
            length: 0.6,
            height: 0.5,
            isWalkwayObstacle: true,
            isFixed: false,
          },
        ],
      },
    },
  });

  const bathroom = await prisma.room.create({
    data: {
      id: "room-bathroom-01",
      homeId: home.id,
      name: "Phòng tắm & Nhà vệ sinh (Khu vực nguy cơ cao)",
      roomType: "BATHROOM",
      width: 3.2,
      length: 3.6,
      height: 2.6,
      floorMaterial: "CERAMIC_TILE",
      lightingLevel: 110,
      isWet: true,
      isSlipResistant: false,
      grabBarsCount: 0,
      sceneObjects: {
        create: [
          {
            id: "obj-toilet-01",
            name: "Bồn cầu sứ tiêu chuẩn",
            category: "FURNITURE",
            modelType: "toilet",
            positionX: -0.9,
            positionY: 0.35,
            positionZ: -0.8,
            width: 0.5,
            length: 0.7,
            height: 0.7,
            isFixed: true,
          },
          {
            id: "obj-shower-01",
            name: "Khu vực tắm đứng vòi sen",
            category: "FURNITURE",
            modelType: "shower",
            positionX: 0.8,
            positionY: 0.5,
            positionZ: -0.8,
            width: 1.0,
            length: 1.0,
            height: 1.8,
            isFixed: true,
          },
        ],
      },
    },
  });

  // 4. Seed Baseline Assessment for Bedroom
  const baselineAssessment = await prisma.assessment.create({
    data: {
      id: "assess-bed-base",
      roomId: bedroom.id,
      totalHazards: 4,
      resolvedHazards: 0,
      remainingHazards: 4,
      newHazards: 0,
      safetyScore: 54.0,
      notes: "Đánh giá hiện trạng ban đầu: Phát hiện 4 nguy cơ té ngã tiềm ẩn trong phòng ngủ ban đêm.",
      findings: {
        create: [
          {
            id: "finding-rug-01",
            hazardType: "LOOSE_RUG",
            title: "Thảm không chống trượt tại lối đi ra cửa",
            description: "Tấm thảm len trải sàn không được cố định mép, đặt ngay trên tuyến di chuyển ban đêm.",
            severityCategory: "HIGH",
            detectionRuleId: "RULE_RUG_01",
            evidence: "Thảm không có lớp cao su chống trượt; khoảng cách đến tâm lối đi: 0.28m.",
            recommendationText: "Dán mép bằng băng dính chống trượt hoặc thay bằng thảm có lớp cao su hút bám.",
            targetObjectId: "obj-rug-01",
            status: "ACTIVE",
          },
          {
            id: "finding-cable-01",
            hazardType: "CABLE_CROSSING",
            title: "Dây điện quạt vắt ngang lối đi",
            description: "Dây điện quạt chạy nổi qua giữa phòng ngủ từ ổ cắm ra giường.",
            severityCategory: "HIGH",
            detectionRuleId: "RULE_CABLE_02",
            evidence: "Dây cáp giao cắt tuyến đi lại chính tại tọa độ X: 1.2, Z: 1.3.",
            recommendationText: "Luồn dây vào nẹp nhựa sát tường hoặc dùng ghen bảo vệ sàn.",
            targetObjectId: "obj-cable-01",
            status: "ACTIVE",
          },
          {
            id: "finding-light-01",
            hazardType: "POOR_LIGHTING",
            title: "Độ sáng phòng quá thấp (45 Lux)",
            description: "Cường độ ánh sáng ban đêm chỉ đạt 45 Lux, không đủ để người cao tuổi quan sát chướng ngại vật.",
            severityCategory: "HIGH",
            detectionRuleId: "RULE_LIGHT_03",
            evidence: "Đo được 45 Lux, thấp hơn nhiều so với ngưỡng khuyến nghị tối thiểu 100 Lux.",
            recommendationText: "Lắp đặt đèn ngủ cảm biến chuyển động tự động bật khi thức giấc.",
            status: "ACTIVE",
          },
          {
            id: "finding-obst-01",
            hazardType: "OBSTACLE_ROUTE",
            title: "Bàn trà góc nhọn lấn chiếm hành lang đi lại",
            description: "Bàn trà nhỏ đặt ngay cạnh lối di chuyển, thu hẹp khoảng thông thủy xuống dưới 0.85m.",
            severityCategory: "MEDIUM",
            detectionRuleId: "RULE_PATH_OBST_06",
            evidence: "Khoảng thông thủy chỉ còn 0.65m; cách mép giường 0.72m.",
            recommendationText: "Kê bàn lùi về góc phòng hoặc bọc đệm silicon bảo vệ góc nhọn.",
            targetObjectId: "obj-table-01",
            status: "ACTIVE",
          },
        ],
      },
    },
  });

  console.log("✅ Nạp dữ liệu mẫu hoàn tất thành công!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi nạp dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

