import { ShieldCheck, Terminal, Award } from 'lucide-react'

export default function Testing() {
  return (
    <div className="page">
      <div>
        <h1 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem' }}>Kiểm Thử & Đảm Bảo Chất Lượng (QA & CI/CD)</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Hệ thống kiểm thử tự động toàn diện với 20 bộ kiểm thử (test suites) và 109/109 ca kiểm thử vượt qua thành công (100% Pass Rate).
        </p>
      </div>

      <section className="card" style={{ borderLeft: '4px solid var(--success)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">
            <Award size={20} color="var(--success)" />
            <span>Kết Quả Kiểm Thử Toàn Diện (Test Suite Summary)</span>
          </div>
          <span className="badge badge-success">109 / 109 Passed (100%)</span>
        </div>
        <pre>{`✓ tests/spatialValidationEngine.test.ts  (8 tests)  - Toàn vẹn không gian hình học 3D, va chạm & hành lang
✓ tests/surveyEngine.test.ts             (9 tests)  - Nhánh hóa câu hỏi, tỉa nhánh động, trích xuất NLP tiếng Việt
✓ tests/riskIntelligence.test.ts         (10 tests) - Kiểm tra 8 quy tắc y khoa lâm sàng WHO 2021 & CDC STEADI
✓ tests/realisticReconstruction.test.ts (6 tests)  - Tái tạo không gian phòng 3D thực tế
✓ tests/visionEngine.test.ts             (14 tests) - Magic bytes, cắt bỏ EXIF GPS, chuẩn hóa BBox [0..1]
✓ tests/riskEngine.test.ts               (11 tests) - Động cơ chấm điểm an toàn và phân tầng rủi ro
✓ tests/copilotEngine.test.ts            (10 tests) - Hội thoại AI RAG, phân tích ý định, phòng chống ảo giác
✓ tests/visionIntegration.test.ts        (2 tests)  - Tích hợp Vision -> Fact -> Survey -> Reassessment
✓ tests/riskIntegration.test.ts          (3 tests)  - Tích hợp đánh giá rủi ro đa phòng & lưu trữ snapshot
✓ tests/dollhouseReferenceScene.test.ts  (5 tests)  - Kiểm tra cảnh tham chiếu dollhouse phòng ngủ & vệ sinh
✓ tests/copilotIntegration.test.ts       (4 tests)  - Tích hợp AI Chat, RAG search và kiểm định nguồn gốc
✓ tests/surveyIntegration.test.ts        (4 tests)  - Tích hợp luồng khảo sát và lưu trữ database SQLite
✓ tests/simulationUndoRedo.test.ts       (3 tests)  - Khôi phục trạng thái can thiệp mô phỏng (Undo/Redo)
✓ tests/workflowEngine.test.ts           (4 tests)  - Gom cụm nhãn 3D (<0.95m), máy trạng thái 7 bước
✓ tests/itemHazardAssessment.test.ts     (4 tests)  - Thẩm định rủi ro vật dụng CDC STEADI, Hotspots H1..H4, chi phí
✓ tests/geminiVision.test.ts             (3 tests)  - Tích hợp API Gemini Multimodal Vision phân tích phòng
✓ tests/integration.test.ts              (3 tests)  - Kiểm tra tổng thể các dịch vụ tích hợp hệ thống
✓ tests/ragEngine.test.ts                (4 tests)  - Truy xuất ngữ nghĩa tài liệu an toàn lão khoa WHO/CDC
✓ tests/ragEvaluation.test.ts            (1 test)   - Benchmark đánh giá RAG 8 tiêu chí chất lượng
✓ tests/workflowIntegration.test.ts      (1 test)   - Tích hợp lưu trữ và khôi phục trạng thái quy trình khép kín

Test Files  20 passed (20)
     Tests  109 passed (109)
  Duration  24.11s (100% Pass Rate)`}</pre>
      </section>

      <section>
        <h2 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '1rem' }}>Bảng Thống Kê 20 Bộ Kiểm Thử Tự Động</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Tập tin kiểm thử</th>
                <th>Số lượng test</th>
                <th>Phạm vi kiểm tra</th>
                <th>Trạng thái CI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><code className="inline">tests/spatialValidationEngine.test.ts</code></td>
                <td>8</td>
                <td>Kiểm tra toàn vẹn không gian hình học 3D & va chạm</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>2</td>
                <td><code className="inline">tests/surveyEngine.test.ts</code></td>
                <td>9</td>
                <td>Luồng câu hỏi thích ứng, tỉa nhánh động, cơ chế NLP tiếng Việt</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>3</td>
                <td><code className="inline">tests/riskIntelligence.test.ts</code></td>
                <td>10</td>
                <td>8 quy tắc nguy cơ y khoa, chính sách điểm số 0-100 WHO/CDC</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>4</td>
                <td><code className="inline">tests/realisticReconstruction.test.ts</code></td>
                <td>6</td>
                <td>Tái tạo hình học 3D phòng ngủ & bố trí vật thể</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>5</td>
                <td><code className="inline">tests/visionEngine.test.ts</code></td>
                <td>14</td>
                <td>Xác thực Magic Bytes, EXIF strip, chuẩn hóa BBox [0..1]</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>6</td>
                <td><code className="inline">tests/riskEngine.test.ts</code></td>
                <td>11</td>
                <td>Động cơ đánh giá nguy cơ, điểm phạt và ngưỡng an toàn</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>7</td>
                <td><code className="inline">tests/copilotEngine.test.ts</code></td>
                <td>10</td>
                <td>Động cơ hội thoại AI RAG, phân tích ý định, phòng chống ảo giác</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>8</td>
                <td><code className="inline">tests/visionIntegration.test.ts</code></td>
                <td>2</td>
                <td>Tích hợp Thị giác máy tính vào Fact Store và Khảo sát</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>9</td>
                <td><code className="inline">tests/riskIntegration.test.ts</code></td>
                <td>3</td>
                <td>Đánh giá nguy cơ đa phòng và xuất snapshot</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>10</td>
                <td><code className="inline">tests/dollhouseReferenceScene.test.ts</code></td>
                <td>5</td>
                <td>Cảnh tham chiếu kiến trúc Photorealistic Dollhouse</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>11</td>
                <td><code className="inline">tests/copilotIntegration.test.ts</code></td>
                <td>4</td>
                <td>Tích hợp AI Copilot, RAG hybrid search & nguồn dẫn</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>12</td>
                <td><code className="inline">tests/surveyIntegration.test.ts</code></td>
                <td>4</td>
                <td>Tích hợp khảo sát với cơ sở dữ liệu SQLite & Prisma</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>13</td>
                <td><code className="inline">tests/simulationUndoRedo.test.ts</code></td>
                <td>3</td>
                <td>Kiểm tra cơ chế hoàn tác can thiệp mô phỏng (Undo / Redo)</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>14</td>
                <td><code className="inline">tests/workflowEngine.test.ts</code></td>
                <td>4</td>
                <td>Gom cụm nhãn 3D (&lt;0.95m) và luồng 7 bước thống nhất</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>15</td>
                <td><code className="inline">tests/itemHazardAssessment.test.ts</code></td>
                <td>4</td>
                <td>Thẩm định rủi ro vật dụng CDC STEADI, ghim nguy cơ H1..H4, chi phí</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>16</td>
                <td><code className="inline">tests/geminiVision.test.ts</code></td>
                <td>3</td>
                <td>Động cơ nhận diện đa phương thức Gemini Multimodal Vision</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>17</td>
                <td><code className="inline">tests/integration.test.ts</code></td>
                <td>3</td>
                <td>Kiểm tra tích hợp dịch vụ API và cơ sở dữ liệu toàn hệ thống</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>18</td>
                <td><code className="inline">tests/ragEngine.test.ts</code></td>
                <td>4</td>
                <td>Truy xuất ngữ nghĩa tri thức y tế WHO / CDC STEADI</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>19</td>
                <td><code className="inline">tests/ragEvaluation.test.ts</code></td>
                <td>1</td>
                <td>Bộ Benchmark đánh giá độ trung thực RAG theo 8 tiêu chí</td>
                <td><span className="badge badge-success">Passed</span></td>
              </tr>
              <tr>
                <td>20</td>
                <td><code className="inline">tests/workflowIntegration.test.ts</code></td>
                <td>1</td>
                <td>Tích hợp lưu trữ & khôi phục trạng thái quy trình 7 bước</td>
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
          <pre>{`# Chạy toàn bộ 109 ca kiểm thử tự động
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
            <li><strong>ci.yml:</strong> Khởi tạo môi trường Ubuntu, cài đặt thư viện, tạo Prisma Client, typecheck TypeScript, chạy 109 tests Vitest và build production Next.js.</li>
            <li><strong>deploy-pages.yml:</strong> Tự động đóng gói và xuất bản cổng tài liệu kỹ thuật tĩnh lên GitHub Pages.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
