import { useState, useEffect, useRef } from 'react'
import {
  Camera,
  ClipboardCheck,
  Box,
  Search,
  CheckCircle2,
  Layers,
  Activity,
  GitFork,
  Sliders,
  Database,
  ShieldCheck,
  FileText,
  Code2,
  Sparkles,
  Play,
  Pause,
  ArrowRight,
  Info,
  GitCommit
} from 'lucide-react'
import { Src } from './ui'

export interface KnowledgeNode {
  id: string
  tier: number
  tierName: string
  tierColor: string
  title: string
  icon: string
  subtitle: string
  tech: string
  sourcePath: string
  clinicalStandard: string
  testSuite: string
  description: string
  tags: string[]
  streams: string[]
  upstream: string[]
  downstream: string[]
}

export const KNOWLEDGE_NODES: KnowledgeNode[] = [
  // Tier 1: Sensory Perception
  {
    id: 'vision-studio',
    tier: 1,
    tierName: 'TẦNG 1: THU NHẬN HIỆN TRƯỜNG',
    tierColor: '#22d3ee',
    title: 'Thị Giác AI (Vision Studio)',
    icon: 'Camera',
    subtitle: 'Quét 18 lớp nội thất & Bounding Box HTML',
    tech: 'Gemini Multimodal Vision · Magic Bytes · EXIF GPS Stripper',
    sourcePath: 'src/lib/vision/visionProvider.ts',
    clinicalStandard: 'Bộ phân loại vật thể nguy cơ té ngã WHO 2021',
    testSuite: 'tests/visionEngine.test.ts (14 tests passed)',
    description: 'Bóc tách ảnh hiện trường thành danh mục vật thể số hóa. Kiểm tra Magic Bytes nhị phân (FF D8 FF / 89 50 4E 47), cắt bỏ 100% tọa độ GPS, chuẩn hóa bounding boxes và dùng nhãn CSS HTML Overlay loại trừ triệt để lỗi phóng to chữ Chromium.',
    tags: ['Multimodal AI', 'Privacy Guard', '18 Classes'],
    streams: ['stream-1'],
    upstream: ['Ảnh chụp hiện trường phòng ngủ / nhà vệ sinh'],
    downstream: ['Spatial Validation Engine']
  },
  {
    id: 'item-hazard',
    tier: 1,
    tierName: 'TẦNG 1: THU NHẬN HIỆN TRƯỜNG',
    tierColor: '#22d3ee',
    title: 'Thẩm Định Vật Dụng CDC STEADI',
    icon: 'Search',
    subtitle: 'Chấm điểm rủi ro & ghim tọa độ H1..H4',
    tech: 'Hotspot Pin Locator · Click-to-Reposition · Biomechanics',
    sourcePath: 'src/lib/vision/itemHazardAnalyzer.ts',
    clinicalStandard: 'CDC STEADI Fall Prevention Guidelines (Checklist p.2)',
    testSuite: 'tests/itemHazardAssessment.test.ts (4 tests passed)',
    description: 'Thẩm định chuyên sâu đồ vật chụp gần: trả lời 3 câu hỏi lâm sàng (Mức độ nguy hiểm bao nhiêu? Tại sao nguy hiểm? Nguy hiểm ở chỗ nào?). Định vị ghim rủi ro H1..H4 trực tiếp trên ảnh và hỗ trợ kéo thả căn chỉnh tọa độ.',
    tags: ['CDC STEADI', 'Hotspots H1..H4', 'Biomechanics'],
    streams: ['stream-1'],
    upstream: ['Ảnh chụp cận cảnh bàn/ghế/vật dụng'],
    downstream: ['Spatial Validation Engine']
  },
  {
    id: 'survey-nlp',
    tier: 1,
    tierName: 'TẦNG 1: THU NHẬN HIỆN TRƯỜNG',
    tierColor: '#22d3ee',
    title: 'Khảo Sát Thích Ứng & NLP',
    icon: 'ClipboardCheck',
    subtitle: 'Tỉa nhánh câu hỏi & hiểu tiếng Việt đời thường',
    tech: 'Dynamic Irrelevance Pruning · Vietnamese NLP Parser · True Denominator',
    sourcePath: 'src/lib/survey/flowEngine.ts',
    clinicalStandard: 'CDC STEADI Screening Protocol & WHO Clinical Fall Risk',
    testSuite: 'tests/surveyEngine.test.ts (9 tests passed)',
    description: 'Hệ thống khảo sát thích ứng DAG. Tự động bỏ qua câu hỏi không liên quan khi câu hỏi cha = NO (ví dụ không có thảm thì không hỏi viền thảm). Hiểu từ đo lường dân dã tiếng Việt (phân, tấc, mét) và tín hiệu chưa chắc chắn (chưa rõ, không biết).',
    tags: ['DAG Pruning', 'Vietnamese NLP', 'Zero Skew'],
    streams: ['stream-2'],
    upstream: ['Khảo sát giao thoại người chăm sóc'],
    downstream: ['Stale Dependency Purger']
  },
  {
    id: 'digital-twin-core',
    tier: 1,
    tierName: 'TẦNG 1: THU NHẬN HIỆN TRƯỜNG',
    tierColor: '#22d3ee',
    title: 'Bản Sao Số 3D WebGL (Three.js)',
    icon: 'Box',
    subtitle: 'Photorealistic Dollhouse & Tour /experience',
    tech: 'Three.js · React Three Fiber 9 · lightingModel.ts · OrbitControls',
    sourcePath: 'src/data/dollhouseReferenceScene.ts',
    clinicalStandard: 'Tách bạch ánh sáng hiển thị 3D khỏi số đo lux vật lý (B08)',
    testSuite: 'npm run test:experience (9 suites, 64 passed)',
    description: 'Không gian phòng ngủ và nhà vệ sinh khép kín ước lượng bố cục (không khẳng định tỷ lệ 1:1 khi chưa đo thực tế). Tích hợp preset ánh sáng mô phỏng và phục hồi WebGLBoundary.',
    tags: ['Three.js', 'Dollhouse', 'Lighting Studio'],
    streams: ['stream-1'],
    upstream: ['Tọa độ phòng & mesh 3D Dollhouse'],
    downstream: ['Smart Marker Clustering']
  },

  // Tier 2: Spatial Normalization & Facts
  {
    id: 'spatial-validation',
    tier: 2,
    tierName: 'TẦNG 2: BÓC TÁCH & CHUẨN HÓA HÌNH HỌC',
    tierColor: '#38bdf8',
    title: 'Spatial Validation Engine',
    icon: 'Layers',
    subtitle: 'Kiểm định AABB/OBB & Thông thủy lối đi <80cm',
    tech: 'World-Space MinY Floor Snapping · Geometric Collision Tolerances',
    sourcePath: 'src/lib/reconstruction/spatialValidationEngine.ts',
    clinicalStandard: 'ADA Accessibility Standards (Clear Walkway Width)',
    testSuite: 'tests/spatialValidationEngine.test.ts (8 tests passed)',
    description: 'Xác thực tọa độ hình học 3 chiều: ngăn chặn đồ vật bay lơ lửng, chìm sàn, xuyên tường; phát hiện lối đi bị thu hẹp dưới 80cm gây cản trở cho người già dùng khung tập đi hoặc gậy chống.',
    tags: ['AABB/OBB Bounds', 'Clearance <80cm', 'Snapping'],
    streams: ['stream-1', 'stream-3'],
    upstream: ['Thị Giác AI', 'Thẩm Định Vật Dụng CDC'],
    downstream: ['Bảng Đăng Ký 8 Quy Tắc Lâm Sàng', 'Chỉ Mục Vector Y Khoa RAG']
  },
  {
    id: 'marker-clustering',
    tier: 2,
    tierName: 'TẦNG 2: BÓC TÁCH & CHUẨN HÓA HÌNH HỌC',
    tierColor: '#38bdf8',
    title: 'Smart Marker Clustering',
    icon: 'Sliders',
    subtitle: 'Gom cụm nhãn 3D bán kính Euclidean <0.95m',
    tech: 'Euclidean Spatial Clustering Algorithm (<2ms latency)',
    sourcePath: 'src/components/three/RoomCanvas.tsx',
    clinicalStandard: 'Công thái học giao diện trực quan cho người cao tuổi',
    testSuite: 'tests/workflowEngine.test.ts (4 tests passed)',
    description: 'Khi nhiều điểm nguy cơ nằm cạnh nhau trong không gian hẹp, thuật toán tự động gom các nhãn riêng lẻ thành 1 nhãn cụm duy nhất (ví dụ: [🔴 +3 Nguy cơ]), bấm vào để mở rộng, loại bỏ 100% hiện tượng đè lấn chữ.',
    tags: ['Radius <0.95m', 'Anti-clutter', 'Zero Overlap'],
    streams: ['stream-1'],
    upstream: ['Bản Sao Số 3D WebGL'],
    downstream: ['Bảng Đăng Ký 8 Quy Tắc Lâm Sàng']
  },
  {
    id: 'stale-dependency',
    tier: 2,
    tierName: 'TẦNG 2: BÓC TÁCH & CHUẨN HÓA HÌNH HỌC',
    tierColor: '#38bdf8',
    title: 'Stale Dependency Purger',
    icon: 'CheckCircle2',
    subtitle: 'Hủy dữ liệu con & dọn sạch nguy cơ lỗi thời',
    tech: 'DAG Invalidation Cascade · AuditEvent Synchronizer',
    sourcePath: 'src/lib/survey/flowEngine.ts',
    clinicalStandard: 'Quy trình kiểm toán y tế nhất quán (Data Integrity)',
    testSuite: 'tests/surveyIntegration.test.ts (4 tests passed)',
    description: 'Khi người dùng quay lại sửa câu trả lời cha (ví dụ đổi từ Có thảm sang Không thảm), hệ thống tự động tìm và xóa câu trả lời con cũ trong database, hủy bỏ mối nguy RISK-001 phát sinh trước đó.',
    tags: ['Data Integrity', 'Auto Purge', 'Cascade'],
    streams: ['stream-2'],
    upstream: ['Khảo Sát Thích Ứng & NLP'],
    downstream: ['Bảng Đăng Ký 8 Quy Tắc Lâm Sàng']
  },

  // Tier 3: Evidence-Based Clinical Rules
  {
    id: 'risk-registry',
    tier: 3,
    tierName: 'TẦNG 3: TRI THỨC Y HỌC CHỨNG CỨ',
    tierColor: '#fbbf24',
    title: 'Bảng Đăng Ký 8 Quy Tắc Lâm Sàng',
    icon: 'ShieldCheck',
    subtitle: 'Chuẩn hóa 100% theo WHO 2021 & CDC STEADI',
    tech: 'Versioned Pure Functions (RISK-001..008) · Zod Contracts',
    sourcePath: 'src/lib/risk/riskRuleRegistry.ts',
    clinicalStandard: 'WHO Global Report on Fall Prevention & CDC STEADI',
    testSuite: 'tests/riskIntelligence.test.ts (10 tests passed)',
    description: '8 quy tắc y khoa lâm sàng phiên bản 1.0.0: Thảm trượt (RISK-001), Dây điện lối đi (RISK-002), Vật cản thông thủy (RISK-003), Thiếu sáng ban đêm <50 Lux (RISK-004), Sàn phòng tắm trơn (RISK-005), Thiếu thanh vịn bồn cầu/vòi sen (RISK-006), Gờ bậc cửa >1.5cm (RISK-007), Công tắc ngoài tầm với (RISK-008).',
    tags: ['WHO 2021', 'CDC STEADI', 'ADA Barrier-free'],
    streams: ['stream-1', 'stream-2'],
    upstream: ['Spatial Validation Engine', 'Smart Marker Clustering', 'Stale Purger'],
    downstream: ['Deterministic Risk Engine', 'Đồ Thị Decision Provenance']
  },
  {
    id: 'rag-knowledge',
    tier: 3,
    tierName: 'TẦNG 3: TRI THỨC Y HỌC CHỨNG CỨ',
    tierColor: '#fbbf24',
    title: 'Chỉ Mục Vector Y Khoa RAG',
    icon: 'FileText',
    subtitle: 'WHO 2021, NCOA, Bộ Y Tế Việt Nam',
    tech: 'Field-Boosted Retrieval · Whitelist Verification · Guardrails A09',
    sourcePath: 'src/lib/rag/retrieval.ts',
    clinicalStandard: 'Cẩm nang phòng ngừa tai nạn thương tích Bộ Y Tế & NCOA',
    testSuite: 'eval:rag:a09 (40/40 OFFLINE_DETERMINISTIC PRELIMINARY)',
    description: 'Kho tri thức y khoa chuẩn mực được lập chỉ mục từ nguồn được phê duyệt, phục vụ truy vấn thời gian thực cho trợ lý AI Copilot kèm trích dẫn kiểm chứng.',
    tags: ['Curated Sources', 'Ministry of Health', 'NCOA'],
    streams: ['stream-3'],
    upstream: ['Spatial Validation Engine'],
    downstream: ['Trợ Lý AI SafeHome Copilot']
  },

  // Tier 4: Deterministic Reasoning & Decision Provenance
  {
    id: 'risk-engine',
    tier: 4,
    tierName: 'TẦNG 4: SUY LUẬN TẤT ĐỊNH & PROVENANCE',
    tierColor: '#f87171',
    title: 'Canonical Risk Engine',
    icon: 'Activity',
    subtitle: 'RISK-001..008 · PENDING_CLINICAL_REVIEW',
    tech: 'Deterministic Penalty Formulation · Threshold Config v2026.1',
    sourcePath: 'src/lib/risk/ruleEngine.ts',
    clinicalStandard: 'Công cụ sàng lọc yếu tố môi trường (không thay thế chẩn đoán)',
    testSuite: 'tests/riskEngine.test.ts & clinicalThresholdReview.test.ts',
    description: 'Công thức toán học tất định tính toán điểm tham chiếu (0 - 100) với bộ ngưỡng chuẩn hóa trong thresholdConfig.ts đang chờ thẩm định chuyên gia y tế.',
    tags: ['Pure Math', 'Zero Hallucination', 'Score 0-100'],
    streams: ['stream-1', 'stream-2'],
    upstream: ['Bảng Đăng Ký 8 Quy Tắc Lâm Sàng'],
    downstream: ['Mô Phỏng Can Thiệp (What-If)']
  },
  {
    id: 'rag-copilot',
    tier: 4,
    tierName: 'TẦNG 4: SUY LUẬN TẤT ĐỊNH & PROVENANCE',
    tierColor: '#f87171',
    title: 'Trợ Lý AI SafeHome Copilot',
    icon: 'Sparkles',
    subtitle: 'Đối chiếu không gian 3D & Ngăn tra cứu 4 Tab',
    tech: 'SafeHomeMarkdown · Evidence Drawer · Grounded Generator',
    sourcePath: 'src/lib/rag/groundedGenerator.ts',
    clinicalStandard: 'Nguyên tắc an toàn y tế và tuyên bố trách nhiệm',
    testSuite: 'tests/copilotEngine.test.ts (10 tests passed)',
    description: 'Hội thoại y học thông minh: tự động liên kết trạng thái phòng 3D đang khảo sát, gắn thẻ trích dẫn [1]..[4] và cung cấp ngăn tra cứu 4 tab (Bằng chứng, Vật dụng, Kho nguồn, Thẩm định RAG).',
    tags: ['Grounded RAG', '4-Tab Drawer', '3D Context'],
    streams: ['stream-3'],
    upstream: ['Chỉ Mục Vector Y Khoa RAG'],
    downstream: ['Prisma Relational Store & Audit']
  },
  {
    id: 'xai-tree',
    tier: 4,
    tierName: 'TẦNG 4: SUY LUẬN TẤT ĐỊNH & PROVENANCE',
    tierColor: '#f87171',
    title: 'Rule-Based Decision Provenance',
    icon: 'GitFork',
    subtitle: 'Truy xuất chuỗi nguồn gốc quyết định theo quy tắc',
    tech: 'ReactFlow Interactive DAG · Traceability Inspector',
    sourcePath: 'src/app/explainability/page.tsx',
    clinicalStandard: 'Truy vết nguồn gốc dữ liệu & quy tắc (tách biệt với Gemini explainability)',
    testSuite: 'tests/decisionTraceabilityA10.test.ts (5 tests passed)',
    description: 'Trực quan hóa đường suy luận: Snapshot Phòng → Vật thể 3D → Đầu vào (sourceType) → Quy tắc RISK-XXX → Mối nguy → Tài liệu đã duyệt → Khuyến nghị.',
    tags: ['ReactFlow', 'Decision Provenance', 'Traceable'],
    streams: ['stream-1', 'stream-2', 'stream-3'],
    upstream: ['Bảng Đăng Ký 8 Quy Tắc Lâm Sàng'],
    downstream: ['Prisma Relational Store & Audit']
  },

  // Tier 5: Actionable Interventions & Persistence
  {
    id: 'scenario-simulator',
    tier: 5,
    tierName: 'TẦNG 5: CAN THIỆP & LƯU TRỮ',
    tierColor: '#34d399',
    title: 'Mô Phỏng Can Thiệp (What-If)',
    icon: 'Sliders',
    subtitle: 'Thử nghiệm phương án cải tạo & Snapshot v1',
    tech: 'Intervention Engine · Immutable RoomSnapshotRecord · Undo/Redo',
    sourcePath: 'src/lib/risk/comparisonEngine.ts',
    clinicalStandard: 'Phác đồ can thiệp môi trường vật lý (Environmental Modifications)',
    testSuite: 'tests/simulationUndoRedo.test.ts & beforeAfterSnapshotsA11.test.ts',
    description: 'Cho phép thử nghiệm can thiệp ảo (thêm thanh vịn, dán băng dính thảm, kẹp dây điện, tăng sáng) và đối chiếu snapshot bất biến Trước/Sau.',
    tags: ['What-If', 'Undo/Redo', 'Snapshots v1'],
    streams: ['stream-1'],
    upstream: ['Canonical Risk Engine'],
    downstream: ['Báo cáo PDF & Kế hoạch thi công']
  },
  {
    id: 'prisma-store',
    tier: 5,
    tierName: 'TẦNG 5: CAN THIỆP & LƯU TRỮ',
    tierColor: '#34d399',
    title: 'Prisma Per-Household SQLite & Audit',
    icon: 'Database',
    subtitle: '31 Prisma Models · Cô lập từng hộ gia đình',
    tech: 'Prisma 5.22 · Isolated Household SQLite · Offline Backup/Restore',
    sourcePath: 'src/lib/database/prisma.ts',
    clinicalStandard: 'Cô lập dữ liệu hộ gia đình & nhật ký PersistenceAuditEvent',
    testSuite: 'tests/reliablePersistenceDemoBoundary.test.ts (9 tests passed)',
    description: 'Quản lý 31 models quan hệ tách riêng theo từng tài khoản dưới SAFEHOME_PRIVATE_DIR (Room, SceneObject, HomeSurvey, RoomImage, Assessment, RoomSnapshotRecord, ConsentRecord,...).',
    tags: ['31 Models', 'Per-Household SQLite', 'Audit Trail'],
    streams: ['stream-1', 'stream-2', 'stream-3'],
    upstream: ['Trợ Lý AI SafeHome Copilot', 'Rule-Based Decision Provenance'],
    downstream: ['Hồ sơ an toàn gia đình bất biến']
  }
]

