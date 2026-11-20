// Endpoints extracted from Next.js App Router handlers in src/app/api/**/*.ts
// Request bodies follow Zod schemas and Prisma models in src/lib/.
// Response bodies represent verified production JSON formats.

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface Endpoint {
  method: Method
  path: string
  summary: string
  access?: 'public' | 'optional' | 'session' | 'clinician' | 'admin'
  source: string
  request?: string
  response?: string
}

export interface EndpointGroup {
  id: string
  title: string
  endpoints: Endpoint[]
}

export const API_GROUPS: EndpointGroup[] = [
  {
    id: 'vision',
    title: '1. AI Vision & Item Hazard Assessment',
    endpoints: [
      {
        method: 'POST',
        path: '/api/vision/assess-item',
        summary: 'Assess specific home item or piece of furniture from uploaded image (CDC STEADI risk scoring + pinpoint hotspots H1..H4).',
        access: 'public',
        source: 'src/app/api/vision/assess-item/route.ts',
        request: `{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "itemHint": "Bàn học / Bàn làm việc",
  "roomType": "BEDROOM"
}`,
        response: `{
  "success": true,
  "itemName": "Bàn học / Bàn làm việc góc nhọn chân sắt",
  "riskLevel": "HIGH",
  "riskScore": 72,
  "medicalReason": "Bàn làm việc hoặc bàn ăn có các góc vuông 90° sắc nhọn nhô ra hành lang di chuyển và chân kim loại thanh mảnh dễ trơn trượt trên sàn gạch men khi người cao tuổi tỳ vịn đứng dậy.",
  "hotspots": [
    {
      "id": "H1",
      "label": "Góc bàn vuông 90° sắc nhọn (Mép trước trái)",
      "severity": "HIGH",
      "x": 32,
      "y": 45,
      "mechanism": "Tập trung áp lực va đập tại góc nhọn (Focal Blunt Impact)"
    },
    {
      "id": "H2",
      "label": "Mép bàn cạnh ngoài nhô vào lối đi (Mép trước phải)",
      "severity": "MEDIUM",
      "x": 68,
      "y": 48,
      "mechanism": "Thu hẹp khoảng thông thủy bước chân <50cm"
    },
    {
      "id": "H3",
      "label": "Thanh giằng chéo & cơ chế gập dưới gầm bàn",
      "severity": "HIGH",
      "x": 42,
      "y": 72,
      "mechanism": "Thanh giằng sắt đan chéo dễ móc vào quai dép / mũi chân"
    }
  ],
  "actionPlan": "Gắn bọc đệm silicon bo tròn góc nhọn (chi phí ~25.000 VNĐ); kê sát tường cách xa lối đi vệ sinh.",
  "citation": "CDC STEADI Fall Prevention Guidelines - Home Hazard Checklist p.2"
}`
      },
      {
        method: 'POST',
        path: '/api/vision/scan-photo',
        summary: 'Detect room objects with 18-class clinical taxonomy, bounding boxes, and camera pose heuristics.',
        access: 'public',
        source: 'src/app/api/vision/scan-photo/route.ts',
        request: `{
  "image": "data:image/jpeg;base64,...",
  "roomType": "LIVING_ROOM"
}`,
        response: `{
  "detections": [
    {
      "label": "giuong_ngu",
      "confidence": 0.94,
      "box2d": [180, 220, 680, 780],
      "estimatedHeightCm": 48
    },
    {
      "label": "tham_trai_san",
      "confidence": 0.89,
      "box2d": [620, 310, 740, 580],
      "isFixed": false
    },
    {
      "label": "day_dien",
      "confidence": 0.78,
      "box2d": [710, 540, 770, 710],
      "isTrailing": true
    }
  ],
  "photoMeta": { "width": 1920, "height": 1080, "orientation": 1 }
}`
      },
      {
        method: 'POST',
        path: '/api/vision/rooms/[roomId]/sync-survey',
        summary: 'Synchronize verified vision detections into RoomProfile and Survey answers.',
        access: 'session',
        source: 'src/app/api/vision/rooms/[roomId]/sync-survey/route.ts',
        request: `{
  "approvedDetectionIds": ["det_01", "det_02", "det_03"],
  "roomDimensions": { "lengthM": 4.2, "widthM": 3.6 }
}`,
        response: `{
  "synchronized": true,
  "updatedSurveyQuestions": ["BED_001", "BED_006", "BED_007"],
  "staleQuestionsInvalidated": 0
}`
      }
    ]
  },
  {
    id: 'risk',
    title: '2. Deterministic Clinical Risk Engine',
    endpoints: [
      {
        method: 'POST',
        path: '/api/risk-assessment/evaluate',
        summary: 'Execute all 8 deterministic WHO/CDC rules against a room state, computing S = max(0, 100 - sum(Penalties)).',
        access: 'public',
        source: 'src/app/api/risk-assessment/evaluate/route.ts',
        request: `{
  "roomId": "room_elderly_bed_01",
  "luxLevel": 40,
  "objects": [
    { "type": "BED", "heightCm": 42 },
    { "type": "RUG", "isFixed": false, "inWalkway": true },
    { "type": "TRAILING_WIRE", "inWalkway": true }
  ],
  "bathroom": { "hasGrabBar": false, "floorFriction": "SLIPPERY" }
}`,
        response: `{
  "safetyScore": 30,
  "riskCategory": "HIGH_RISK",
  "totalPenalties": 70,
  "findings": [
    {
      "ruleId": "RULE_RUG_01",
      "severity": "HIGH",
      "penalty": 20,
      "title": "Thảm trơn trượt không cố định",
      "mechanism": "Thảm trải sàn thiếu lớp chống trượt tại luồng di chuyển chính",
      "citation": "CDC STEADI Environmental Checklist (p.2)"
    },
    {
      "ruleId": "RULE_LIGHT_03",
      "severity": "HIGH",
      "penalty": 20,
      "title": "Độ rọi ban đêm không đạt chuẩn (<50 Lux)",
      "mechanism": "Cường độ ánh sáng ban đêm 40 Lux gây suy giảm thị lực chiều sâu",
      "citation": "WHO Global Report on Fall Prevention (Sec 3.2)"
    },
    {
      "ruleId": "RULE_CABLE_02",
      "severity": "HIGH",
      "penalty": 15,
      "title": "Dây điện vắt ngang lối đi",
      "mechanism": "Dây nguồn sạc nằm ngang hành lang gây móc vướng bàn chân",
      "citation": "CDC STEADI Fall Prevention Checklist"
    },
    {
      "ruleId": "RULE_BED_05",
      "severity": "MEDIUM",
      "penalty": 15,
      "title": "Mặt nệm giường quá thấp (<45cm)",
      "mechanism": "Chiều cao 42cm gây gập góc gối nhọn khi đứng dậy",
      "citation": "CDC STEADI Knee Biomechanics Guidelines"
    }
  ]
}`
      },
      {
        method: 'POST',
        path: '/api/risk-assessment/compare',
        summary: 'Compare Baseline vs Simulated intervention safety metrics, showing Delta score and recovered points.',
        access: 'public',
        source: 'src/app/api/risk-assessment/compare/route.ts',
        request: `{
  "baselineAssessmentId": "asm_baseline_01",
  "simulatedAssessmentId": "asm_sim_after_01"
}`,
        response: `{
  "baselineScore": 28,
  "simulatedScore": 100,
  "scoreImprovement": 72,
  "resolvedHazards": ["RULE_RUG_01", "RULE_LIGHT_03", "RULE_CABLE_02", "RULE_BATH_GRAB_04"],
  "remediationCostVND": 480000,
  "paybackSummary": "Giảm 72% nguy cơ ngã chỉ với can thiệp thảm chống trượt, kẹp dây điện và đèn cảm ứng 320 Lux."
}`
      },
      {
        method: 'GET',
        path: '/api/risk-assessment/findings/[findingId]/explain',
        summary: 'Return full clinical audit trail, mathematical trigger formula, and exact medical textbook reference.',
        access: 'public',
        source: 'src/app/api/risk-assessment/findings/[findingId]/explain/route.ts',
        response: `{
  "findingId": "find_rug_01",
  "ruleId": "RULE_RUG_01",
  "standard": "CDC STEADI (Centers for Disease Control and Prevention)",
  "formula": "IF hasRug == true AND isFixed == false THEN penalty = 20",
  "medicalMechanism": "Người cao tuổi có xu hướng giảm nhấc ngón chân (foot clearance giảm 1.2 - 1.8cm). Khi gặp mép thảm không cố định, mũi bàn chân dễ bị vấp gập tạo mô men lật thân trên về phía trước.",
  "suggestedIntervention": {
    "title": "Dán băng dính mép thảm chuyên dụng hoặc thay bằng thảm cao su viền vát",
    "estCostVND": 50000,
    "difficulty": "EASY_DIY"
  }
}`
      }
    ]
  },
  {
    id: 'rag',
    title: '3. Medical RAG Copilot & Explanations',
    endpoints: [
      {
        method: 'POST',
        path: '/api/ai/chat',
        summary: 'Ask clinical assistant with guaranteed WHO/CDC citations and verified 3D context linking.',
        access: 'public',
        source: 'src/app/api/ai/chat/route.ts',
        request: `{
  "message": "Tại sao thảm trải sàn không cố định lại nguy hiểm cho người già?",
  "activeRoomId": "room_photorealistic_dollhouse",
  "conversationId": "conv_01"
}`,
        response: `{
  "reply": "Dựa trên tài liệu chuyên môn từ World Health Organization và CDC STEADI, thảm trải sàn không được cố định là nguyên nhân hàng đầu gây vấp ngã ở người cao tuổi...",
  "citations": [
    {
      "id": 1,
      "source": "World Health Organization",
      "document": "WHO Global Report on Falls Prevention in Older Age",
      "section": "Chương 3: Environmental Factors",
      "url": "https://www.who.int/publications/i/item/9789241563536"
    },
    {
      "id": 2,
      "source": "CDC STEADI",
      "document": "Check for Safety: A Home Fall Prevention Checklist for Older Adults",
      "section": "Trang 2: Rugs and Floor Hazards"
    }
  ],
  "activeEvidenceChunks": 10,
  "linkedHazardsCount": 3
}`
      },
      {
        method: 'GET',
        path: '/api/rag/sources',
        summary: 'List indexed medical fall prevention standards and knowledge chunks.',
        access: 'public',
        source: 'src/app/api/rag/sources/route.ts',
        response: `{
  "sources": [
    { "id": "src_who_2021", "name": "WHO Global Report on Falls Prevention", "version": "2021", "chunksCount": 42 },
    { "id": "src_cdc_steadi", "name": "CDC STEADI Clinical Algorithm", "version": "2019-2023", "chunksCount": 38 },
    { "id": "src_moh_vn", "name": "Bộ Y Tế Việt Nam - Hướng dẫn phòng chống tai nạn thương tích người cao tuổi", "version": "QĐ-BYT", "chunksCount": 24 },
    { "id": "src_ncoa", "name": "National Council on Aging - Evidence-Based Fall Prevention", "version": "2022", "chunksCount": 19 }
  ]
}`
      }
    ]
  },
  {
    id: 'survey',
    title: '4. Dynamic Adaptive Survey Engine',
    endpoints: [
      {
        method: 'POST',
        path: '/api/surveys/interpret-nlp',
        summary: 'Extract structured home dimensions and hazard states from freeform Vietnamese speech or text.',
        access: 'public',
        source: 'src/app/api/surveys/interpret-nlp/route.ts',
        request: `{
  "input": "Phòng ngủ dài 4 mét 2, rộng khoảng 3 mét rưỡi. Có cái thảm dưới chân giường nhưng không có băng keo cố định gì cả.",
  "currentQuestionId": "BED_006"
}`,
        response: `{
  "confidence": 0.95,
  "extractedEntities": {
    "lengthM": 4.2,
    "widthM": 3.5,
    "hasRug": true,
    "isRugFixed": false
  },
  "answers": [
    { "questionId": "ROOM_001", "value": "4.2x3.5" },
    { "questionId": "BED_006", "value": "YES" },
    { "questionId": "BED_007", "value": "NO" }
  ],
  "feedbackMessage": "Đã trích xuất kích thước phòng 4.2m x 3.5m và ghi nhận thảm lỏng không chống trượt."
}`
      },
      {
        method: 'GET',
        path: '/api/surveys/[id]/rooms/[roomId]/next-question',
        summary: 'Dynamically compute the next unpruned question based on adaptive DAG dependency graph.',
        access: 'public',
        source: 'src/app/api/surveys/[id]/rooms/[roomId]/next-question/route.ts',
        response: `{
  "nextQuestion": {
    "id": "BED_007",
    "category": "FLOOR",
    "text": "Thảm có lớp cao su chống trượt hoặc dán cố định không?",
    "parentQuestionId": "BED_006",
    "dependencyCondition": "BED_006 == 'YES'"
  },
  "progressPercentage": 62,
  "activeQuestionsCount": 16,
  "prunedQuestionsCount": 6
}`
      }
    ]
  },
  {
    id: 'simulation',
    title: '5. 3D Digital Twin & Simulation Workspace',
    endpoints: [
      {
        method: 'GET',
        path: '/api/simulations',
        summary: 'List saved 3D room scenes and simulation variants with photorealistic metadata.',
        access: 'public',
        source: 'src/app/api/simulations/route.ts',
        response: `{
  "simulations": [
    {
      "id": "sim_photorealistic_dollhouse",
      "name": "Photorealistic Bedroom & Bathroom Dollhouse",
      "roomType": "BEDROOM_ENSUITE",
      "lightingMode": "DAY_250_LUX",
      "surfaceFriction": "SLIP_RESISTANT",
      "objectsCount": 14,
      "hazardsCount": 0,
      "safetyScore": 100
    },
    {
      "id": "sim_elderly_bed_baseline",
      "name": "Phòng ngủ người cao tuổi (Hiện trạng rủi ro)",
      "roomType": "BEDROOM",
      "lightingMode": "NIGHT_40_LUX",
      "surfaceFriction": "STANDARD",
      "objectsCount": 8,
      "hazardsCount": 6,
      "safetyScore": 28
    }
  ]
}`
      },
      {
        method: 'POST',
        path: '/api/simulations',
        summary: 'Persist customized 3D scene state with furniture transforms, lighting lux, and safety devices.',
        access: 'session',
        source: 'src/app/api/simulations/route.ts',
        request: `{
  "roomId": "room_elderly_bed_01",
  "name": "Kịch bản cải tạo: Thêm thanh vịn + Thảm chống trượt",
  "lightingPreset": "STUDIO_320_LUX",
  "surfaceFriction": "SLIP_RESISTANT",
  "addedSafetyDevices": ["toilet_grab_bar", "shower_grab_bar", "suction_mat"],
  "objectPositions": [
    { "objectId": "bed_01", "position": [1.2, 0.48, -0.8], "rotation": [0, 1.57, 0] }
  ]
}`,
        response: `{
  "success": true,
  "simulationId": "sim_renovated_01",
  "calculatedScore": 100,
  "hazardsRemaining": 0
}`
      }
    ]
  }
]

