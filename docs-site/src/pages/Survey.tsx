import { Sparkles, Filter, RefreshCw } from 'lucide-react'

export default function Survey() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>AI Guided Survey Engine</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Hệ thống khảo sát không gian sống thích ứng từng bước, tự động tỉa nhánh và xử lý ngôn ngữ tự nhiên tiếng Việt cho người cao tuổi.
        </p>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-title">
            <Filter size={18} color="var(--primary-hover)" />
            <span>Tỉa Nhánh Câu Hỏi Động (Dynamic Irrelevance Pruning)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Biểu mẫu khảo sát truyền thống làm người già choáng ngợp bởi hàng loạt câu hỏi không liên quan. Động cơ khảo sát của SafeHome 3D AI ứng dụng đồ thị phụ thuộc thích ứng:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>Nếu phòng ngủ <strong>không có thảm</strong> (<code className="inline">BED_006 = "NO"</code>) $\rightarrow$ Hệ thống tự động bỏ qua câu hỏi cố định thảm (<code className="inline">BED_007</code>).</li>
            <li>Nếu có thảm (<code className="inline">BED_006 = "YES"</code>) $\rightarrow$ Câu hỏi kiểm tra viền mép thảm lập tức xuất hiện.</li>
            <li>Tiến độ hoàn thành (%) được tính chuẩn xác theo <strong>mẫu số thực tế</strong> các câu hỏi áp dụng, không bao giờ gây lỗi kẹt tiến độ.</li>
          </ul>
        </section>

        <section className="card">
          <div className="card-title">
            <RefreshCw size={18} color="var(--warning)" />
            <span>Hủy Dữ Liệu Cũ Phụ Thuộc (Stale Dependency Invalidation)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Khi người dùng quay lại sửa câu hỏi cha trong quá khứ:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>Đổi câu trả lời từ <em>"Có thảm"</em> sang <em>"Không có thảm"</em>.</li>
            <li>Động cơ tự động tìm và <strong>xóa câu trả lời phụ thuộc cũ</strong> (<code className="inline">BED_007</code>) trong SQLite/PostgreSQL.</li>
            <li>Ngay lập tức vô hiệu hóa mối nguy <code className="inline">RUG_NO_GRIP</code> phát sinh trước đó, tránh cảnh báo rác y tế.</li>
            <li>Ghi nhận nhật ký kiểm toán trong bảng <code className="inline">AuditEvent</code>.</li>
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="card-title">
          <Sparkles size={18} color="var(--primary-hover)" />
          <span>Xử Lý Ngôn Ngữ Tự Nhiên Tiếng Việt (Vietnamese NLP Engine)</span>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Hỗ trợ người cao tuổi hoặc người chăm sóc nhập dữ liệu tự nhiên bằng giọng nói hoặc văn bản tiếng Việt đời thường:
        </p>

        <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
          <table>
            <thead>
              <tr>
                <th>Văn bản tiếng Việt người dùng nhập</th>
                <th>Thực thể trích xuất tự động</th>
                <th>Dữ liệu chuẩn hóa</th>
                <th>Độ tin cậy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><em>"Phòng dài khoảng 4m rộng 3.5 mét"</em></td>
                <td><code className="inline">lengthM: 4.0, widthM: 3.5</code></td>
                <td>Cập nhật kích thước phòng số hóa</td>
                <td><span className="badge badge-success">0.96 Cao</span></td>
              </tr>
              <tr>
                <td><em>"Có một cái thảm nhỏ cạnh giường nhưng hay bị xê dịch"</em></td>
                <td><code className="inline">hasRug: true, isFixed: false</code></td>
                <td>Kích hoạt cảnh báo viền thảm trượt</td>
                <td><span className="badge badge-success">0.94 Cao</span></td>
              </tr>
              <tr>
                <td><em>"Giường cao ngang đầu gối, tầm 48 phân"</em></td>
                <td><code className="inline">bedHeightCm: 48</code></td>
                <td>Nằm trong khoảng an toàn y khoa (45-50cm)</td>
                <td><span className="badge badge-success">0.98 Cao</span></td>
              </tr>
              <tr>
                <td><em>"Ban đêm tối lắm, không thấy đường đi vệ sinh"</em></td>
                <td><code className="inline">hasNightlight: false, lighting: POOR</code></td>
                <td>Kích hoạt cảnh báo đường đi ban đêm</td>
                <td><span className="badge badge-success">0.92 Cao</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '1rem' }}>Ngân Hàng Câu Hỏi Khảo Sát Chuẩn Hóa</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã câu hỏi</th>
                <th>Phân loại</th>
                <th>Nội dung câu hỏi khảo sát</th>
                <th>Kiểu dữ liệu</th>
                <th>Tiêu chuẩn y khoa liên quan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className="inline">ROOM_001</code></td>
                <td>Hình học</td>
                <td>Kích thước dài và rộng của căn phòng?</td>
                <td>Kép (Số thực m)</td>
                <td>Diện tích xoay trở tối thiểu người già</td>
              </tr>
              <tr>
                <td><code className="inline">BED_001</code></td>
                <td>Công thái học</td>
                <td>Chiều cao mặt nệm giường ngủ so với mặt sàn?</td>
                <td>Số nguyên (cm)</td>
                <td>CDC STEADI (45 - 50cm an toàn gối)</td>
              </tr>
              <tr>
                <td><code className="inline">BED_006</code></td>
                <td>Sàn nhà</td>
                <td>Có thảm trải sàn trong phòng hay không?</td>
                <td>Có / Không</td>
                <td>WHO Guideline on Fall Prevention</td>
              </tr>
              <tr>
                <td><code className="inline">BED_007</code></td>
                <td>Sàn nhà (Nhánh con)</td>
                <td>Thảm có lớp cao su chống trượt hoặc dán cố định không?</td>
                <td>Có / Không</td>
                <td>CDC STEADI Checklist</td>
              </tr>
              <tr>
                <td><code className="inline">LIGHT_001</code></td>
                <td>Chiếu sáng</td>
                <td>Lối đi từ giường đến nhà vệ sinh có đèn ngủ cảm ứng không?</td>
                <td>Có / Không</td>
                <td>Chuẩn chiếu sáng ban đêm &ge;50 Lux</td>
              </tr>
              <tr>
                <td><code className="inline">BATH_001</code></td>
                <td>Nhà vệ sinh</td>
                <td>Khu vực bồn cầu và vòi sen có lắp thanh vịn trợ lực không?</td>
                <td>Có / Không</td>
                <td>Tiêu chuẩn thanh vịn y tế ADA / WHO</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
