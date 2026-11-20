export const REPO_URL = 'https://github.com/NguyenTriBaoThang/SafeHome3DAI'
export const LIVE_URL = 'http://localhost:3000'

export type Status = 'verified' | 'implemented' | 'active'

export interface NavItem {
  id: string
  label: string
  path: string
  blurb: string
}

export const NAV: NavItem[] = [
  { id: 'overview', label: 'Tổng quan (Overview)', path: '/', blurb: 'Tầm nhìn, vấn đề an toàn người cao tuổi & hành trình 7 bước' },
  { id: 'architecture', label: 'Kiến trúc (Architecture)', path: '/architecture', blurb: 'Kiến trúc phân tầng, CSDL Prisma 16 bảng & luồng dữ liệu' },
  { id: 'survey', label: 'AI Guided Survey', path: '/survey', blurb: 'Khảo sát AI thích ứng, tỉa nhánh câu hỏi động & NLP tiếng Việt' },
  { id: 'vision', label: 'AI Vision Studio', path: '/vision', blurb: 'Thị giác đa phương thức, kiểm tra Magic bytes & loại bỏ EXIF' },
  { id: 'digital-twin', label: '3D Digital Twin', path: '/digital-twin', blurb: 'Bản sao số 3D WebGL, gom cụm nhãn <0.95m & kho mô phỏng' },
  { id: 'risk', label: 'Risk Engine (WHO/CDC)', path: '/risk', blurb: '8 quy tắc y khoa tất định, chấm điểm & chính sách ưu tiên' },
  { id: 'xai', label: 'XAI & RAG Copilot', path: '/xai', blurb: 'Giải trình trực quan qua Graph & trợ lý tra cứu chuẩn y khoa' },
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

