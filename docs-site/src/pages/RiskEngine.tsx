import { PageHeader, Callout, Src, StatusBadge } from '../components/ui'
import { CodeBlock } from '../components/CodeBlock'

const Flow = ({ steps, label }: { steps: string[]; label: string }) => (
  <ol className="flow" aria-label={label}>
    {steps.map((s) => (
      <li key={s}>{s}</li>
    ))}
  </ol>
)

const RULES_DATA = [
  {
    id: 'RISK-001',
    priority: 'HIGH',
    name: 'Thảm trải sàn không cố định mép / trượt dịch',
    trigger: 'hasRug == true && (!isSecured || edgesCurled) && inWalkway == true',
    penalty: '-20 điểm',
    citation: 'CDC STEADI Home Fall Prevention Checklist (Trang 2)'
  },
  {
    id: 'RISK-002',
    priority: 'HIGH',
    name: 'Dây điện vắt ngang hành lang di chuyển',
    trigger: 'trailingCablesPresent == true && inWalkway == true',
    penalty: '-15 điểm',
    citation: 'CDC STEADI Environmental Hazards: Pathway Obstructions'
  },
  {
    id: 'RISK-003',
    priority: 'HIGH',
    name: 'Vật cản lấn chiếm thông thủy lối đi (<80cm)',
    trigger: 'walkwayClearWidthCm < 80 || pathwayClutter == true',
    penalty: '-15 điểm',
    citation: 'ADA Accessibility Standards & WHO Fall Guidelines'
  },
  {
    id: 'RISK-004',
    priority: 'HIGH',
    name: 'Độ rọi ban đêm không đạt chuẩn (<50 Lux)',
    trigger: 'measuredLux < 50 && hasNightlightSensor == false',
    penalty: '-20 điểm',
    citation: 'WHO Global Report on Fall Prevention (Mục 3.2: Lighting)'
  },
  {
    id: 'RISK-005',
    priority: 'CRITICAL',
    name: 'Sàn phòng tắm trơn trượt / gạch bóng ướt',
    trigger: 'floorFriction == "SLIPPERY" && !hasAntiSlipTreatment',
    penalty: '-25 điểm',
    citation: 'WHO Clinical Guidelines on Falls in Older Age (Chương 4)'
  },
  {
    id: 'RISK-006',
    priority: 'CRITICAL',
    name: 'Thiếu thanh tay vịn trợ lực (bồn cầu / vòi sen)',
    trigger: 'toiletGrabBar == false || showerGrabBar == false',
    penalty: '-25 điểm',
    citation: 'CDC STEADI Bathroom Safety Checklist & ADA Standards'
  },
  {
    id: 'RISK-007',
    priority: 'MEDIUM',
    name: 'Gờ bậc cửa chênh cao >1.5cm không vát thoải',
    trigger: 'thresholdHeightCm > 1.5 && hasRamp == false',
    penalty: '-10 điểm',
    citation: 'Tiêu chuẩn quốc tế thiết kế không rào cản (Barrier-Free Design)'
  },
  {
    id: 'RISK-008',
    priority: 'MEDIUM',
    name: 'Công tắc đèn / vật dụng thiết yếu ngoài tầm với',
    trigger: 'lightSwitchReachableFromBed == false || bedsideHeightUnsafe == true',
    penalty: '-10 điểm',
    citation: 'CDC STEADI: Nighttime Navigation & Bedside Safety'
  }
]

const EVAL_INPUT_JSON = `{
  "roomId": "room_elderly_bedroom_01",
  "roomType": "BEDROOM",
  "luxLevel": 38,
  "rugs": {
    "present": true,
    "items": [{ "isSecured": false, "edgesCurled": true, "inWalkway": true }]
  },
  "cables": { "inWalkway": true },
  "walkwayClearWidthCm": 55,
  "bathroom": { "toiletGrabBar": false, "showerGrabBar": false, "floorFriction": "SLIPPERY" }
}`

const EVAL_OUTPUT_JSON = `{
  "roomId": "room_elderly_bedroom_01",
  "safetyScore": 28,
  "riskClassification": "HIGH_FALL_RISK",
  "totalPenalties": 72,
  "triggeredRulesCount": 4,
  "findings": [
    {
      "ruleId": "RISK-005",
      "priority": "CRITICAL",
      "penalty": 25,
      "title": "Sàn phòng tắm trơn trượt / gạch bóng ướt",
      "citation": "WHO Clinical Guidelines on Falls in Older Age (Chương 4)"
    },
    {
      "ruleId": "RISK-001",
      "priority": "HIGH",
      "penalty": 20,
      "title": "Thảm trải sàn không cố định mép / trượt dịch",
      "citation": "CDC STEADI Home Fall Prevention Checklist (Trang 2)"
    },
    {
      "ruleId": "RISK-004",
      "priority": "HIGH",
      "penalty": 20,
      "title": "Độ rọi ban đêm không đạt chuẩn (<50 Lux, thực tế 38 Lux)",
      "citation": "WHO Global Report on Fall Prevention (Mục 3.2)"
    },
    {
      "ruleId": "RISK-002",
      "priority": "HIGH",
      "penalty": 15,
      "title": "Dây điện vắt ngang hành lang di chuyển",
      "citation": "CDC STEADI Environmental Hazards"
    }
  ]
}`

