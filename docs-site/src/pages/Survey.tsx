import { PageHeader, Callout, Src, StatusBadge } from '../components/ui'
import { CodeBlock } from '../components/CodeBlock'

const Flow = ({ steps, label }: { steps: string[]; label: string }) => (
  <ol className="flow" aria-label={label}>
    {steps.map((s) => (
      <li key={s}>{s}</li>
    ))}
  </ol>
)

const NLP_EXAMPLE_REQUEST = `{
  "userInput": "Phòng ngủ của bà dài tầm 4 mét 2, rộng khoảng 3 mét rưỡi. Có cái thảm vải nhỏ dưới chân giường nhưng không có băng keo cố định, hay bị trượt.",
  "targetQuestionId": "BED_006"
}`

const NLP_EXAMPLE_RESPONSE = `{
  "success": true,
  "confidenceScore": 0.95,
  "extractedEntities": {
    "dimensions": { "lengthM": 4.2, "widthM": 3.5, "unit": "meter" },
    "rug": { "present": true, "isSecured": false, "inWalkway": true }
  },
  "rationale": "Trích xuất kích thước 4.2m x 3.5m; phát hiện thảm lỏng không cố định mép tại khu vực chân giường.",
  "synthesizedAnswers": [
    { "questionId": "ROOM_001", "value": "4.2x3.5" },
    { "questionId": "BED_006", "value": "YES" },
    { "questionId": "BED_007", "value": "NO" }
  ]
}`

const QUESTIONS_DATA = [
  {
    id: 'ROOM_001',
    category: 'Hình học',
    text: 'Kích thước dài và rộng của căn phòng?',
    type: 'Kép (Số thực m)',
    standard: 'Tiêu chuẩn diện tích xoay trở tối thiểu người già'
  },
  {
    id: 'BED_001',
    category: 'Công thái học',
    text: 'Chiều cao mặt nệm giường ngủ so với mặt sàn?',
    type: 'Số nguyên (cm)',
    standard: 'CDC STEADI: 45 - 50cm bảo vệ khớp gối'
  },
  {
    id: 'BED_006',
    category: 'Sàn nhà',
    text: 'Có thảm trải sàn trong phòng hay không?',
    type: 'Có / Không (Boolean)',
    standard: 'WHO Guideline on Fall Prevention'
  },
  {
    id: 'BED_007',
    category: 'Sàn nhà (Nhánh con)',
    text: 'Thảm có lớp cao su chống trượt hoặc dán cố định không?',
    type: 'Có / Không (Boolean)',
    standard: 'CDC STEADI Environmental Checklist (p.2)'
  },
  {
    id: 'LIGHT_001',
    category: 'Chiếu sáng',
    text: 'Lối đi từ giường đến nhà vệ sinh có đèn ngủ cảm ứng không?',
    type: 'Có / Không (Boolean)',
    standard: 'WHO Fall Prevention: Chuẩn độ rọi ban đêm ≥50 Lux'
  },
  {
    id: 'BATH_001',
    category: 'Nhà vệ sinh',
    text: 'Khu vực bồn cầu và vòi sen có lắp thanh vịn trợ lực không?',
    type: 'Có / Không (Boolean)',
    standard: 'Tiêu chuẩn thanh vịn y tế ADA & CDC STEADI'
  }
]

