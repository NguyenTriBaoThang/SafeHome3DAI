import { ShieldCheck, Camera, Scan, AlertCircle, Sparkles, MapPin } from 'lucide-react'
import { VisualGallery } from '../components/VisualGallery'

export default function Vision() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>Multimodal AI Vision Studio & Item Hazard Assessment</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Phân tích hình ảnh hiện trạng không gian sống, quét toàn cảnh phòng dựng 3D và thẩm định chuyên sâu nguy cơ từng vật dụng theo chuẩn y khoa CDC STEADI & WHO 2021.
        </p>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-title">
            <ShieldCheck size={18} color="var(--primary-hover)" />
            <span>Xác Thực Magic Bytes & Bảo Mật Đầu Vào</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Ngăn chặn mã độc đội lốt file ảnh và tấn công giả mạo đuôi file (MIME spoofing):
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Kiểm tra Magic Bytes:</strong> Đọc trực tiếp byte header của buffer (JPEG: <code className="inline">FF D8 FF</code>, PNG: <code className="inline">89 50 4E 47</code>, WEBP: <code className="inline">52 49 46 46</code>).</li>
            <li><strong>Giới hạn an toàn:</strong> Giới hạn dung lượng tối đa 10MB, độ phân giải tối đa 4096 &times; 4096 px.</li>
            <li><strong>Lưu trữ biệt lập:</strong> Lưu trong thư mục tĩnh bảo vệ, tạo hash ngẫu nhiên không lộ tên file gốc.</li>
          </ul>
        </section>

        <section className="card">
          <div className="card-title">
            <Camera size={18} color="var(--success)" />
            <span>Loại Bỏ Hoàn Toàn EXIF & GPS Metadata</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Đảm bảo quyền riêng tư tuyệt đối cho không gian sinh hoạt của người cao tuổi:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Cắt bỏ GPS:</strong> Tọa độ định vị địa lý (kinh độ, vĩ độ) của ngôi nhà bị xóa vĩnh viễn trước khi lưu trữ.</li>
            <li><strong>Xóa nhãn thiết bị:</strong> Xóa thông số model điện thoại, ngày giờ chụp, phần mềm chỉnh sửa.</li>
            <li><strong>Zero Cloud Leak:</strong> Không gửi dữ liệu định danh người dùng lên các dịch vụ bên thứ ba chưa cấp phép.</li>
          </ul>
        </section>
      </div>

      <section className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
        <div className="card-title">
          <Sparkles size={18} color="var(--accent)" />
          <span>Thẩm Định Nguy Cơ Vật Dụng Đơn Lẻ Qua Ảnh (CDC STEADI Standard)</span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Phân hệ chuyên biệt thẩm định khi người dùng tải ảnh một vật dụng cụ thể, trả lời 3 câu hỏi lâm sàng cốt lõi:
        </p>
        <div className="grid-2" style={{ marginTop: '0.75rem' }}>
          <div>
            <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.3rem' }}>1. Mức Độ Nguy Hiểm Bao Nhiêu?</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Chấm điểm rủi ro khách quan (0-100), phân tầng ưu tiên (KHẨN CẤP, ƯU TIÊN CAO, TRUNG BÌNH, THẤP) và mức độ nghiêm trọng (CRITICAL, HIGH, MEDIUM, LOW).
            </p>
            <h4 style={{ color: '#fff', fontSize: '1rem', marginTop: '0.75rem', marginBottom: '0.3rem' }}>2. Tại Sao Nguy Hiểm?</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Phân tích cơ chế sinh cơ học: Lực va đập góc nhọn (Focal Impact), hệ số ma sát trượt thấp (&mu; &lt; 0.4), ảo giác chiều sâu mặt kính, thu hẹp khoảng thông thủy lối đi (&lt;90cm).
            </p>
          </div>
          <div>
            <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.3rem' }}>3. Nguy Hiểm Ở Chỗ Nào? (Hotspots H1..H4)</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Gắn điểm ghim nguy cơ tương tác (H1, H2, H3, H4) trực tiếp trên ảnh kèm tính năng nhấp để điều chỉnh vị trí ghim (Click-to-reposition).
            </p>
            <h4 style={{ color: '#fff', fontSize: '1rem', marginTop: '0.75rem', marginBottom: '0.3rem' }}>4. Biện Pháp Cải Thiện & Dự Toán</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Lộ trình khắc phục từng bước, vật tư cần chuẩn bị, chi phí ước tính (VND) và thời gian thi công.
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <Scan size={18} color="var(--primary-hover)" />
          <span>Quy Trình Nhận Diện Vật Thể & Lưới Phân Loại (Taxonomy 18 Lớp)</span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Hệ thống ánh xạ trực tiếp các vật thể nhận diện được từ mô hình thị giác thành 18 phân lớp đối tượng liên quan trực tiếp đến an toàn ngã:
        </p>

        <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
          <table>
            <thead>
              <tr>
                <th>Lớp đối tượng nhận diện</th>
                <th>Phân loại rủi ro</th>
                <th>Quy tắc đánh giá kích hoạt</th>
                <th>Hành động đề xuất y tế</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className="inline">rug / loose_carpet</code></td>
                <td><span className="badge badge-danger">High Risk</span></td>
                <td><code className="inline">RUG_NO_GRIP</code></td>
                <td>Loại bỏ hoặc dán keo chống trượt 2 mặt chuyên dụng</td>
              </tr>
              <tr>
                <td><code className="inline">bed / mattress</code></td>
                <td><span className="badge badge-warning">Medium Risk</span></td>
                <td><code className="inline">BED_HEIGHT_UNSAFE</code></td>
                <td>Đo đạc kiểm tra chiều cao an toàn 45-50cm</td>
              </tr>
              <tr>
                <td><code className="inline">electrical_cord / wire</code></td>
                <td><span className="badge badge-danger">High Risk</span></td>
                <td><code className="inline">CLUTTER_ON_FLOOR</code></td>
                <td>Nẹp dây điện men theo chân tường, giải phóng lối đi</td>
              </tr>
              <tr>
                <td><code className="inline">clutter / shoes / boxes</code></td>
                <td><span className="badge badge-danger">High Risk</span></td>
                <td><code className="inline">CLUTTER_ON_FLOOR</code></td>
                <td>Dọn dẹp vật cản trên hành lang di chuyển ban đêm</td>
              </tr>
              <tr>
                <td><code className="inline">table / sharp_corners</code></td>
                <td><span className="badge badge-danger">High Risk</span></td>
                <td><code className="inline">PATH_OBSTRUCTION</code></td>
                <td>Bọc đệm silicon bo tròn góc nhọn, dịch chuyển sát tường</td>
              </tr>
              <tr>
                <td><code className="inline">grab_bar / rail</code></td>
                <td><span className="badge badge-success">Protective</span></td>
                <td><code className="inline">NO_BATH_GRAB_BAR (Phủ định)</code></td>
                <td>Ghi nhận yếu tố bảo vệ đã có</td>
              </tr>
              <tr>
                <td><code className="inline">nightlight / lamp</code></td>
                <td><span className="badge badge-success">Protective</span></td>
                <td><code className="inline">NO_NIGHT_LIGHT (Phủ định)</code></td>
                <td>Ghi nhận hệ thống chiếu sáng ban đêm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          <AlertCircle size={18} color="var(--warning)" />
          <span>Cơ Chế Xác Nhận Của Người Dùng (Human-in-the-Loop Gatekeeper)</span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Trí tuệ nhân tạo thị giác là công cụ hỗ trợ gợi ý, <strong>không tự ý đưa ra kết luận y khoa đơn phương</strong>:
        </p>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <li>Mỗi vật thể phát hiện được hiển thị kèm theo khung nhận diện (Bounding Box) và hệ số tin cậy (Confidence Score).</li>
          <li>Khung bao SVG kết hợp lớp phủ nhãn CSS HTML Overlay loại bỏ triệt để hiện tượng phóng đại cỡ chữ trong trình duyệt Chromium.</li>
          <li>Người dùng có quyền <strong>Xác nhận</strong>, <strong>Điều chỉnh vị trí</strong>, hoặc <strong>Loại bỏ</strong> các phát hiện không chính xác trước khi đưa vào hồ sơ đánh giá rủi ro.</li>
          <li>Ngăn chặn hoàn toàn sai sót nhận diện lan truyền vào mô hình 3D và báo cáo y tế chính thức.</li>
        </ul>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--cyan)' }}>■</span> Ảnh Chụp Thực Tế Phân Hệ Thị Giác & Thẩm Định Vật Dụng
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
          Ảnh chụp trực tiếp từ Vision Intelligence Studio và Modal Thẩm định rủi ro vật thể qua ảnh theo chuẩn CDC STEADI:
        </p>
        <VisualGallery filterCategory="vision" />
      </section>
    </div>
  )
}
