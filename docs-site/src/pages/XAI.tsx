import { GitPullRequest, Search, FileCheck, CheckCircle2, BookOpen } from 'lucide-react'
import { VisualGallery } from '../components/VisualGallery'

export default function XAI() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>Rule-Based Decision Provenance &amp; SafeHome Copilot</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Truy vết quyết định theo quy tắc qua đồ thị ReactFlow (tách biệt với model explainability nội tại của Gemini/LLM) và trợ lý hỏi đáp có căn cứ y khoa (Grounded RAG) kèm ngăn tra cứu bằng chứng 4 tab.
        </p>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-title">
            <GitPullRequest size={18} color="var(--primary-hover)" />
            <span>Đồ Thị Truy Xuất Nguồn Gốc Quyết Định (/explainability)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Ứng dụng công nghệ React Flow (@xyflow/react), hệ thống vẽ sơ đồ trực quan từng bước suy luận dẫn đến cảnh báo nguy cơ:
          </p>
          <pre>{`[Không gian phòng]
  └─ Phòng ngủ / Toilet
         │
         ▼
[Vật thể 3D nhận diện]
  └─ Bàn trà góc nhọn / Dây điện / Thảm
         │
         ▼
[Số đo không gian]
  └─ Khoảng cách lối đi < 90cm / Độ rọi < 50 Lux
         │
         ▼
[Quy chuẩn y tế vi phạm]
  └─ WHO 2021 & CDC STEADI Checklist
         │
         ▼
[Nguy cơ cảnh báo & Can thiệp]
  └─ Đề xuất vật tư, chi phí dự toán & hướng dẫn thi công`}</pre>
        </section>

        <section className="card">
          <div className="card-title">
            <Search size={18} color="var(--success)" />
            <span>Trợ Lý Tra Cứu Y Khoa Có Căn Cứ (/ai-assistant)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Trợ lý AI tích hợp kho tri thức y học chứng cứ đã được lập chỉ mục vector và ngăn tra cứu 4 tab:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>SafeHomeMarkdown:</strong> Định dạng tiêu đề y khoa, thẻ bài học, hộp cảnh báo an toàn và các số trích dẫn tương tác <code className="inline">[1]</code>, <code className="inline">[2]</code>.</li>
            <li><strong>Ngăn tra cứu bằng chứng 4 Tab:</strong>
              <ul style={{ paddingLeft: '1rem', marginTop: '0.2rem' }}>
                <li><em>Bằng chứng:</em> Xem nguyên văn đoạn trích, số trang và link cổng thông tin chính thức.</li>
                <li><em>Vật dụng:</em> Quản lý lịch sử các vật dụng đã thẩm định qua ảnh.</li>
                <li><em>Kho nguồn:</em> Danh mục các nguồn tài liệu y tế chuẩn mực được kiểm duyệt.</li>
                <li><em>Thẩm định RAG:</em> Báo cáo đánh giá chất lượng câu trả lời theo 8 tiêu chí.</li>
              </ul>
            </li>
            <li><strong>Phòng chống ảo giác (Evidence Fallback Active):</strong> Tự động kích hoạt chế độ fallback an toàn khi thiếu tài liệu kiểm chứng, không bao giờ tự bịa số liệu.</li>
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="card-title">
          <FileCheck size={18} color="var(--primary-hover)" />
          <span>Bảo Đảm Tính Minh Bạch & Trách Nhiệm Giải Trình (Accountability)</span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Trong y tế kỹ thuật số, nguyên tắc "hộp đen" (Black Box) là không thể chấp nhận. SafeHome 3D AI xây dựng 3 lớp bảo vệ trách nhiệm giải trình:
        </p>

        <div className="grid-3" style={{ marginTop: '0.75rem' }}>
          <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '6px' }}>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>Dấu vết kiểm toán (Audit Trail)</span>
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Mỗi hành động sửa đổi dữ liệu khảo sát, hình ảnh hay kịch bản mô phỏng đều được ghi nhận thời gian và người thực hiện.
            </p>
          </div>

          <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '6px' }}>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>Đối chiếu Snapshot Trước / Sau</span>
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Biểu đồ &amp; API v1 so sánh trạng thái yếu tố môi trường giữa snapshot Baseline và sau cải tạo (chưa tuyên bố giảm tỷ lệ ngã lâm sàng).
            </p>
          </div>

          <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '6px' }}>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span>Xuất báo cáo PDF chuẩn</span>
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Tạo báo cáo hành động chi tiết có thể in ấn hoặc chia sẻ trực tiếp cho bác sĩ lão khoa và gia đình người cao tuổi.
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--cyan)' }}>■</span> Ảnh Chụp Thực Tế Giải Trình AI & Trợ Lý RAG
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
          Đồ thị quyết định ReactFlow minh bạch không hộp đen và giao diện hỏi đáp có dẫn nguồn tài liệu WHO/CDC/BYT:
        </p>
        <VisualGallery />
      </section>
    </div>
  )
}
