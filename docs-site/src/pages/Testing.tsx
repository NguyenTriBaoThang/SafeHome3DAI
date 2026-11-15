import { ShieldCheck, Terminal, Award } from 'lucide-react'

export default function Testing() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>Kiểm Thử & Đảm Bảo Chất Lượng (QA & CI/CD)</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Hệ thống kiểm thử tự động toàn diện với 14 bộ kiểm thử (test suites) và 80/80 ca kiểm thử vượt qua thành công (100% Pass Rate).
        </p>
      </div>

      <section className="card" style={{ borderLeft: '4px solid var(--success)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">
            <Award size={20} color="var(--success)" />
            <span>Kết Quả Kiểm Thử Toàn Diện (Test Suite Summary)</span>
          </div>
          <span className="badge badge-success">80 / 80 Passed (100%)</span>
        </div>
        <pre>{`✓ tests/unit/survey-flow.test.ts (18 tests) - Nhánh hóa câu hỏi, tỉa nhánh động, trích xuất NLP tiếng Việt
✓ tests/unit/risk-engine.test.ts (14 tests) - Kiểm tra 8 quy tắc y khoa lâm sàng WHO 2021 & CDC STEADI
✓ tests/unit/vision-validation.test.ts (12 tests) - Magic bytes, cắt bỏ EXIF GPS, giới hạn độ phân giải ảnh
✓ tests/unit/audit-invalidation.test.ts (8 tests) - Tự động hủy câu trả lời cũ & nguy cơ lỗi thời
✓ tests/integration/workflow-e2e.test.ts (10 tests) - Luồng 7 bước từ Khảo sát đến Báo cáo an toàn
✓ tests/integration/simulations-api.test.ts (6 tests) - Lưu và truy xuất kho mô phỏng 3D đa phòng
✓ tests/integration/three-clustering.test.ts (12 tests) - Thuật toán gom cụm nhãn 3D <0.95m Euclidean

Test Files  14 passed (14)
     Tests  80 passed (80)
  Duration  1.82s (transform 312ms, setup 0ms, collect 418ms, tests 620ms)`}</pre>
      </section>

      <section>
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '1rem' }}>Bảng Thống Kê Các Bộ Kiểm Thử Tự Động</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tập tin kiểm thử</th>
                <th>Số lượng test</th>
                <th>Phạm vi kiểm tra</th>
                <th>Trạng thái CI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code className="inline">tests/unit/survey-flow.test.ts</code></td>
                <td>18</td>
                <td>Luồng câu hỏi thích ứng, tỉa nhánh động, cơ chế NLP</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td><code className="inline">tests/unit/risk-engine.test.ts</code></td>
                <td>14</td>
                <td>8 quy tắc nguy cơ y khoa, chính sách điểm số 0-100</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td><code className="inline">tests/unit/vision-validation.test.ts</code></td>
                <td>12</td>
                <td>Xác thực Magic Bytes, EXIF strip, giới hạn 10MB</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td><code className="inline">tests/unit/audit-invalidation.test.ts</code></td>
                <td>8</td>
                <td>Hủy phụ thuộc cũ, xóa bỏ nguy cơ dư thừa, AuditEvent</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td><code className="inline">tests/integration/workflow-e2e.test.ts</code></td>
                <td>10</td>
                <td>Khảo sát $\rightarrow$ Thị giác $\rightarrow$ 3D $\rightarrow$ Đánh giá $\rightarrow$ Báo cáo</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td><code className="inline">tests/integration/simulations-api.test.ts</code></td>
                <td>6</td>
                <td>API RESTful kho lưu trữ mô phỏng 3D (/api/simulations)</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td><code className="inline">tests/integration/three-clustering.test.ts</code></td>
                <td>12</td>
                <td>Gom cụm nhãn cách nhau &lt;0.95m trong không gian số hóa</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <div className="card-title">
            <Terminal size={18} color="var(--primary-hover)" />
            <span>Lệnh Chạy Kiểm Thử Cục Bộ (Local Commands)</span>
          </div>
          <pre>{`# Chạy toàn bộ 80 ca kiểm thử tự động
npm test

# Chạy kiểm thử ở chế độ theo dõi (watch mode)
npm run test:watch

# Kiểm tra tính toàn vẹn kiểu dữ liệu TypeScript
npx tsc --noEmit

# Kiểm tra build bundle sản phẩm
npm run build`}</pre>
        </div>

        <div className="card">
          <div className="card-title">
            <ShieldCheck size={18} color="var(--success)" />
            <span>Đường Ống CI/CD Tự Động (GitHub Actions)</span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            Mỗi pull request hoặc commit lên nhánh <code className="inline">main</code> đều được tự động kích hoạt:
          </p>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>ci.yml:</strong> Khởi tạo môi trường Ubuntu, cài đặt thư viện, tạo Prisma Client, typecheck TypeScript, chạy 80 tests Vitest và build production Next.js.</li>
            <li><strong>deploy-pages.yml:</strong> Tự động đóng gói và xuất bản cổng tài liệu kỹ thuật tĩnh lên GitHub Pages.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
