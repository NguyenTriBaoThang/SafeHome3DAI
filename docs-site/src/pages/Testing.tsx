import { ShieldCheck, Terminal, Award } from 'lucide-react'

const TEST_TIERS = [
  { layer: 'Static & Type Safety', cmd: 'npm run typecheck', scope: 'Toàn dự án TypeScript (tsc --noEmit)', result: '0 errors (PASS)', status: 'Passed' },
  { layer: 'CI Quality Gates', cmd: 'npm run qa:gates', scope: 'Secret scan (301 files), migrations, contracts, withAccount (59 APIs), README guard', result: '0 Gate Failures (PASS)', status: 'Passed' },
  { layer: 'Full Vitest Suite', cmd: 'npm test -- --run --no-file-parallelism', scope: '57 suites: Risk, Vision, Survey, Auth/IDOR, Snapshots A11, Provenance A10, Regressions', result: '57/57 files · 486 passed (1 live skip)', status: 'Passed' },
  { layer: '3D Experience Suite', cmd: 'npm run test:experience', scope: '9 suites: GLB placement, lighting separation B08, Undo/Redo, Dollhouse, Vision integration', result: '9/9 files · 64/64 passed', status: 'Passed' },
  { layer: 'RAG 40Q Benchmark', cmd: 'npm run eval:rag:a09', scope: '40 câu hỏi tiếng Việt (WHO/CDC, tình huống phòng, thiếu dữ kiện, ngoài phạm vi, prompt injection)', result: '40/40 OFFLINE_DETERMINISTIC (PRELIMINARY)', status: 'Passed' },
  { layer: 'Python ML Unit Tests', cmd: '.venv-ml\\Scripts\\python.exe -m unittest discover -s scripts/ml -p "test_*.py"', scope: 'Stage 2/4/5 contracts, B03 labels/kappa, synthetic 1-epoch RT-DETR loop', result: '81/81 tests OK', status: 'Passed' },
  { layer: 'Node ML Bridges', cmd: 'scripts/ml/test_*_bridge.cjs & test_stage4_launcher.cjs', scope: 'Schema hợp đồng Gemini/Local serving bridge & sandbox safety', result: '14/14 passed', status: 'Passed' },
  { layer: 'HTTP Smoke & SQLite Restore', cmd: 'node scripts/completion/http-smoke.cjs', scope: 'Production build .next API runtime & archive.cjs backup/restore SQLite thật', result: '10/10 + restore PASS', status: 'Passed' },
  { layer: 'Browser Multi-Tenant E2E', cmd: 'node scripts/completion/browser.cjs', scope: 'Edge CDP đa hộ gia đình, upload/confirm/retract/delete, live camera & 17-route sweep', result: '25/25 acceptance · 17/17 routes 0 errors', status: 'Passed' },
]

export default function Testing() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>Kiểm Thử &amp; Đảm Bảo Chất Lượng (QA &amp; CI/CD)</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Kết quả kiểm thử toàn hệ thống tách bạch rõ: phần mềm đạt chuẩn vận hành (<strong>SOFTWARE READY</strong>), trong khi đánh giá mô hình ML &amp; lâm sàng thực địa giữ nguyên trạng thái <strong>BLOCKED</strong> (không tự bịa số liệu).
        </p>
      </div>

      <section className="card" style={{ borderLeft: '4px solid var(--success)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div className="card-title">
            <Award size={20} color="var(--success)" />
            <span>Tổng Hợp Kiểm Chứng Hậu Audit (Full-System Run)</span>
          </div>
          <span className="badge badge-success">57/57 Vitest · 81/81 Python ML · 25/25 Browser E2E</span>
        </div>
        <pre>{`✓ npm run typecheck                     -> exit 0 (0 TypeScript errors)
✓ npm run qa:gates                      -> 301 files, 59 guarded APIs, 0 failures
✓ npm test -- --run --no-file-parallelism -> 57/57 files passed (486 passed, 1 live test skipped)
✓ npm run test:experience               -> 9/9 files passed (64/64 tests)
✓ npm run eval:rag:a09                  -> 40/40 PASS (OFFLINE_DETERMINISTIC / PRELIMINARY)
✓ .venv-ml python -m unittest (ml)      -> 81/81 tests OK
✓ Node ML bridge tests                  -> 14/14 passed
✓ http-smoke.cjs & offline SQLite       -> 10/10 + restore PASS
✓ browser.cjs & 17-route Edge sweep     -> 25/25 + 17/17 routes 0 runtime/HTTP/overflow errors`}</pre>
      </section>

      <section>
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '1rem' }}>Tháp Kiểm Thử Đa Tầng (9 Hạng Mục Đã Xác Minh)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tầng kiểm thử</th>
                <th>Lệnh / Script</th>
                <th>Phạm vi xác minh</th>
                <th>Kết quả</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {TEST_TIERS.map((t) => (
                <tr key={t.layer}>
                  <td><strong>{t.layer}</strong></td>
                  <td><code className="inline">{t.cmd}</code></td>
                  <td>{t.scope}</td>
                  <td>{t.result}</td>
                  <td><span className="badge badge-success">{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-title">
            <Terminal size={18} color="var(--primary-hover)" />
            <span>Lệnh Chạy Kiểm Thử Cục Bộ</span>
          </div>
          <pre>{`# Static checks & CI quality gates
npm run typecheck
npm run qa:gates

# Full Vitest suite & 3D Experience
npm test -- --run --no-file-parallelism
npm run test:experience
npm run eval:rag:a09

# Production build
npm run build`}</pre>
        </div>

        <div className="card">
          <div className="card-title">
            <ShieldCheck size={18} color="var(--success)" />
            <span>Hạng Mục Chưa Chạy / Bị Chặn Cổng Dữ Liệu</span>
          </div>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <li><strong>ESLint &amp; Playwright CLI:</strong> <code className="inline">eslint</code> chưa cài trong <code className="inline">devDependencies</code>; <code className="inline">verify_cinematic_experience.cjs</code> đòi gói <code className="inline">playwright</code> (đã bù bằng Edge CDP sweep 17 route).</li>
            <li><strong>Cổng ML (Stage 5 / B05):</strong> <code className="inline">not_ready</code> vì <code className="inline">verifiedTrainImages = 0</code>, chưa có mô hình RT-DETR ONNX.</li>
            <li><strong>Cổng Lâm Sàng (A04 / B11):</strong> Ngưỡng <code className="inline">RISK-001..008</code> giữ <code className="inline">PENDING_CLINICAL_REVIEW</code>; nghiên cứu B11 có <code className="inline">0</code> dữ liệu thực địa &amp; <code className="inline">0</code> SUS.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
