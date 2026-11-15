import { BookOpen, Scale, Award } from 'lucide-react'

export default function RiskEngine() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>Deterministic Clinical Risk Engine</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Động cơ đánh giá nguy cơ y khoa tất định, chuẩn hóa 100% theo các hướng dẫn phòng chống ngã quốc tế (WHO 2021 & CDC STEADI).
        </p>
      </div>

      <div className="card">
        <div className="card-title">
          <Scale size={20} color="var(--primary-hover)" />
          <span>Nguyên Tắc Thiết Kế: Y Học Chứng Cứ Tất Định (Zero Hallucination)</span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Trong đánh giá an toàn sức khỏe và tính mạng người cao tuổi, <strong>không thể phó thác cho mô hình ngôn ngữ lớn (LLM) tự phỏng đoán điểm rủi ro</strong>. SafeHome 3D AI xây dựng bộ quy tắc toán học tất định (Deterministic Logic):
        </p>
        <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
          <li>Cùng một bộ dữ liệu đầu vào (chiều cao giường, độ rọi lux, trạng thái thảm) sẽ luôn cho ra <strong>chính xác 100% cùng một điểm an toàn</strong> và danh sách nguy cơ.</li>
          <li>Mỗi phát hiện nguy cơ đều gắn kèm <strong>nguồn trích dẫn y khoa chuẩn mực</strong> (chương mục trong tài liệu WHO 2021 hoặc CDC STEADI).</li>
          <li>Hệ số phạt điểm được tính toán khoa học dựa trên mức độ nghiêm trọng của chấn thương tiềm tàng.</li>
        </ul>
      </div>

      <section>
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '1rem' }}>Bảng Đăng Ký 8 Quy Tắc Nguy Cơ Lâm Sàng (Risk Rule Registry)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã Quy Tắc</th>
                <th>Mức Ưu Tiên</th>
                <th>Điều Kiện Kích Hoạt Nguy Cơ</th>
                <th>Trọng Số Điểm Phạt</th>
                <th>Căn Cứ Y Khoa Tham Chiếu</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className="inline">RUG_NO_GRIP</code></td>
                <td><span className="badge badge-danger">High</span></td>
                <td>Thảm không dán cố định hoặc thiếu lớp chống trượt trên lối đi</td>
                <td>-20 điểm</td>
                <td>CDC STEADI Environmental Checklist (Trang 2)</td>
              </tr>
              <tr>
                <td><code className="inline">BED_HEIGHT_UNSAFE</code></td>
                <td><span className="badge badge-warning">Medium</span></td>
                <td>Mặt nệm giường &lt;45cm hoặc &gt;50cm so với mặt sàn</td>
                <td>-15 điểm</td>
                <td>Tiêu chuẩn công thái học khớp gối người cao tuổi</td>
              </tr>
              <tr>
                <td><code className="inline">NIGHT_PATH_DARK</code></td>
                <td><span className="badge badge-danger">High</span></td>
                <td>Độ rọi lối đi ban đêm &lt;50 Lux và không có đèn cảm ứng</td>
                <td>-20 điểm</td>
                <td>WHO Global Report on Fall Prevention (Mục 3.2)</td>
              </tr>
              <tr>
                <td><code className="inline">NO_BATH_GRAB_BAR</code></td>
                <td><span className="badge badge-danger">Critical</span></td>
                <td>Thiếu thanh vịn trợ lực tại bồn cầu hoặc vòi sen</td>
                <td>-25 điểm</td>
                <td>ADA Standards for Accessible Design & CDC STEADI</td>
              </tr>
              <tr>
                <td><code className="inline">CLUTTER_ON_FLOOR</code></td>
                <td><span className="badge badge-danger">High</span></td>
                <td>Dây điện hoặc vật dụng bừa bộn nằm trong hành lang di chuyển</td>
                <td>-15 điểm</td>
                <td>CDC STEADI Checklist: Clutter in walkways</td>
              </tr>
              <tr>
                <td><code className="inline">SLIPPERY_FLOOR</code></td>
                <td><span className="badge badge-danger">Critical</span></td>
                <td>Gạch sàn phòng tắm trơn bóng, thiếu xử lý chống trơn</td>
                <td>-25 điểm</td>
                <td>WHO Clinical Guidelines on Falls (Chương 4)</td>
              </tr>
              <tr>
                <td><code className="inline">NO_NIGHT_LIGHT</code></td>
                <td><span className="badge badge-warning">Medium</span></td>
                <td>Không có nguồn sáng dẫn đường ban đêm từ giường ra cửa</td>
                <td>-10 điểm</td>
                <td>CDC STEADI: Nighttime lighting safety</td>
              </tr>
              <tr>
                <td><code className="inline">HIGH_THRESHOLD</code></td>
                <td><span className="badge badge-warning">Medium</span></td>
                <td>Gờ bậc cửa ra vào hoặc nhà vệ sinh cao &gt;1.5cm</td>
                <td>-10 điểm</td>
                <td>Tiêu chuẩn thiết kế không rào cản (Barrier-Free)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-title">
            <Award size={18} color="var(--primary-hover)" />
            <span>Công Thức Tính Điểm An Toàn Tổng Thể (Safety Score)</span>
          </div>
          <pre>{`Score = Max(0, 100 - Tổng(Điểm phạt các quy tắc vi phạm))

Phân hạng rủi ro lâm sàng:
• 80 - 100 điểm: AN TOÀN CAO (Rủi ro thấp)
• 60 - 79 điểm:  AN TOÀN TRUNG BÌNH (Cần cải thiện)
• 0  - 59 điểm:  NGUY CƠ CAO (Cần can thiệp khẩn cấp)`}</pre>
        </div>

        <div className="card">
          <div className="card-title">
            <BookOpen size={18} color="var(--success)" />
            <span>Kế Hoạch Can Thiệp Cụ Thể (Actionable Remediation)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Mỗi mối nguy không chỉ bị cảnh báo mà luôn đi kèm giải pháp vật lý thiết thực, khả thi và tiết kiệm:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>Chi phí ước tính cho từng can thiệp (ví dụ băng dính chống trượt ~50.000 VNĐ, đèn cảm ứng ~150.000 VNĐ).</li>
            <li>Hướng dẫn tự thực hiện hoặc liên hệ thợ lắp đặt.</li>
            <li>Cập nhật điểm số an toàn kỳ vọng ngay sau khi hoàn thành.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
