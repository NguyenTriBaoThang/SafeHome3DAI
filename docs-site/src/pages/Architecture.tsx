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
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '1rem' }}>Các Mô Hình Dữ Liệu Lõi (31 Models · Prisma 5.22)</h2>
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
                <td><code className="inline">Room</code> &amp; <code className="inline">SceneObject</code></td>
                <td>Hồ sơ phòng &amp; vật thể số hóa 3D</td>
                <td>1:N SceneObject, 1:N SimulationScenario, 1:N Assessment</td>
                <td>Lưu kích thước phòng, vật liệu sàn, vị trí/góc xoay &amp; measurement provenance</td>
              </tr>
              <tr>
                <td><code className="inline">HomeSurvey</code> &amp; <code className="inline">SurveyRoom</code></td>
                <td>Phiên khảo sát thích ứng theo phòng</td>
                <td>1:N SurveyAnswer, 1:1 SurveyRoomProfile, 1:N SurveyRoomPhoto</td>
                <td>Theo dõi tiến độ (true denominator) &amp; hủy câu con lỗi thời (Stale Invalidation)</td>
              </tr>
              <tr>
                <td><code className="inline">RoomImage</code> &amp; <code className="inline">VisionAnalysis</code></td>
                <td>Ảnh hộ gia đình riêng tư &amp; phiên AI Vision</td>
                <td>1:N ObjectDetection, 1:N VisionObservation, 1:N VisionClarification</td>
                <td>Lưu tách riêng trong SAFEHOME_PRIVATE_DIR, phục vụ qua HMAC signed/session URL</td>
              </tr>
              <tr>
                <td><code className="inline">Assessment</code> &amp; <code className="inline">HazardFinding</code></td>
                <td>Thẩm định môi trường theo RISK-001..008</td>
                <td>N:1 Room, 1:N Recommendation</td>
                <td>Tách rõ dataPartition (REAL/DEMO), idempotencyKey &amp; persistenceStatus</td>
              </tr>
              <tr>
                <td><code className="inline">RoomSnapshotRecord</code></td>
                <td>Snapshot bất biến Before / After v1</td>
                <td>N:1 Room (BASELINE / PROPOSED / POST)</td>
                <td>Phục vụ so sánh Before/After &amp; rollback có kiểm soát xung đột đồng thời</td>
              </tr>
              <tr>
                <td><code className="inline">ConsentRecord</code> &amp; <code className="inline">*AuditEvent</code></td>
                <td>Đồng ý xử lý dữ liệu &amp; nhật ký kiểm toán</td>
                <td>Hệ thống hộ gia đình cô lập</td>
                <td>Default-deny Gemini khi thiếu consent, ghi vết Persistence / Vision / Survey audit</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-title">
            <Lock size={18} color="var(--primary-hover)" />
            <span>Tiêu Chuẩn Bảo Mật, Cô Lập Hộ &amp; Quyền Riêng Tư</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Dữ liệu không gian sống và hình ảnh gia đình được cô lập theo tài khoản qua <strong>withAccount()</strong> trên toàn bộ 59 API nghiệp vụ:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Cắt bỏ APP1/EXIF &amp; Magic Bytes:</strong> Kiểm tra byte header (JPEG/PNG/WebP &le; 10MB) và xóa metadata EXIF trước suy luận/lưu trữ.</li>
            <li><strong>SQLite riêng từng hộ gia đình:</strong> Định danh trong <code className="inline">.private/accounts.db</code>, dữ liệu &amp; ảnh riêng trong <code className="inline">SAFEHOME_PRIVATE_DIR</code>.</li>
            <li><strong>Chặn mặc định AI bên thứ ba:</strong> Chỉ gửi ảnh sang Gemini khi có <code className="inline">ConsentRecord</code> hiệu lực; hỗ trợ xóa dây chuyền toàn bộ phòng/tài khoản.</li>
          </ul>
        </div>

        <div className="card">
          <div className="card-title">
            <GitBranch size={18} color="var(--primary-hover)" />
            <span>Đảm Bảo Tính Nhất Quán Trạng Thái (State Integrity)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Khi người dùng cập nhật hoặc thu hồi bằng chứng:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Stale Invalidation &amp; Retraction:</strong> Sửa câu trả lời về <code className="inline">unknown</code> hoặc xóa ảnh sẽ thu hồi các <code className="inline">VisionRoomFact</code> &amp; nguy cơ phụ thuộc.</li>
            <li><strong>Snapshot Bất Biến v1:</strong> Baseline gốc không bao giờ bị ghi đè khi chạy kịch bản mô phỏng hoặc hậu kiểm.</li>
            <li><strong>Audit Trail:</strong> Ghi vết đầy đủ trong <code className="inline">PersistenceAuditEvent</code>, <code className="inline">VisionAuditEvent</code> và <code className="inline">SurveyAuditEvent</code>.</li>
          </ul>
        </div>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.8rem' }}>Lược Đồ Prisma (Trích Từ 31 Models Thực Tế)</h2>
        <CodeBlock
          label="prisma/schema.prisma"
          code={`model Room {
  id              String   @id @default(uuid())
  homeId          String
  name            String
  roomType        String   // BEDROOM, BATHROOM, LIVING_ROOM
  width           Float    // meters
  length          Float    // meters
  height          Float    // meters
  floorMaterial   String
  lightingLevel   Float?
  isWet           Boolean  @default(false)
  isSlipResistant Boolean  @default(true)
  grabBarsCount   Int      @default(0)

  sceneObjects SceneObject[]
  scenarios    SimulationScenario[]
  assessments  Assessment[]
  snapshots    RoomSnapshotRecord[]
}`}
        />
      </section>
    </div>
  )
}
