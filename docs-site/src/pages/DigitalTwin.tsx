import { Box, Layers, Sun, FolderHeart, Home } from 'lucide-react'

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
            <span>Mô Hình Photorealistic Dollhouse (/digital-twin)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Không gian kiến trúc tham chiếu mô phỏng chi tiết phòng ngủ và nhà vệ sinh khép kín của người cao tuổi:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>6 Chế độ góc nhìn:</strong> Dollhouse toàn cảnh, Tầm mắt người già, Mặt bằng 2D, Walkthrough đi dạo, Tự căn chỉnh (Fit) và Chụp ảnh màn hình (Snapshot).</li>
            <li><strong>Tương tác vật thể:</strong> Bấm chọn bất kỳ đồ nội thất nào trong 3D để xem thông số kỹ thuật, chiều cao nệm, kiểm tra rủi ro.</li>
            <li><strong>Hành lang di chuyển an toàn:</strong> Trực quan hóa luồng giao thông từ giường đến cửa ra vào và toilet.</li>
          </ul>
        </section>

        <section className="card">
          <div className="card-title">
            <Sun size={18} color="var(--warning)" />
            <span>Studio Chiếu Sáng & Ma Sát Sàn Động</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Mô phỏng tức thì các điều kiện rủi ro cao theo tiêu chuẩn y khoa:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Chế độ ánh sáng đặt trước:</strong> Hoàng hôn, Ban ngày (250 Lux), Ban đêm (40 Lux — ngưỡng nguy cơ ngã), Studio (320 Lux).</li>
            <li><strong>Thanh trượt độ rọi (Lux):</strong> Điều chỉnh liên tục từ 0 đến 520 Lux.</li>
            <li><strong>Mô phỏng mặt sàn trơn:</strong> Bật/tắt trạng thái Sàn khô ráo vs Sàn ướt.</li>
            <li><strong>Bổ sung thiết bị chống ngã:</strong> Bật/tắt thanh vịn bồn cầu, thanh vịn vòi sen, thảm cao su chống trượt giác hút.</li>
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
