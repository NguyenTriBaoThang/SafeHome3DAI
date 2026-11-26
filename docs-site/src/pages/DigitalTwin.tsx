import { Box, Layers, Sun, FolderHeart, Home } from 'lucide-react'
import { VisualGallery } from '../components/VisualGallery'

export default function DigitalTwin() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>3D Digital Twin & Photorealistic Dollhouse</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Mô hình hóa không gian 3D tương tác thời gian thực, cảnh tham chiếu kiến trúc photorealistic dollhouse, điều khiển ánh sáng/mặt sàn và thuật toán gom cụm nhãn chống đè lấn.
        </p>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-title">
            <Home size={18} color="var(--primary-hover)" />
            <span>Mô Hình Photorealistic Dollhouse (/digital-twin) &amp; Tour /experience</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Không gian kiến trúc tham chiếu mô phỏng phòng ngủ và nhà vệ sinh khép kín kèm phân hệ trải nghiệm 6 chương <strong>/experience</strong>:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Đa chế độ góc nhìn:</strong> Dollhouse, Tầm mắt / Nội thất, Mặt bằng 2D, Đi bộ (Walkthrough), Nguy cơ và So sánh Trước/Sau.</li>
            <li><strong>Đặt &amp; bám vật thể (<code className="inline">scenePlacement.ts</code>):</strong> Tự động kẹp biên phòng, bám tường theo hướng quay và tựa mặt phẳng cho đèn/cáp.</li>
            <li><strong>Phục hồi WebGL (<code className="inline">WebGLBoundary</code>):</strong> Nếu trình duyệt không khởi tạo được WebGL, giao diện chuyển mượt sang bảng dữ liệu phòng &amp; nguy cơ.</li>
          </ul>
        </section>

        <section className="card">
          <div className="card-title">
            <Sun size={18} color="var(--warning)" />
            <span>Tách Bạch Ánh Sáng Hiển Thị 3D &amp; Độ Chất Lượng (B08)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Quản lý qua <code className="inline">src/lib/three/lightingModel.ts</code> để tránh nhầm lẫn giữa đồ họa WebGL và số đo lux thực tế:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Preset hiển thị 3D (Sáng sớm, Ban ngày, Chiều ấm, Ban đêm, Studio):</strong> Chỉ điều chỉnh cường độ ánh sáng &amp; tone mapping trong Three.js, không ghi đè điểm an toàn hay dữ liệu đo lux thật.</li>
            <li><strong>Cấu hình chất lượng (LOW / MEDIUM / HIGH):</strong> Tùy biến DPR, shadows và PBR Environment cho máy cấu hình thấp và mobile.</li>
            <li><strong>Bản dựng từ ảnh (<code className="inline">PHOTO_DRAFT</code>):</strong> Gắn nhãn ước lượng gần đúng, yêu cầu đo đạc tại nhà trước khi chấm điểm rủi ro.</li>
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="card-title">
          <Layers size={18} color="var(--primary-hover)" />
          <span>Thuật Toán Gom Cụm Nhãn Thông Minh (Smart Marker Clustering &lt;0.95m)</span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Giải quyết triệt để vấn đề <strong>nhãn 3D bị đè lấn, rối mắt</strong> khi nhiều nguy cơ nằm cạnh nhau trong không gian nhỏ:
        </p>

        <pre>{`// Thuật toán gom cụm khoảng cách Euclidean 3D
const CLUSTER_DISTANCE_THRESHOLD = 0.95; // Bán kính 0.95 mét

// Khi khoảng cách giữa 2 nguy cơ d = sqrt((x1-x2)^2 + (z1-z2)^2) < 0.95m
// Hệ thống tự động gộp các nhãn riêng lẻ thành một thẻ cụm duy nhất:
// Ví dụ: "[Nguy cơ High: Thảm trượt] + [Nguy cơ Low: Hộp carton]" 
// ─────────► Thẻ gom cụm: "[🔴 +2 Nguy cơ tại Lối đi]" (Bấm để xem danh sách mở rộng)`}</pre>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '6px' }}>
            <strong style={{ color: 'var(--danger)' }}>Trước khi gom cụm:</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              6 nhãn nguy cơ chồng chéo lên nhau tại góc phòng, người dùng không thể đọc được nội dung hoặc bấm chọn chính xác.
            </p>
          </div>
          <div style={{ flex: 1, minWidth: '240px', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '6px' }}>
            <strong style={{ color: 'var(--success)' }}>Sau khi gom cụm (&lt;0.95m):</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Giao diện 3D sạch sẽ, nhãn gom cụm hiển thị số lượng nguy cơ tổng hợp, mở rộng danh sách chi tiết khi nhấp chuột.
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <FolderHeart size={18} color="var(--primary-hover)" />
          <span>Kho Lưu Trữ Mô Phỏng 3D Đa Phòng (/simulations)</span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Cho phép gia đình và kỹ sư y tế lưu lại nhiều kịch bản cải tạo khác nhau để so sánh hiệu quả chi phí:
        </p>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <li>Lưu trữ trạng thái đầy đủ bao gồm cấu hình đèn, thảm, thanh vịn và điểm an toàn tính toán tương ứng.</li>
          <li>Xem lại danh sách tất cả các phòng đã tạo trong kho mô phỏng tập trung.</li>
          <li>Tải lại cấu hình vào Digital Twin chỉ với 1 cú nhấp chuột.</li>
        </ul>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--cyan)' }}>■</span> Ảnh Chụp Thực Tế Bản Sao Số 3D & Không Gian Dollhouse
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
          Mô hình Dollhouse phòng ngủ & nhà vệ sinh photorealistic với ánh sáng Studio 320 Lux và sàn chống trượt:
        </p>
        <VisualGallery filterCategory="twin" />
      </section>
    </div>
  )
}
