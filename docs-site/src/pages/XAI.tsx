import { GitPullRequest, Search, FileCheck, CheckCircle2 } from 'lucide-react'

export default function XAI() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>Explainable AI (XAI) & RAG Copilot</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Hệ thống giải trình quyết định AI minh bạch qua đồ thị quyết định và trợ lý hỏi đáp có căn cứ y khoa (Grounded RAG).
        </p>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-title">
            <GitPullRequest size={18} color="var(--primary-hover)" />
            <span>Sơ Đồ Giải Trình Quyết Định (XAI Decision Graph)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Ứng dụng công nghệ React Flow (@xyflow/react), hệ thống vẽ sơ đồ trực quan từng bước suy luận dẫn đến cảnh báo nguy cơ:
          </p>
          <pre>{`[Dữ liệu gốc]
  ├─ Câu hỏi BED_006: "Có thảm"
  └─ Câu hỏi BED_007: "Chưa dán cố định"
         │
         ▼
[Động cơ quy tắc]
  └─ Quy tắc RUG_NO_GRIP vi phạm (-20 điểm)
         │
         ▼
[Căn cứ khoa học]
  └─ CDC STEADI Checklist: "Loose throw rugs"
         │
         ▼
[Hành động can thiệp]
  └─ Dán băng dính 2 mặt hoặc đổi thảm chống trượt`}</pre>
        </section>

        <section className="card">
          <div className="card-title">
            <Search size={18} color="var(--success)" />
            <span>Trợ Lý Tra Cứu Y Khoa Có Căn Cứ (RAG Copilot)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Trợ lý AI tích hợp kho tri thức y học chứng cứ đã được lập chỉ mục vector:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Truy xuất chuẩn xác (Dense Retrieval):</strong> Tìm kiếm ngữ nghĩa trong cẩm nang WHO 2021 và CDC STEADI.</li>
            <li><strong>Dẫn nguồn trích dẫn:</strong> Mỗi câu trả lời của AI Copilot bắt buộc phải đính kèm liên kết trích dẫn rõ ràng.</li>
            <li><strong>Tuyên bố miễn trừ trách nhiệm y tế:</strong> Hệ thống tự động kèm khuyến cáo rằng AI chỉ mang tính chất hỗ trợ tầm soát, không thay thế chẩn đoán y khoa chính thức.</li>
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
              <span>Đối chiếu trước/sau</span>
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Biểu đồ Radar so sánh định lượng tỷ lệ giảm nguy cơ ngã giữa hiện trạng ban đầu và sau khi hoàn thành can thiệp.
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
    </div>
  )
}