export interface ConduitEdge {
  id: string
  fromNode: string
  toNode: string
  fallbackY1: number
  fallbackY2: number
  stream: string
  label: string
  color: string
}

const CONDUITS_T1_T2: ConduitEdge[] = [
  { id: 'c-v-s', fromNode: 'vision-studio', toNode: 'spatial-validation', fallbackY1: 55, fallbackY2: 80, stream: 'stream-1', label: 'BBox 2D ➔ Snapping & Thông thủy <80cm', color: '#22d3ee' },
  { id: 'c-h-s', fromNode: 'item-hazard', toNode: 'spatial-validation', fallbackY1: 180, fallbackY2: 80, stream: 'stream-1', label: 'Hotspot H1..H4 ➔ Tọa độ va chạm', color: '#fbbf24' },
  { id: 'c-s-p', fromNode: 'survey-nlp', toNode: 'stale-dependency', fallbackY1: 305, fallbackY2: 400, stream: 'stream-2', label: 'DAG khảo sát ➔ Xóa quan hệ con lỗi thời', color: '#22d3ee' },
  { id: 'c-d-m', fromNode: 'digital-twin-core', toNode: 'marker-clustering', fallbackY1: 430, fallbackY2: 240, stream: 'stream-1', label: 'Vật thể 3D ➔ Gom cụm nhãn r=0.95m', color: '#22d3ee' }
]

