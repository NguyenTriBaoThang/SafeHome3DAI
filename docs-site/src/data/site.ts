export const REPO_URL = 'https://github.com/NguyenTriBaoThang/SafeHome3DAI'
export const LIVE_URL = 'http://localhost:3000'

export type Status = 'verified' | 'implemented' | 'active' | 'partial' | 'experimental'

export const STATUS_LABEL: Record<Status, string> = {
  verified: 'Verified',
  implemented: 'Implemented',
  active: 'Active',
  partial: 'Partial',
  experimental: 'Experimental',
}

export const SRC = {
  surveyEngine: 'src/lib/survey/surveyFlowEngine.ts',
  visionEngine: 'src/lib/vision/visionProvider.ts',
  itemHazard: 'src/lib/vision/itemHazardAnalyzer.ts',
  riskEngine: 'src/lib/risk/ruleEngine.ts',
  clustering: 'src/components/three/RoomCanvas.tsx',
  dollhouse: 'src/data/dollhouseReferenceScene.ts',
  rag: 'src/lib/rag/retrieval.ts',
  xai: 'src/app/explainability/page.tsx',
}

export interface NavItem {
  id: string
  label: string
  path: string
  blurb: string
}

export const NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan (Overview)', path: '/', blurb: 'Tầm nhìn, thách thức té ngã người cao tuổi & hành trình 7 bước' },
  { id: 'architecture', label: 'Kiến trúc (Architecture)', path: '/architecture', blurb: 'Kiến trúc phân tầng, CSDL Prisma 16 bảng & luồng dữ liệu' },
  { id: 'survey', label: 'AI Guided Survey', path: '/survey', blurb: 'Khảo sát AI thích ứng, tỉa nhánh câu hỏi động & NLP tiếng Việt' },
  { id: 'vision', label: 'AI Vision & Items', path: '/vision', blurb: 'Thị giác đa tầng, Bounding Box HTML & thẩm định vật dụng CDC STEADI' },
  { id: 'digital-twin', label: '3D Digital Twin', path: '/digital-twin', blurb: 'Bản sao số 3D WebGL, Photorealistic Dollhouse & gom cụm <0.95m' },
  { id: 'risk', label: 'Risk Engine (WHO/CDC)', path: '/risk', blurb: '8 quy tắc y khoa tất định, chấm điểm 0-100 & ưu tiên can thiệp' },
  { id: 'xai', label: 'XAI & Copilot RAG', path: '/xai', blurb: 'Sơ đồ cây quyết định ReactFlow & trợ lý tra cứu y khoa 4 tab' },
  { id: 'tests', label: 'Kiểm thử & QA', path: '/tests', blurb: '109/109 ca kiểm thử Vitest thành công (20 test suites), 100% xanh lá' },
  { id: 'api', label: 'Đặc tả API', path: '/api', blurb: 'Tài liệu chi tiết 15+ endpoint RESTful của nền tảng' },
]

export const SYSTEM_STATS = [
  { label: 'Quy tắc nguy cơ y khoa', value: '8 Rules (WHO/CDC)' },
  { label: 'Ca kiểm thử tự động', value: '109 / 109 Passed (100%)' },
  { label: 'Bộ kiểm thử (Test Suites)', value: '20 Test Suites' },
  { label: 'Phân hệ hành trình', value: '7 Bước khép kín' },
  { label: 'Mô hình CSDL Prisma', value: '16 Bảng dữ liệu' },
  { label: 'Độ trễ gom cụm 3D', value: '< 2ms (<0.95m radius)' },
]
