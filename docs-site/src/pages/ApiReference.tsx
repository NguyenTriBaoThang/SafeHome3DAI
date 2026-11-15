import { Code, Send } from 'lucide-react'

export default function ApiReference() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>Đặc Tả Giao Diện Lập Trình (API Reference)</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Tài liệu kỹ thuật các điểm cuối API RESTful hỗ trợ tích hợp ngoại vi và giao tiếp giữa các phân hệ của SafeHome 3D AI.
        </p>
      </div>

      <section>
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '1rem' }}>Danh Sách Các Endpoint Lõi (Core REST Endpoints)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Phương thức</th>
                <th>Đường dẫn Endpoint</th>
                <th>Phân hệ</th>
                <th>Mô tả chức năng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="badge badge-success">POST</span></td>
                <td><code className="inline">/api/survey/sessions</code></td>
                <td>Khảo sát</td>
                <td>Khởi tạo phiên khảo sát mới gắn với hồ sơ phòng</td>
              </tr>
              <tr>
                <td><span className="badge badge-success">POST</span></td>
                <td><code className="inline">/api/survey/answers</code></td>
                <td>Khảo sát</td>
                <td>Gửi câu trả lời, tính lại tiến độ và tự động tỉa nhánh câu hỏi</td>
              </tr>
              <tr>
                <td><span className="badge badge-success">POST</span></td>
                <td><code className="inline">/api/survey/nlp</code></td>
                <td>NLP AI</td>
                <td>Phân tích văn bản tiếng Việt tự do thành giá trị chuẩn hóa</td>
              </tr>
              <tr>
                <td><span className="badge badge-success">POST</span></td>
                <td><code className="inline">/api/vision/upload</code></td>
                <td>Thị giác</td>
                <td>Tải ảnh lên, kiểm tra Magic Bytes và cắt bỏ dữ liệu EXIF</td>
              </tr>
              <tr>
                <td><span className="badge badge-success">POST</span></td>
                <td><code className="inline">/api/vision/analyze</code></td>
                <td>Thị giác</td>
                <td>Quét nhận diện 18 lớp vật thể y tế trong ảnh</td>
              </tr>
              <tr>
                <td><span className="badge badge-info">GET</span></td>
                <td><code className="inline">/api/simulations</code></td>
                <td>Bản sao 3D</td>
                <td>Lấy danh sách tất cả các kịch bản 3D đã lưu trong kho</td>
              </tr>
              <tr>
                <td><span className="badge badge-success">POST</span></td>
                <td><code className="inline">/api/simulations</code></td>
                <td>Bản sao 3D</td>
                <td>Lưu cấu hình can thiệp mô phỏng 3D mới</td>
              </tr>
              <tr>
                <td><span className="badge badge-success">POST</span></td>
                <td><code className="inline">/api/risk-assessment</code></td>
                <td>Nguy cơ y khoa</td>
                <td>Thực thi 8 quy tắc lâm sàng tất định và trả về điểm số</td>
              </tr>
              <tr>
                <td><span className="badge badge-success">POST</span></td>
                <td><code className="inline">/api/chat</code></td>
                <td>RAG Copilot</td>
                <td>Truy vấn trợ lý AI có dẫn nguồn tài liệu WHO 2021 & CDC STEADI</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-title">
            <Send size={18} color="var(--primary-hover)" />
            <span>Ví Dụ Yêu Cầu: Đánh Giá Nguy Cơ Lâm Sàng</span>
          </div>
          <pre>{`POST /api/risk-assessment
Content-Type: application/json

{
  "roomId": "room_elderly_bed_01",
  "surveyAnswers": {
    "BED_001": 42,
    "BED_006": "YES",
    "BED_007": "NO",
    "LIGHT_001": "NO"
  },
  "detectedObjects": [
    { "type": "loose_rug", "confidence": 0.94 }
  ]
}`}</pre>
        </div>

        <div className="card">
          <div className="card-title">
            <Code size={18} color="var(--success)" />
            <span>Ví Dụ Phản Hồi: Kết Quả & Kế Hoạch Can Thiệp</span>
          </div>
          <pre>{`{
  "safetyScore": 45,
  "riskLevel": "HIGH_RISK",
  "findings": [
    {
      "ruleId": "RUG_NO_GRIP",
      "severity": "HIGH",
      "penalty": 20,
      "message": "Thảm không chống trượt tại lối đi",
      "citation": "CDC STEADI Environmental Checklist (p.2)"
    },
    {
      "ruleId": "NIGHT_PATH_DARK",
      "severity": "HIGH",
      "penalty": 20,
      "message": "Lối đi ban đêm không đủ ánh sáng <50 Lux",
      "citation": "WHO Fall Prevention Guide (Sec 3.2)"
    }
  ]
}`}</pre>
        </div>
      </section>
    </div>
  )
}