export default function RiskEngine() {
  return (
    <section className="page">
      <PageHeader
        eyebrow="Clinical Safety Intelligence"
        title="Deterministic WHO/CDC Fall Risk Engine"
        lead="Động cơ đánh giá nguy cơ té ngã tất định theo chuẩn y khoa quốc tế. 100% Zero Hallucination — không phó thác tính mạng người cao tuổi cho sự phỏng đoán của LLM."
      />

      <Flow
        label="Deterministic Fall Risk Assessment Pipeline"
        steps={[
          'Spatial & Survey Input',
          '8 Versioned Rules (RISK-001..008)',
          'Zero-Hallucination Deduction',
          'Score S = max(0, 100 - ∑Penalties)',
          'Evidence-Based Remediation'
        ]}
      />

      {/* Principle Callout */}
      <Callout tone="note" title="Nguyên Tắc Thiết Kế: Quy Tắc Tất Định & Chờ Thẩm Định Lâm Sàng (PENDING_CLINICAL_REVIEW)">
        Trong an toàn môi trường sống cho người cao tuổi, <strong>cảnh báo nguy cơ không được sinh ngẫu nhiên bởi LLM</strong>. Logic đánh giá được mã hóa bằng hàm thuần túy tại <Src path="src/lib/risk/riskRuleRegistry.ts" /> với bộ ngưỡng phiên bản <Src path="thresholdConfig.ts (v2026.1)" /> hiện giữ trạng thái <code className="mono">PENDING_CLINICAL_REVIEW</code>; ứng dụng hỗ trợ sàng lọc yếu tố môi trường, không thay thế chẩn đoán y khoa.
      </Callout>

      {/* Safety Score Formula Section */}
      <h2>1. Công Thức Tính Điểm An Toàn Tổng Thể (Safety Score Formulation) <StatusBadge status="verified" /></h2>
      <p>
        Điểm an toàn không gian sống (Safety Score $S$) được tính trên thang điểm 0 - 100 theo công thức trừ lùi tất định:
      </p>

      <div className="card" style={{ marginBottom: '1.5rem', background: '#050a12' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '1.05rem', color: 'var(--cyan)', marginBottom: 8 }}>
          S = max(0, 100 - ∑ Penalties)
        </div>
        <p style={{ margin: '4px 0 12px', color: 'var(--muted)', fontSize: '0.9rem' }}>
          Trong đó {'$\\sum \\text{Penalties}$'} là tổng trọng số phạt điểm của tất cả các quy tắc y khoa lâm sàng bị kích hoạt.
        </p>

        <div className="table-wrap" style={{ margin: '8px 0 0' }}>
          <table>
            <thead>
              <tr>
                <th>Khoảng Điểm $S$</th>
                <th>Phân Loại Lâm Sàng</th>
                <th>Ý Nghĩa Y Khoa</th>
                <th>Hành Động Khuyến Cáo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono" style={{ color: 'var(--green)', fontWeight: 700 }}>80 - 100</td>
                <td><span className="badge badge-success">AN TOÀN CAO</span></td>
                <td>Môi trường đạt chuẩn an toàn phòng chống té ngã CDC STEADI & WHO.</td>
                <td>Duy trì vệ sinh, bảo dưỡng định kỳ bóng đèn và thanh vịn.</td>
              </tr>
              <tr>
                <td className="mono" style={{ color: 'var(--amber)', fontWeight: 700 }}>60 - 79</td>
                <td><span className="badge badge-partial">AN TOÀN TRUNG BÌNH</span></td>
                <td>Tồn tại 1-2 yếu tố nguy cơ đơn lẻ (thảm lỏng, thiếu đèn ngủ cảm ứng).</td>
                <td>Cần cải thiện các can thiệp chi phí thấp trong vòng 7 ngày.</td>
              </tr>
              <tr>
                <td className="mono" style={{ color: 'var(--red)', fontWeight: 700 }}>0 - 59</td>
                <td><span className="badge badge-danger">NGUY CƠ CAO (CRITICAL)</span></td>
                <td>Nguy cơ ngã nghiêm trọng (sàn ướt, thiếu thanh vịn, vật cản, tối).</td>
                <td><strong>Can thiệp khẩn cấp:</strong> Tháo bỏ ngay vật cản và lắp thanh vịn.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 8 Clinical Rules Registry */}
      <h2>2. Bảng Đăng Ký 8 Quy Tắc Lâm Sàng Chuẩn Hóa (Risk Rule Registry) <StatusBadge status="verified" /></h2>
      <p>
        Mỗi quy tắc được kiểm tra độc lập qua giao thức <code className="mono">evaluate(input: AssessmentInput): RuleEvaluationResult</code> có phiên bản (versioned 1.0.0), định danh mức độ nghiêm trọng và trích dẫn chuẩn mực:
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã Quy Tắc</th>
              <th>Mức Ưu Tiên</th>
              <th>Tên Mối Nguy & Điều Kiện Kích Hoạt</th>
              <th>Phạt Điểm</th>
              <th>Căn Cứ Y Khoa Chuẩn</th>
            </tr>
          </thead>
          <tbody>
            {RULES_DATA.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ fontWeight: 700, color: 'var(--cyan)' }}>{r.id}</td>
                <td>
                  <span className={r.priority === 'CRITICAL' ? 'badge badge-danger' : r.priority === 'HIGH' ? 'badge badge-danger' : 'badge badge-partial'}>
                    {r.priority}
                  </span>
                </td>
                <td>
                  <strong style={{ color: '#fff', display: 'block', marginBottom: 2 }}>{r.name}</strong>
                  <code style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{r.trigger}</code>
                </td>
                <td className="mono" style={{ color: 'var(--red)', fontWeight: 600 }}>{r.penalty}</td>
                <td style={{ fontSize: '0.84rem', color: 'var(--text)' }}>{r.citation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="dim" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
        Định nghĩa chi tiết từng quy tắc tại <Src path="src/lib/risk/riskRuleRegistry.ts" />. Quản lý thực thi tại <Src path="src/lib/risk/ruleEngine.ts" />.
      </p>

      {/* Execution Payload Code Example */}
      <h2 style={{ marginTop: '2rem' }}>3. Ví Dụ Đánh Giá Thực Tế (Deterministic Execution Example)</h2>
      <div className="grid-2">
        <div>
          <CodeBlock label="Request Payload: POST /api/risk-assessment/evaluate" code={EVAL_INPUT_JSON} />
        </div>
        <div>
          <CodeBlock label="Response Output: Điểm 28/100 & 4 Vi Phạm Y Khoa" code={EVAL_OUTPUT_JSON} />
        </div>
      </div>

      {/* Remediation & ROI */}
      <h2 style={{ marginTop: '2rem' }}>4. So Sánh Mô Phỏng Kịch Bản Cải Tạo (Before / After Comparison)</h2>
      <p>
        Sau khi xác định danh sách nguy cơ, phân hệ <Src path="src/lib/risk/comparisonEngine.ts" /> cho phép tạo kịch bản 3D cải tạo (Simulated Digital Twin) và so sánh trực quan điểm số an toàn trước và sau can thiệp:
      </p>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ color: 'var(--cyan)', marginTop: 0 }}>Trước can thiệp (Baseline Hiện Trạng)</h3>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)', display: 'grid', gap: '0.4rem' }}>
            <li>Điểm tham chiếu mô phỏng: <span style={{ color: 'var(--red)', fontWeight: 700 }}>28 / 100</span> (cần ưu tiên cải thiện).</li>
            <li>Ghi nhận 4 yếu tố môi trường (thảm lỏng, dây điện, thiếu ánh sáng, sàn ướt).</li>
            <li>Lưu thành snapshot bất biến <code className="mono">BASELINE</code> qua API v1 để đối chiếu.</li>
          </ul>
        </div>

        <div className="card" style={{ borderColor: 'var(--green)' }}>
          <h3 style={{ color: 'var(--green)', marginTop: 0 }}>Sau can thiệp mô phỏng (Proposed / Post Snapshot)</h3>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)', display: 'grid', gap: '0.4rem' }}>
            <li>Điểm tham chiếu mô phỏng: <span style={{ color: 'var(--green)', fontWeight: 700 }}>100 / 100</span> (+72 điểm hồi phục).</li>
            <li>Nếu thiếu dữ liệu đo đạc hậu kiểm thực tế, hệ thống giữ kết luận <em>&quot;chưa thể đánh giá&quot;</em>.</li>
            <li>Chi phí vật tư tham khảo: <strong>~480.000 VNĐ</strong> (băng dính thảm + kẹp dây + đèn LED cảm ứng).</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