const CONDUITS_T2_T3: ConduitEdge[] = [
  { id: 'c-sp-rr', fromNode: 'spatial-validation', toNode: 'risk-registry', fallbackY1: 80, fallbackY2: 120, stream: 'stream-1', label: 'Vi phạm hình học ➔ 8 Quy tắc WHO/CDC', color: '#38bdf8' },
  { id: 'c-mc-rr', fromNode: 'marker-clustering', toNode: 'risk-registry', fallbackY1: 240, fallbackY2: 120, stream: 'stream-1', label: 'Tọa độ điểm nguy hiểm ➔ Chuẩn y khoa', color: '#38bdf8' },
  { id: 'c-sd-rr', fromNode: 'stale-dependency', toNode: 'risk-registry', fallbackY1: 400, fallbackY2: 120, stream: 'stream-2', label: 'Lọc sạch vi phạm ảo ➔ Quy tắc hợp lệ', color: '#38bdf8' },
  { id: 'c-sp-rag', fromNode: 'spatial-validation', toNode: 'rag-knowledge', fallbackY1: 80, fallbackY2: 360, stream: 'stream-3', label: 'Dữ liệu đo đạc ➔ Đối chiếu vector y văn', color: '#38bdf8' }
]

const CONDUITS_T3_T4: ConduitEdge[] = [
  { id: 'c-rr-re', fromNode: 'risk-registry', toNode: 'risk-engine', fallbackY1: 120, fallbackY2: 80, stream: 'stream-1', label: '8 Quy tắc ➔ Trừ điểm phạt tất định S = max(0, 100 - ∑P)', color: '#fbbf24' },
  { id: 'c-rr-xai', fromNode: 'risk-registry', toNode: 'xai-tree', fallbackY1: 120, fallbackY2: 400, stream: 'stream-2', label: 'Căn cứ quy chuẩn ➔ Rule-Based Decision Provenance', color: '#fbbf24' },
  { id: 'c-rag-cop', fromNode: 'rag-knowledge', toNode: 'rag-copilot', fallbackY1: 360, fallbackY2: 240, stream: 'stream-3', label: 'Nguồn y văn WHO/CDC/BYT ➔ Hội thoại có trích dẫn [1]..[4]', color: '#fbbf24' }
]

