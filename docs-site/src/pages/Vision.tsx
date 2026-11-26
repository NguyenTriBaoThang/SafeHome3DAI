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
            <li><strong>Kiểm tra Magic Bytes:</strong> Đọc byte header của buffer (JPEG: <code className="inline">FF D8 FF</code>, PNG: <code className="inline">89 50 4E 47</code>, WebP: <code className="inline">52 49 46 46</code>).</li>
            <li><strong>Camera trực tiếp (<code className="inline">LiveCameraCaptureModal</code>):</strong> Hỗ trợ mở camera qua <code className="inline">getUserMedia</code>, đổi máy ảnh trước/sau và cảnh báo thiếu sáng (&lt;50 Lux giả lập khung hình).</li>
            <li><strong>Lưu trữ riêng tư theo hộ:</strong> Lưu trong thư mục <code className="inline">SAFEHOME_PRIVATE_DIR</code> (tối đa 10MB/ảnh), chỉ truy xuất qua phiên/chữ ký HMAC và yêu cầu đồng ý <code className="inline">ConsentRecord</code>.</li>
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
          Định nghĩa chuẩn tại <code className="inline">src/lib/vision/taxonomy.ts</code> gồm 18 phân lớp: <code className="inline">bed</code>, <code className="inline">chair</code>, <code className="inline">table</code>, <code className="inline">cabinet</code>, <code className="inline">nightstand</code>, <code className="inline">door</code>, <code className="inline">toilet</code>, <code className="inline">sink</code>, <code className="inline">bathtub</code>, <code className="inline">sofa</code>, <code className="inline">rug</code>, <code className="inline">electrical_cable</code>, <code className="inline">grab_bar</code>, <code className="inline">obstacle_route</code>, <code className="inline">threshold_step</code>, <code className="inline">lamp</code>, <code className="inline">light_switch</code>, <code className="inline">other</code>.
        </p>

        <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
          <table>
            <thead>
              <tr>
                <th>Lớp đối tượng chuẩn (taxonomy.ts)</th>
                <th>Tính chất</th>
                <th>Quy tắc liên kết</th>
                <th>Nguyên tắc xử lý dữ liệu</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className="inline">rug</code></td>
                <td><span className="badge badge-danger">Risk Candidate</span></td>
                <td><code className="inline">RISK-001</code></td>
                <td>Cần xác nhận độ bám/dán cố định mép thảm tại nhà</td>
              </tr>
              <tr>
                <td><code className="inline">electrical_cable</code></td>
                <td><span className="badge badge-danger">Risk Candidate</span></td>
                <td><code className="inline">RISK-002</code></td>
                <td>Kiểm tra dây vắt ngang lối đi hay đã luồn nẹp sát tường</td>
              </tr>
              <tr>
                <td><code className="inline">obstacle_route</code> / <code className="inline">threshold_step</code></td>
                <td><span className="badge badge-warning">Measurement Req</span></td>
                <td><code className="inline">RISK-003</code> / <code className="inline">RISK-007</code></td>
                <td>Không tự suy chiều rộng lối đi hay độ cao gờ từ một ảnh đơn</td>
              </tr>
              <tr>
                <td><code className="inline">bed</code> / <code className="inline">table</code></td>
                <td><span className="badge badge-partial">Review Required</span></td>
                <td><code className="inline">RISK-007</code> / <code className="inline">RISK-008</code></td>
                <td>Kiểm tra chiều cao mặt nệm thực tế (45–55 cm) &amp; góc cạnh</td>
              </tr>
              <tr>
                <td><code className="inline">grab_bar</code></td>
                <td><span className="badge badge-success">Protective</span></td>
                <td><code className="inline">RISK-006</code></td>
                <td>Xác nhận đủ vị trí bồn cầu, vòi sen và khả năng chịu tải thực tế</td>
              </tr>
              <tr>
                <td><code className="inline">lamp</code> / <code className="inline">light_switch</code></td>
                <td><span className="badge badge-partial">No Lux Guessing</span></td>
                <td><code className="inline">RISK-004</code> / <code className="inline">RISK-008</code></td>
                <td>Không tự suy độ sáng Lux hay tầm với ban đêm chỉ từ việc nhìn thấy đèn/công tắc</td>
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
