import { Shield, CheckCircle2, ArrowRight, Activity, Eye, Box, FileText, Cpu, AlertTriangle } from 'lucide-react'
import { SYSTEM_STATS } from '../data/site'

export default function Overview() {
  return (
    <div className="page">
      <div style={{ width: '100%', overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <img src="./banner.png" alt="SafeHome 3D AI Banner" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      <section className="hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-hover)', fontWeight: 600 }}>
          <Shield size={20} />
          <span>NỀN TẢNG Y TẾ DỰ PHÒNG & THỊ GIÁC SỐ</span>
        </div>
        <h1>SafeHome 3D AI — Nhà An Toàn, Tuổi Già An Tâm</h1>
        <p className="tagline">
          Hệ sinh thái thông minh tích hợp Khảo sát thích ứng, Thị giác AI đa phương thức, Bản sao số 3D không gian và Động cơ đánh giá nguy cơ y khoa tất định theo chuẩn WHO 2021 & CDC STEADI.
        </p>

        <div className="hero-stats">
          {SYSTEM_STATS.map((s, idx) => (
            <div key={idx} className="stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '1rem' }}>Bối Cảnh Thực Tế & Thách Thức Nguy Cơ Trượt Ngã</h2>
        <div className="grid-2">
          <div className="card">
            <div className="card-title">
              <AlertTriangle size={20} color="var(--warning)" />
              <span>Vấn nạn trượt ngã ở người cao tuổi</span>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              Theo Tổ chức Y tế Thế giới (WHO 2021) và Trung tâm Kiểm soát & Phòng ngừa Dịch bệnh Hoa Kỳ (CDC STEADI), trượt ngã là nguyên nhân hàng đầu gây chấn thương tử vong và gãy xương đùi ở người trên 65 tuổi.
            </p>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Hơn 50% ca ngã</strong> xảy ra ngay trong nhà (phòng ngủ, lối đi vệ sinh ban đêm, phòng tắm trơn trượt).</li>
              <li>Các bảng kiểm tra (checklist) bằng giấy truyền thống thường <strong>dài dòng, thiếu trực quan và dễ bị bỏ qua</strong>.</li>
              <li>Mô hình AI đàm thoại thông thường có nguy cơ <strong>ảo giác (hallucination)</strong> về các chỉ số y khoa và kích thước không gian.</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-title">
              <Shield size={20} color="var(--primary)" />
              <span>Giải pháp khép kín của SafeHome 3D AI</span>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              SafeHome 3D AI kết hợp thị giác máy tính, bản sao số 3D và thuật toán y tế tất định (Deterministic Clinical Rules) để số hóa toàn bộ quy trình:
            </p>
            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Khảo sát AI thích ứng:</strong> Tự động tỉa nhánh, bỏ qua câu hỏi dư thừa, hỗ trợ NLP tiếng Việt.</li>
              <li><strong>Thị giác máy tính bảo mật:</strong> Xác thực Magic Bytes, loại bỏ EXIF GPS, nhận diện vật thể nguy hại.</li>
              <li><strong>Bản sao số 3D WebGL:</strong> Mô phỏng trực quan không gian thực tế với thuật toán gom cụm nhãn &lt;0.95m.</li>
              <li><strong>Chấm điểm tất định 100%:</strong> Loại bỏ hoàn toàn ảo giác AI trong đánh giá nguy cơ lâm sàng.</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '1rem' }}>Hành Trình 7 Bước Khép Kín (7-Step Unified Flow)</h2>
        <div className="grid-3">
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-info">Bước 01</span>
              <FileText size={18} color="var(--primary-hover)" />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.05rem' }}>Khảo sát thông minh</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Khảo sát từng bước với câu hỏi động, tỉa nhánh và cơ chế tự động hủy dữ liệu cũ (Stale Dependency Invalidation).
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-info">Bước 02</span>
              <Eye size={18} color="var(--primary-hover)" />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.05rem' }}>Thị giác AI (Vision)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Tải ảnh hiện trạng phòng ngủ, định danh vật thể với bounding box và xác thực người dùng trước khi lưu.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-info">Bước 03</span>
              <Box size={18} color="var(--primary-hover)" />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.05rem' }}>Bản sao số 3D</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Tái tạo không gian số hóa với Three.js, chiếu sáng Lux, bề mặt sàn và thuật toán gom cụm nhãn chống đè lấn.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-warning">Bước 04</span>
              <Activity size={18} color="var(--warning)" />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.05rem' }}>Đánh giá nguy cơ y khoa</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Thực thi 8 quy tắc lâm sàng tất định (WHO 2021 & CDC STEADI), chấm điểm an toàn /100 không ảo giác.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-info">Bước 05</span>
              <Cpu size={18} color="var(--primary-hover)" />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.05rem' }}>Mô phỏng kịch bản</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Thử nghiệm can thiệp cải tạo trực tiếp trong không gian 3D (lắp đèn cảm ứng, dán thảm, kê thanh vịn).
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-success">Bước 06 & 07</span>
              <CheckCircle2 size={18} color="var(--success)" />
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.05rem' }}>So sánh & Báo cáo PDF</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Radar biểu đồ Trước/Sau can thiệp và xuất báo cáo kế hoạch hành động chuẩn hóa cho bác sĩ & gia đình.
            </p>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
        <a href="#/architecture" className="icon-btn" style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', background: 'var(--primary)', color: '#fff' }}>
          <span>Xem tiếp Kiến Trúc Hệ Thống</span>
          <ArrowRight size={18} />
        </a>
      </div>
    </div>
  )
}