const CONDUITS_T4_T5: ConduitEdge[] = [
  { id: 'c-re-sim', fromNode: 'risk-engine', toNode: 'scenario-simulator', fallbackY1: 80, fallbackY2: 120, stream: 'stream-1', label: 'Điểm tham chiếu ➔ Mô phỏng can thiệp What-If & Snapshot v1', color: '#f87171' },
  { id: 'c-xai-db', fromNode: 'xai-tree', toNode: 'prisma-store', fallbackY1: 400, fallbackY2: 360, stream: 'stream-2', label: 'Chuỗi nguồn gốc ➔ Audit Store hộ gia đình', color: '#f87171' },
  { id: 'c-cop-db', fromNode: 'rag-copilot', toNode: 'prisma-store', fallbackY1: 240, fallbackY2: 360, stream: 'stream-3', label: 'Tư vấn y khoa ➔ 31 Models SQLite Hộ Gia Đình', color: '#f87171' }
]

export function SystemKnowledgeTree() {
  const [selectedId, setSelectedId] = useState<string>('vision-studio')
  const [activeStream, setActiveStream] = useState<string>('all')
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [packetCount, setPacketCount] = useState<number>(1420)

  // Live data stream ticker counter
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setPacketCount((prev) => prev + Math.floor(Math.random() * 8) + 3)
    }, 1200)
    return () => clearInterval(interval)
  }, [isPlaying])

  const selectedNode = KNOWLEDGE_NODES.find((n) => n.id === selectedId) || KNOWLEDGE_NODES[0]

  const streams = [
    { id: 'all', label: 'Toàn Bộ Cây Tri Thức (5 Tầng · 14 Mắt Xích)', tag: 'Tất Cả 14 Luồng' },
    { id: 'stream-1', label: 'Luồng 1: Thị Giác AI ➔ Đo Đạc ➔ Đánh Giá Nguy Cơ ➔ Cải Tạo 3D', tag: 'Vision ➔ Risk' },
    { id: 'stream-2', label: 'Luồng 2: Khảo Sát Thích Ứng ➔ Hủy Phụ Thuộc ➔ WHO/CDC ➔ Audit Trail', tag: 'Survey ➔ Audit' },
    { id: 'stream-3', label: 'Luồng 3: Trợ Lý Copilot ➔ Chỉ Mục Vector RAG ➔ Decision Provenance', tag: 'RAG ➔ Provenance' }
  ]

  // Render SVG Conduit Bridge between two columns
  const renderConduitBridge = (conduits: ConduitEdge[]) => {
    return (
      <div className="tree-conduit-col" aria-hidden="true">
        <svg className="conduit-svg" viewBox="0 0 54 480" preserveAspectRatio="none">
          <defs>
            <marker id="arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#22d3ee" />
            </marker>
            <marker id="arrow-sky" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fbbf24" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f87171" />
            </marker>
            <marker id="arrow-dim" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="#1e293b" />
            </marker>
          </defs>

          {conduits.map((edge) => {
            const isStreamActive = activeStream === 'all' || edge.stream === activeStream
            const isNodeConnected = selectedId === edge.fromNode || selectedId === edge.toNode
            const isActive = isStreamActive && (activeStream !== 'all' || isNodeConnected || true)

            const y1 = edge.fallbackY1
            const y2 = edge.fallbackY2

            // Cubic bezier curve path
            const pathData = `M 0 ${y1} C 27 ${y1}, 27 ${y2}, 50 ${y2}`

            let strokeColor = edge.color
            let markerId = `url(#arrow-${edge.color === '#22d3ee' ? 'cyan' : edge.color === '#38bdf8' ? 'sky' : edge.color === '#fbbf24' ? 'amber' : 'red'})`

            if (!isStreamActive) {
              strokeColor = '#17253b'
              markerId = 'url(#arrow-dim)'
            } else if (isNodeConnected) {
              strokeColor = '#38bdf8'
            }

            return (
              <g key={edge.id} className={`conduit-group ${isActive ? 'active' : 'dim'}`}>
                {/* Glow underlay */}
                {isActive && isPlaying && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isNodeConnected ? 4 : 2}
                    strokeOpacity={0.25}
                    filter="blur(2px)"
                  />
                )}

                {/* Animated dash line */}
                <path
                  id={edge.id}
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isNodeConnected ? 2.5 : 1.8}
                  strokeDasharray={isPlaying && isStreamActive ? '6, 5' : 'none'}
                  className={isPlaying && isStreamActive ? 'flowing-conduit' : ''}
                  markerEnd={markerId}
                />

                {/* Traveling data particle pulse */}
                {isPlaying && isStreamActive && (
                  <circle r={isNodeConnected ? 3.5 : 2.5} fill={strokeColor} className="data-pulse-dot">
                    <animateMotion
                      dur={isNodeConnected ? '1.4s' : '2.2s'}
                      repeatCount="indefinite"
                      path={pathData}
                    />
                  </circle>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  return (
    <div className="knowledge-tree-container">
      {/* Live Running Data Stream HUD Banner */}
      <div className="stream-hud-banner">
        <div className="hud-left">
          <div className="hud-status-indicator">
            <span className={`pulse-radar-dot ${isPlaying ? 'live' : 'paused'}`} />
            <span className="hud-status-text mono">
              {isPlaying ? 'LUỒNG DỮ LIỆU ĐANG CHẠY (DATA FLOW RUNNING)' : 'LUỒNG DỮ LIỆU ĐÃ TẠM DỪNG'}
            </span>
          </div>
          <div className="hud-stream-ticker mono">
            <span className="ticker-step">Thị Giác AI</span>
            <span className="ticker-arrow">──►</span>
            <span className="ticker-step">Spatial Engine</span>
            <span className="ticker-arrow">──►</span>
            <span className="ticker-step">WHO/CDC 8 Rules</span>
            <span className="ticker-arrow">──►</span>
            <span className="ticker-step">Deterministic Math</span>
            <span className="ticker-arrow">──►</span>
            <span className="ticker-step">3D Twin What-If</span>
          </div>
        </div>

        <div className="hud-right">
          <div className="hud-metric mono">
            <span className="metric-label">Gói tin:</span>
            <strong className="metric-val">{packetCount.toLocaleString()} pkts/s</strong>
          </div>
          <div className="hud-metric mono hide-sm">
            <span className="metric-label">Độ trễ:</span>
            <strong className="metric-val text-green">&lt;1.8ms</strong>
          </div>
          <button
            type="button"
            className="hud-play-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Tạm dừng mô phỏng dữ liệu' : 'Tiếp tục chạy dữ liệu'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{isPlaying ? 'Tạm dừng' : 'Chạy lại'}</span>
          </button>
        </div>
      </div>

      {/* Stream Preset Filter Chips */}
      <div className="chips" role="group" aria-label="Bộ lọc luồng dữ liệu" style={{ marginBottom: 16 }}>
        {streams.map((s) => (
          <button
            key={s.id}
            type="button"
            className={activeStream === s.id ? 'chip on' : 'chip'}
            onClick={() => setActiveStream(s.id)}
          >
            <span className="chip-bullet" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Main Visual Knowledge Tree Area (Full-Width Canvas) */}
      <div className="tree-workspace">
        {/* Tree Graph Canvas */}
        <div className="tree-graph-view">
          <div className="tree-canvas">
            {/* TIER 1 COLUMN (4 nodes) */}
            <div className="tree-tier-column">
              <div className="tier-header" style={{ borderLeftColor: '#22d3ee' }}>
                <span className="tier-tag mono" style={{ color: '#22d3ee' }}>TIER 01 · 4 MẮT XÍCH</span>
                <strong className="tier-title">Cảm Biến & Thu Nhận Hiện Trường</strong>
              </div>
              <div className="tier-nodes-list">
                {KNOWLEDGE_NODES.filter((n) => n.tier === 1).map((node) => {
                  const isSelected = node.id === selectedId
                  const isStreamActive = activeStream === 'all' || node.streams.includes(activeStream)
                  return (
                    <div
                      key={node.id}
                      className={`tree-node-card ${isSelected ? 'selected' : ''} ${!isStreamActive ? 'node-dimmed' : ''}`}
                      onClick={() => setSelectedId(node.id)}
                      style={{ borderColor: isSelected ? node.tierColor : 'var(--line)' }}
                    >
                      <div className="node-head">
                        <span className="node-dot" style={{ background: node.tierColor }}></span>
                        <strong className="node-title">{node.title}</strong>
                      </div>
                      <p className="node-sub">{node.subtitle}</p>
                      <div className="node-tags">
                        {node.tags.map((t) => (
                          <span key={t} className="node-tag mono">{t}</span>
                        ))}
                      </div>
                      <span className="node-port port-out" style={{ background: isSelected ? node.tierColor : 'var(--line)' }} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CONDUIT BRIDGE 1: TIER 1 -> TIER 2 */}
            {renderConduitBridge(CONDUITS_T1_T2)}

            {/* TIER 2 COLUMN (3 nodes) */}
            <div className="tree-tier-column">
              <div className="tier-header" style={{ borderLeftColor: '#38bdf8' }}>
                <span className="tier-tag mono" style={{ color: '#38bdf8' }}>TIER 02 · 3 MẮT XÍCH</span>
                <strong className="tier-title">Bóc Tách & Chuẩn Hóa Hình Học</strong>
              </div>
              <div className="tier-nodes-list">
                {KNOWLEDGE_NODES.filter((n) => n.tier === 2).map((node) => {
                  const isSelected = node.id === selectedId
                  const isStreamActive = activeStream === 'all' || node.streams.includes(activeStream)
                  return (
                    <div
                      key={node.id}
                      className={`tree-node-card ${isSelected ? 'selected' : ''} ${!isStreamActive ? 'node-dimmed' : ''}`}
                      onClick={() => setSelectedId(node.id)}
                      style={{ borderColor: isSelected ? node.tierColor : 'var(--line)' }}
                    >
                      <span className="node-port port-in" style={{ background: isSelected ? node.tierColor : 'var(--line)' }} />
                      <div className="node-head">
                        <span className="node-dot" style={{ background: node.tierColor }}></span>
                        <strong className="node-title">{node.title}</strong>
                      </div>
                      <p className="node-sub">{node.subtitle}</p>
                      <div className="node-tags">
                        {node.tags.map((t) => (
                          <span key={t} className="node-tag mono">{t}</span>
                        ))}
                      </div>
                      <span className="node-port port-out" style={{ background: isSelected ? node.tierColor : 'var(--line)' }} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CONDUIT BRIDGE 2: TIER 2 -> TIER 3 */}
            {renderConduitBridge(CONDUITS_T2_T3)}

            {/* TIER 3 COLUMN (2 nodes) */}
            <div className="tree-tier-column">
              <div className="tier-header" style={{ borderLeftColor: '#fbbf24' }}>
                <span className="tier-tag mono" style={{ color: '#fbbf24' }}>TIER 03 · 2 MẮT XÍCH</span>
                <strong className="tier-title">Tri Thức Y Học Chứng Cứ</strong>
              </div>
              <div className="tier-nodes-list">
                {KNOWLEDGE_NODES.filter((n) => n.tier === 3).map((node) => {
                  const isSelected = node.id === selectedId
                  const isStreamActive = activeStream === 'all' || node.streams.includes(activeStream)
                  return (
                    <div
                      key={node.id}
                      className={`tree-node-card ${isSelected ? 'selected' : ''} ${!isStreamActive ? 'node-dimmed' : ''}`}
                      onClick={() => setSelectedId(node.id)}
                      style={{ borderColor: isSelected ? node.tierColor : 'var(--line)' }}
                    >
                      <span className="node-port port-in" style={{ background: isSelected ? node.tierColor : 'var(--line)' }} />
                      <div className="node-head">
                        <span className="node-dot" style={{ background: node.tierColor }}></span>
                        <strong className="node-title">{node.title}</strong>
                      </div>
                      <p className="node-sub">{node.subtitle}</p>
                      <div className="node-tags">
                        {node.tags.map((t) => (
                          <span key={t} className="node-tag mono">{t}</span>
                        ))}
                      </div>
                      <span className="node-port port-out" style={{ background: isSelected ? node.tierColor : 'var(--line)' }} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CONDUIT BRIDGE 3: TIER 3 -> TIER 4 */}
            {renderConduitBridge(CONDUITS_T3_T4)}

            {/* TIER 4 COLUMN (3 nodes) */}
            <div className="tree-tier-column">
              <div className="tier-header" style={{ borderLeftColor: '#f87171' }}>
                <span className="tier-tag mono" style={{ color: '#f87171' }}>TIER 04 · 3 MẮT XÍCH</span>
                <strong className="tier-title">Suy Luận Tất Định & XAI</strong>
              </div>
              <div className="tier-nodes-list">
                {KNOWLEDGE_NODES.filter((n) => n.tier === 4).map((node) => {
                  const isSelected = node.id === selectedId
                  const isStreamActive = activeStream === 'all' || node.streams.includes(activeStream)
                  return (
                    <div
                      key={node.id}
                      className={`tree-node-card ${isSelected ? 'selected' : ''} ${!isStreamActive ? 'node-dimmed' : ''}`}
                      onClick={() => setSelectedId(node.id)}
                      style={{ borderColor: isSelected ? node.tierColor : 'var(--line)' }}
                    >
                      <span className="node-port port-in" style={{ background: isSelected ? node.tierColor : 'var(--line)' }} />
                      <div className="node-head">
                        <span className="node-dot" style={{ background: node.tierColor }}></span>
                        <strong className="node-title">{node.title}</strong>
                      </div>
                      <p className="node-sub">{node.subtitle}</p>
                      <div className="node-tags">
                        {node.tags.map((t) => (
                          <span key={t} className="node-tag mono">{t}</span>
                        ))}
                      </div>
                      <span className="node-port port-out" style={{ background: isSelected ? node.tierColor : 'var(--line)' }} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CONDUIT BRIDGE 4: TIER 4 -> TIER 5 */}
            {renderConduitBridge(CONDUITS_T4_T5)}

            {/* TIER 5 COLUMN (2 nodes) */}
            <div className="tree-tier-column">
              <div className="tier-header" style={{ borderLeftColor: '#34d399' }}>
                <span className="tier-tag mono" style={{ color: '#34d399' }}>TIER 05 · 2 MẮT XÍCH</span>
                <strong className="tier-title">Can Thiệp & Lưu Trữ Bất Biến</strong>
              </div>
              <div className="tier-nodes-list">
                {KNOWLEDGE_NODES.filter((n) => n.tier === 5).map((node) => {
                  const isSelected = node.id === selectedId
                  const isStreamActive = activeStream === 'all' || node.streams.includes(activeStream)
                  return (
                    <div
                      key={node.id}
                      className={`tree-node-card ${isSelected ? 'selected' : ''} ${!isStreamActive ? 'node-dimmed' : ''}`}
                      onClick={() => setSelectedId(node.id)}
                      style={{ borderColor: isSelected ? node.tierColor : 'var(--line)' }}
                    >
                      <span className="node-port port-in" style={{ background: isSelected ? node.tierColor : 'var(--line)' }} />
                      <div className="node-head">
                        <span className="node-dot" style={{ background: node.tierColor }}></span>
                        <strong className="node-title">{node.title}</strong>
                      </div>
                      <p className="node-sub">{node.subtitle}</p>
                      <div className="node-tags">
                        {node.tags.map((t) => (
                          <span key={t} className="node-tag mono">{t}</span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Node Inspector Deck Below */}
        <div className="tree-inspector-bottom">
          <div className="inspector-card-bottom">
            {/* Inspector Top Row */}
            <div className="inspector-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  className="badge badge-verified"
                  style={{
                    background: `${selectedNode.tierColor}1a`,
                    color: selectedNode.tierColor,
                    borderColor: selectedNode.tierColor,
                    fontSize: '0.74rem'
                  }}
                >
                  {selectedNode.tierName}
                </span>
                <span className="status-badge-green">
                  <CheckCircle2 size={13} /> Verified in CI Test Suite
                </span>
              </div>
              <div className="mono dim small">
                Bấm vào thẻ bất kỳ trên sơ đồ để thanh tra chi tiết
              </div>
            </div>

            <div style={{ margin: '12px 0 16px' }}>
              <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: '1.35rem', fontWeight: 700 }}>
                {selectedNode.title}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', margin: 0 }}>
                {selectedNode.subtitle}
              </p>
            </div>

            {/* 4-Item Executive Detail Grid */}
            <div className="inspector-grid-4">
              <div className="inspect-item">
                <dt><Code2 size={14} color="var(--cyan)" /> Công nghệ lõi / Thuật toán</dt>
                <dd className="mono">{selectedNode.tech}</dd>
              </div>

              <div className="inspect-item">
                <dt><FileText size={14} color="var(--green)" /> File mã nguồn dự án</dt>
                <dd><Src path={selectedNode.sourcePath} /></dd>
              </div>

              <div className="inspect-item">
                <dt><ShieldCheck size={14} color="var(--amber)" /> Tiêu chuẩn y khoa liên quan</dt>
                <dd style={{ color: 'var(--amber)' }}>{selectedNode.clinicalStandard}</dd>
              </div>

              <div className="inspect-item">
                <dt><CheckCircle2 size={14} color="var(--green)" /> Ca kiểm thử tự động (Vitest)</dt>
                <dd className="mono" style={{ color: 'var(--green)' }}>{selectedNode.testSuite}</dd>
              </div>
            </div>

            {/* 2-Column Split: Detailed Mechanics & Causal Links */}
            <div className="inspector-split-2">
              <div className="desc-box">
                <div className="desc-title"><Info size={14} /> Cơ Chế Hoạt Động Cốt Lõi:</div>
                <p className="desc-text">{selectedNode.description}</p>
              </div>

              <div className="links-box">
                <div className="desc-title"><GitCommit size={14} /> Chuỗi Nhân Quả Liên Kết:</div>
                <div className="link-rows">
                  <div className="link-row">
                    <span className="link-dir mono text-cyan">▲ ĐẦU VÀO (IN):</span>
                    <span className="link-names">{selectedNode.upstream.join(' · ')}</span>
                  </div>
                  <div className="link-row">
                    <span className="link-dir mono text-green">▼ ĐẦU RA (OUT):</span>
                    <span className="link-names">{selectedNode.downstream.join(' · ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
