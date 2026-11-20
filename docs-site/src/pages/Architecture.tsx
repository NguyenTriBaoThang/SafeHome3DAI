import { Layers, Lock, GitBranch, Cpu, Database, Server, Network } from 'lucide-react'
import { PageHeader, Callout, Src } from '../components/ui'
import { CodeBlock } from '../components/CodeBlock'
import { SystemKnowledgeTree } from '../components/SystemKnowledgeTree'
import { SRC } from '../data/site'

export default function Architecture() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Tài Liệu Kỹ Thuật · Sơ Đồ Hệ Thống"
        title="Kiến Trúc Hệ Thống (System Architecture)"
        lead="Mô hình kiến trúc phân tầng, luồng xử lý dữ liệu và hệ sinh thái lưu trữ đồng bộ cho nền tảng SafeHome 3D AI."
      />

      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem', flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ fontSize: '1.4rem', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--cyan)' }}>■</span> Cây Tri Thức Kiến Trúc Hệ Thống (Knowledge Graph Architecture)
          </h2>
          <span className="badge badge-verified">5 Tầng Tri Thức · 14 Mắt Xích Lõi</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.2rem' }}>
          Đồ thị cây tri thức nhân quả trực quan hóa toàn diện kiến trúc phân tầng của SafeHome 3D AI (tương đồng với sơ đồ cây giải trình XAI trong ứng dụng). Nhấp vào bất kỳ mắt xích nào trên cây để tra cứu công nghệ, thuật toán lõi, file mã nguồn và tiêu chuẩn y tế tương ứng.
        </p>

        <SystemKnowledgeTree />
      </section>

      <Callout title="Kiến Trúc Phân Ly Thị Giác & Bounding Box Mới">
        Hệ thống phân tách dứt điểm giữa khung bao hình học SVG (<Src path="rx={0.8}" />) và nhãn tên <Src path="CSS HTML Overlay" /> trên phân hệ <Src path="src/app/ai-vision/page.tsx" />. Điều này khắc phục 100% lỗi phóng đại font chữ do ma trận tỉ lệ của Chromium khi dùng thẻ <code className="inline">&lt;foreignObject&gt;</code>.
      </Callout>

      <section>
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '1rem' }}>Các Mô Hình Dữ Liệu Lõi (Prisma Database Schema)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mô hình (Model)</th>
                <th>Mục đích sử dụng</th>
                <th>Quan hệ liên kết</th>
                <th>Ghi chú vận hành</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className="inline">Room</code></td>
                <td>Hồ sơ không gian phòng (phòng ngủ, vệ sinh, khách)</td>
                <td>1:N Object3D, 1:N SurveySession, 1:N RiskAssessment</td>
                <td>Lưu kích thước vật lý (dài, rộng, cao, cửa sổ/cửa đi)</td>
              </tr>
              <tr>
                <td><code className="inline">Object3D</code></td>
                <td>Vật thể trong phòng số hóa 3D</td>
                <td>N:1 Room, 1:N RiskFinding</td>
                <td>Lưu tọa độ thực x, y, z và thông số bề mặt</td>
              </tr>
              <tr>
                <td><code className="inline">SurveySession</code></td>
                <td>Phiên khảo sát câu hỏi thông minh</td>
                <td>N:1 Room, 1:N SurveyAnswer</td>
                <td>Theo dõi tiến độ thích ứng (% mẫu số thực)</td>
              </tr>
              <tr>
                <td><code className="inline">SurveyAnswer</code></td>
                <td>Câu trả lời của người dùng hoặc NLP trích xuất</td>
                <td>N:1 SurveySession</td>
                <td>Lưu giá trị, đơn vị đo và dấu vết hủy phụ thuộc</td>
              </tr>
              <tr>
                <td><code className="inline">VisionAnalysis</code></td>
                <td>Kết quả quét ảnh thị giác máy tính</td>
                <td>N:1 Room, 1:N VisionDetectedObject</td>
                <td>Định danh ảnh, URL đã lọc EXIF, trạng thái duyệt</td>
              </tr>
              <tr>
                <td><code className="inline">RiskAssessment</code></td>
                <td>Bản đánh giá nguy cơ y khoa chuẩn hóa</td>
                <td>N:1 Room, 1:N RiskFinding, 1:1 ActionPlan</td>
                <td>Chấm điểm an toàn tổng thể (0-100), phân hạng rủi ro</td>
              </tr>
              <tr>
                <td><code className="inline">RiskFinding</code></td>
                <td>Mối nguy cụ thể vi phạm quy tắc lâm sàng</td>
                <td>N:1 RiskAssessment, N:1 Object3D</td>
                <td>Mã quy tắc, mức ưu tiên (CRITICAL, HIGH, MEDIUM)</td>
              </tr>
              <tr>
                <td><code className="inline">Simulation</code></td>
                <td>Kịch bản mô phỏng 3D đã lưu</td>
                <td>N:1 Room</td>
                <td>Lưu cấu hình can thiệp trước/sau trong kho lưu trữ</td>
              </tr>
              <tr>
                <td><code className="inline">AuditEvent</code></td>
                <td>Nhật ký kiểm toán biến đổi trạng thái y tế</td>
                <td>Hệ thống</td>
                <td>Ghi lại thời điểm sửa câu hỏi, hủy nguy cơ cũ</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-title">
            <Lock size={18} color="var(--primary-hover)" />
            <span>Tiêu Chuẩn Bảo Mật & Quyền Riêng Tư (Privacy First)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Dữ liệu không gian sống và hình ảnh gia đình là thông tin nhạy cảm cao:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Loại bỏ EXIF GPS:</strong> Toàn bộ metadata vị trí địa lý, thiết bị chụp ảnh bị cắt gọt tại gateway.</li>
            <li><strong>Chống tệp độc hại:</strong> Kiểm tra Magic Bytes hex header trước khi ghi đĩa hoặc xử lý.</li>
            <li><strong>Chủ quyền dữ liệu:</strong> Toàn bộ cơ sở dữ liệu có thể vận hành On-Premise hoặc SQLite cục bộ.</li>
          </ul>
        </div>

        <div className="card">
          <div className="card-title">
            <GitBranch size={18} color="var(--primary-hover)" />
            <span>Đảm Bảo Tính Nhất Quán Trạng Thái (State Integrity)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Khi người dùng cập nhật dữ liệu ở bất kỳ bước nào:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Stale Invalidation:</strong> Đổi câu trả lời gốc lập tức kích hoạt hủy câu trả lời con và nguy cơ liên quan.</li>
            <li><strong>Đồng bộ 3D tức thì:</strong> Tọa độ vật thể và nguy cơ tự động cập nhật lại nhãn trong canvas Three.js.</li>
            <li><strong>Audit Trail:</strong> Mọi biến động trạng thái y tế đều được ghi vết vĩnh viễn trong <code className="inline">AuditEvent</code>.</li>
          </ul>
        </div>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.8rem' }}>Ví Dụ Cấu Hình Mô Hình Dữ Liệu Prisma</h2>
        <CodeBlock
          label="prisma/schema.prisma"
          code={`model Room {
  id          String   @id @default(uuid())
  name        String
  type        String   // BEDROOM, BATHROOM, LIVING_ROOM
  length      Float    // meters
  width       Float    // meters
  height      Float    // meters
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  objects     Object3D[]
  surveys     SurveySession[]
  assessments RiskAssessment[]
}`}
        />
      </section>
    </div>
  )
}