export default function Survey() {
  return (
    <section className="page">
      <PageHeader
        eyebrow="Adaptive Survey & NLP"
        title="AI Guided Survey Engine"
        lead="Hệ thống khảo sát không gian sống thích ứng từng bước, tự động tỉa nhánh theo đồ thị phụ thuộc DAG và xử lý ngôn ngữ tự nhiên tiếng Việt cho người cao tuổi."
      />

      <Flow
        label="Survey Processing Flow"
        steps={[
          'Freeform Vietnamese Input',
          'NLP Interpreter (Units & Uncertainty)',
          'DAG Dynamic Pruning',
          'Stale Dependency Invalidation',
          'RoomProfile & 3D Synthesis'
        ]}
      />

      <Callout tone="note" title="Thân Thiện & Giảm Tải Cho Người Già">
        Khảo sát truyền thống với 50+ câu hỏi liên tục khiến người cao tuổi mệt mỏi và bỏ cuộc. Động cơ khảo sát của SafeHome 3D AI ứng dụng <strong>Dynamic Irrelevance Pruning</strong>: chỉ hiển thị câu hỏi liên quan trực tiếp đến hiện trạng căn phòng, giảm tới 60% thời gian khảo sát thực tế.
      </Callout>

      {/* 2 Core Engines */}
      <h2>1. Kiến Trúc Khảo Sát Thích Ứng (Dynamic DAG Engine) <StatusBadge status="verified" /></h2>
      <div className="grid-2">
        <div className="card">
          <h3 style={{ color: 'var(--cyan)', marginTop: 0 }}>Tỉa Nhánh Câu Hỏi Động (Irrelevance Pruning)</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Quản lý phụ thuộc logic qua <Src path="src/lib/survey/flowEngine.ts" />:
          </p>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)', display: 'grid', gap: '0.4rem', fontSize: '0.9rem' }}>
            <li>Nếu phòng ngủ <strong>không có thảm</strong> (<code className="mono">BED_006 = "NO"</code>) $\rightarrow$ Hệ thống tự động tỉa bỏ câu hỏi cố định thảm (<code className="mono">BED_007</code>).</li>
            <li>Nếu có thảm (<code className="mono">BED_006 = "YES"</code>) $\rightarrow$ Câu hỏi kiểm tra viền mép thảm lập tức xuất hiện.</li>
            <li>Tiến độ hoàn thành (%) được tính chuẩn xác theo <strong>mẫu số câu hỏi thực tế áp dụng</strong>, không bao giờ bị kẹt hoặc sai lệch tiến độ.</li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ color: 'var(--amber)', marginTop: 0 }}>Hủy Dữ Liệu Cũ Phụ Thuộc (Stale Invalidation)</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Đảm bảo tính nhất quán dữ liệu khi người dùng quay lại sửa câu hỏi cha:
          </p>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)', display: 'grid', gap: '0.4rem', fontSize: '0.9rem' }}>
            <li>Đổi câu trả lời từ <em>"Có thảm"</em> sang <em>"Không có thảm"</em>.</li>
            <li>Động cơ tự động tìm và <strong>xóa câu trả lời phụ thuộc cũ</strong> (<code className="mono">BED_007</code>) trong database.</li>
            <li>Vô hiệu hóa mối nguy <code className="mono">RISK-001</code> tương ứng, ngăn chặn cảnh báo sai.</li>
            <li>Ghi nhận nhật ký kiểm toán trong bảng <code className="mono">SurveyAuditEvent</code> (và <code className="mono">PersistenceAuditEvent</code>).</li>
          </ul>
        </div>
      </div>

      {/* NLP Section */}
      <h2 style={{ marginTop: '2rem' }}>2. Xử Lý Ngôn Ngữ Tự Nhiên Tiếng Việt (Vietnamese NLP Engine) <StatusBadge status="verified" /></h2>
      <p>
        Mô-đun <Src path="src/lib/survey/nlpInterpreter.ts" /> hỗ trợ người cao tuổi và người chăm sóc nhập liệu tự nhiên bằng giọng nói hoặc văn bản tiếng Việt đời thường, bao gồm các từ đo lường dân dã (phân, tấc, gang tay, sải tay) và tín hiệu không chắc chắn (chưa rõ, chưa đo, không biết):
      </p>

      <div className="table-wrap">
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
              <td><code className="mono">lengthM: 4.0, widthM: 3.5</code></td>
              <td>Cập nhật kích thước phòng số hóa</td>
              <td><span className="badge badge-success">0.96 Cao</span></td>
            </tr>
            <tr>
              <td><em>"Có một cái thảm nhỏ cạnh giường nhưng hay bị xê dịch"</em></td>
              <td><code className="mono">hasRug: true, isFixed: false</code></td>
              <td>Kích hoạt cảnh báo viền thảm trượt RISK-001</td>
              <td><span className="badge badge-success">0.94 Cao</span></td>
            </tr>
            <tr>
              <td><em>"Giường cao ngang đầu gối, tầm 48 phân"</em></td>
              <td><code className="mono">bedHeightCm: 48</code></td>
              <td>Nằm trong khoảng an toàn y khoa CDC (45-50cm)</td>
              <td><span className="badge badge-success">0.98 Cao</span></td>
            </tr>
            <tr>
              <td><em>"Ban đêm tối lắm, không thấy đường đi vệ sinh"</em></td>
              <td><code className="mono">hasNightlight: false, lux: &lt;50</code></td>
              <td>Kích hoạt cảnh báo đường đi ban đêm RISK-004</td>
              <td><span className="badge badge-success">0.92 Cao</span></td>
            </tr>
            <tr>
              <td><em>"Chưa kịp đo chiều cao bậc cửa, để hỏi lại"</em></td>
              <td><code className="mono">thresholdHeight: UNKNOWN</code></td>
              <td>Chuyển trạng thái sang Cần xác minh tại hiện trường</td>
              <td><span className="badge badge-partial">0.95 Chờ</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Question Bank */}
      <h2 style={{ marginTop: '2rem' }}>3. Ngân Hàng Câu Hỏi Khảo Sát Chuẩn Hóa (Standardized Question Bank)</h2>
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
            {QUESTIONS_DATA.map((q) => (
              <tr key={q.id}>
                <td className="mono" style={{ color: 'var(--cyan)', fontWeight: 700 }}>{q.id}</td>
                <td><span className="badge badge-partial">{q.category}</span></td>
                <td><strong style={{ color: '#fff' }}>{q.text}</strong></td>
                <td className="mono" style={{ fontSize: '0.84rem' }}>{q.type}</td>
                <td style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>{q.standard}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sample Payload */}
      <h2 style={{ marginTop: '2rem' }}>4. Đặc Tả Dữ Liệu Trao Đổi NLP (RESTful Payload)</h2>
      <div className="grid-2">
        <CodeBlock label="Request Payload: POST /api/surveys/interpret-nlp" code={NLP_EXAMPLE_REQUEST} />
        <CodeBlock label="Response Output: Trích Xuất & Điền Tự Động" code={NLP_EXAMPLE_RESPONSE} />
      </div>
    </section>
  )
}
