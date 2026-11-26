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
  badge?: string
}

export interface NavGroup {
  id: string
  title: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview-group',
    title: 'TỔNG QUAN & BẢN ĐỒ',
    items: [
      { id: 'overview', label: 'Tổng quan (Overview)', path: '/', blurb: 'Tầm nhìn, thách thức té ngã người cao tuổi & hành trình 7 bước', badge: '7 Bước' },
      { id: 'architecture', label: 'Kiến trúc (Architecture)', path: '/architecture', blurb: 'Cây tri thức kiến trúc, CSDL Prisma 31 models & SQLite cô lập theo hộ', badge: '31 Models' },
      { id: 'tests', label: 'Kiểm thử & QA', path: '/tests', blurb: '57 bộ Vitest (486 passed), 81 Python ML tests, 40Q RAG & Browser E2E', badge: '57 Suites' },
    ]
  },
  {
    id: 'core-modules',
    title: 'PHÂN HỆ LÕI (CORE ENGINES)',
    items: [
      { id: 'survey', label: 'AI Guided Survey', path: '/survey', blurb: 'Khảo sát AI thích ứng, tỉa nhánh câu hỏi động & NLP tiếng Việt', badge: 'DAG & NLP' },
      { id: 'vision', label: 'AI Vision & Camera', path: '/vision', blurb: 'Thị giác đa tầng, Live Camera capture, 18 lớp vật thể & HITL', badge: '18 Classes' },
      { id: 'digital-twin', label: '3D Twin & Experience', path: '/digital-twin', blurb: 'Bản sao số 3D WebGL, Tour /experience, tách ánh sáng mô phỏng', badge: 'WebGL 3D' },
      { id: 'risk', label: 'Risk Engine (WHO/CDC)', path: '/risk', blurb: '8 quy tắc RISK-001..008 (chờ duyệt lâm sàng) & Before/After Snapshots', badge: '8 Rules' },
      { id: 'xai', label: 'Provenance & RAG', path: '/xai', blurb: 'Truy vết quyết định (Decision Provenance) & trợ lý RAG 4 tab', badge: 'Provenance' },
    ]
  },
  {
    id: 'integration',
    title: 'TÍCH HỢP & ĐẶC TẢ',
    items: [
      { id: 'api', label: 'Đặc tả API (API Reference)', path: '/api', blurb: 'Tài liệu RESTful APIs (59 protected routes qua withAccount + Auth)', badge: '63 APIs' },
    ]
  }
]

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

export const SYSTEM_STATS = [
  { label: 'Quy tắc môi trường', value: 'RISK-001..008 (WHO/CDC)' },
  { label: 'Vitest Automation', value: '57 Suites · 486 Passed (1 Skip)' },
  { label: 'Python ML & Node Bridge', value: '81 Python OK · 14 Node PASS' },
  { label: 'Giao diện & API', value: '17 Routes · 63 APIs (59 Guarded)' },
  { label: 'Mô hình CSDL Prisma', value: '31 Models (SQLite Hộ Gia Đình)' },
  { label: 'RAG Benchmark Offline', value: '40/40 PASS (PRELIMINARY)' },
]
