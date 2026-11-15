import { Box, Layers, Sun, FolderHeart } from 'lucide-react'

export default function DigitalTwin() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>3D Digital Twin & Spatial Clustering</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Mô hình hóa không gian 3D tương tác thời gian thực, thuật toán gom cụm nhãn chống đè lấn và kho lưu trữ kịch bản mô phỏng.
        </p>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-title">
            <Box size={18} color="var(--primary-hover)" />
            <span>Không Gian Số Hóa 3D Thời Gian Thực (WebGL)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Xây dựng trên nền tảng Three.js và React Three Fiber, tái hiện chân thực không gian phòng với tỷ lệ 1:1:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Đa góc nhìn:</strong> Chuyển đổi linh hoạt giữa góc phối cảnh Isometric, Mặt bằng phẳng (Top 2D) và Chính diện (Front).</li>
            <li><strong>Tương tác vật thể:</strong> Bấm chọn vật thể để kiểm tra thông số vật lý (chiều cao nệm, độ bám sàn, kích thước).</li>
            <li><strong>Hành lang di chuyển an toàn:</strong> Vẽ luồng di chuyển từ giường ngủ ra cửa/nhà vệ sinh với cảnh báo vật cản.</li>
          </ul>
        </section>

        <section className="card">
          <div className="card-title">
            <Sun size={18} color="var(--warning)" />
            <span>Mô Phỏng Môi Trường Động (Environmental Controls)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Mô phỏng tức thì các điều kiện rủi ro cao vào ban đêm:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Thanh trượt độ rọi (Lux):</strong> Giảm ánh sáng xuống mức đêm tối (50 Lux) hoặc tăng lên mức an toàn (150+ Lux).</li>
            <li><strong>Mô phỏng mặt sàn trơn:</strong> Bật/tắt trạng thái sàn ướt để quan sát nguy cơ trượt té tức thì.</li>
            <li><strong>Lớp chống trượt:</strong> Thêm lớp phủ ma sát cao để trực quan hóa hiệu quả can thiệp giảm chấn.</li>
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
    </div>
  )
}
