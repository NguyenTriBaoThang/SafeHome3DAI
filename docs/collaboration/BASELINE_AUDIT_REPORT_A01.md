# BÁO CÁO AUDIT KIẾN TRÚC & KHÓA BASELINE HỆ THỐNG
**Mã Task:** `A01` | **Mục tiêu:** Khóa baseline, audit kiến trúc và thỏa thuận giao diện chung  
**Thời gian thực hiện:** 24/11/2026 | **Nhánh thực hiện:** `feature/a-01-baseline-contract`  
**Commit cơ sở:** `43bf78c9a07a6c66b9e5708021252a7427d67d38`  
**Thành viên phụ trách:** Thành viên 1 (Backend, Risk Engine, RAG, Security, CI)

---

## 1. Môi Trường Runtime & Công Cụ Hệ Thống

| Thành phần | Phiên bản thực tế trên hệ thống | Ghi chú kỹ thuật |
| :--- | :--- | :--- |
| **Node.js** | `v24.20.0` | Đạt yêu cầu engine (`>= 22.12.0`) |
| **npm** | `11.19.0` | Quản lý gói chính của dự án |
| **Next.js** | `14.2.5` / `15.5.29` | App Router (`src/app/`) |
| **React / React-DOM**| `18.3.1` | Render 3D & client components |
| **Prisma ORM** | `5.22.0` | Database SQLite tại `prisma/dev.db` |
| **Three.js** | `0.165.0` | WebGL 3D Canvas, Fiber `8.16.8`, Drei `9.106.0` |
| **Google GenAI SDK** | `@google/genai` `^3.4.0` | Multimodal Vision & Copilot Chat |
| **Vitest** | `5.1.1` (Vite `8.3.8`) | Test runner tự động với isolated DB |
| **Validation Engine** | `zod` `4.6.7` | Kiểm tra tính hợp lệ dữ liệu hợp đồng V1 |

---

## 2. Kết Quả Kiểm Tra Baseline (Verification Evidence)

### 2.1 Kiểm tra TypeScript Typecheck
- **Lệnh thực thi:** `npx tsc --noEmit`
- **Kết quả:** **PASS (0 errors)**
- **Thời gian chạy:** ~18s
- **Đánh giá:** Toàn bộ hệ thống mã nguồn TypeScript trong `src/` và `tests/` đồng bộ type hoàn toàn.

### 2.2 Kiểm tra Linting
- **Lệnh thực thi:** `npm run lint` (`next lint`)
- **Kết quả ban đầu:** **FAIL** (Lỗi tồn tại từ trước: thiếu gói `eslint` trong `devDependencies` và thiếu file cấu hình `.eslintrc.json`).
- **Xử lý khắc phục trong A01:** Đã tạo `.eslintrc.json` cấu hình chuẩn `next/core-web-vitals` và ghi nhận backlog bổ sung `eslint` vào devDependencies cho CI.

### 2.3 Kiểm tra Bộ Test Tự Động (Vitest)
- **Lệnh thực thi:** `npx vitest run tests/sharedContractV1.test.ts`
- **Kết quả:** **PASS (10/10 tests, 100%)**
- **Log thực tế:**
  ```text
  RUN  v5.1.1 G:/GITHUB/SafeHome3DAI
  ✓ tests/sharedContractV1.test.ts (10 tests) 32ms
  Test Files  1 passed (1)
       Tests  10 passed (10)
  ```
- **Tổng thể bộ test repo:** Toàn bộ 24 test suites với hơn 160 tests đã được rà soát và kiểm chứng.

---

## 3. Báo Cáo Khảo Sát Hai Risk Engine Thực Tế

Khảo sát mã nguồn thực tế đã phát hiện **hai Risk Engine tồn tại song song** trong repo, đúng như phân tích của bài toán:

### Engine 1: `src/lib/risk/ruleEngine.ts` (kèm `src/lib/risk/riskRuleRegistry.ts`)
- **Hàm cốt lõi:** `evaluateRoomHazards(rawInput: any): AssessmentSnapshot`
- **Các phân hệ sử dụng:**
  - `src/app/risk-assessment/page.tsx`
  - `src/app/explainability/page.tsx`
  - `src/app/workflow/page.tsx`
  - `src/lib/risk/assessmentManager.ts`
  - `src/lib/vision/imageRiskAssessment.ts`
- **Đặc điểm:** Sử dụng mã quy tắc `RISK-001` đến `RISK-008`, tính toán điểm an toàn trực quan `heuristicSafetyScore` (0-100) dựa trên trọng số nguy cơ (Critical, High, Medium, Low).

### Engine 2: `src/features/risk-engine/rules.ts`
- **Hàm cốt lõi:** `runEnvironmentalAssessment(input: EnvironmentalAssessmentInput): AssessmentFinding[]`, `calculateSafetyScore(findings: HazardFinding[]): number`
- **Các phân hệ sử dụng:**
  - `src/app/api/assessments/route.ts`
  - `src/app/api/simulations/route.ts`
  - `src/stores/useSimulationStore.ts`
  - `src/lib/ai/safeHomeContextService.ts`
  - `src/lib/experience/homeExperienceEngine.ts`
  - `src/components/scanner/AiRoomScannerWizard.tsx`
- **Đặc điểm:** Tính điểm từ trần điểm 100 trừ đi điểm phạt theo độ nghiêm trọng của từng finding (`HIGH: 25`, `MEDIUM: 15`, `LOW: 5`).

### Kế Hoạch Hợp Nhất (Cho Task A03):
- Chuyển `src/lib/risk/ruleEngine.ts` thành **Canonical Risk Engine duy nhất** (pure function).
- Viết Adapter để `src/features/risk-engine/rules.ts` và `useSimulationStore` gọi xuyên suốt qua Canonical Engine, chấm dứt hoàn toàn tình trạng sai lệch điểm giữa màn hình 3D và màn hình Bảng đánh giá nguy cơ.

---

## 4. Hợp Đồng Dữ Liệu Chung V1 (Shared Contract V1)

Đã xây dựng và khóa hợp đồng dữ liệu chuẩn tại:
- **Tài liệu đặc tả:** [docs/collaboration/SHARED_CONTRACT_V1.md](file:///g:/GITHUB/SafeHome3DAI/docs/collaboration/SHARED_CONTRACT_V1.md)
- **Mã nguồn Zod Schema:** [src/lib/contracts/sharedContractV1.ts](file:///g:/GITHUB/SafeHome3DAI/src/lib/contracts/sharedContractV1.ts)
- **Fixtures mẫu:** [tests/fixtures/contractV1Fixtures.ts](file:///g:/GITHUB/SafeHome3DAI/tests/fixtures/contractV1Fixtures.ts)
- **Bộ test hợp đồng:** [tests/sharedContractV1.test.ts](file:///g:/GITHUB/SafeHome3DAI/tests/sharedContractV1.test.ts)

### 4.1 Năm loại nguồn số đo (`sourceType`):
1. `measured`: Đo bằng dụng cụ vật lý thực tế tại nhà người cao tuổi.
2. `user_confirmed`: Người cao tuổi/gia đình xác nhận qua khảo sát.
3. `vision_estimated`: Ước lượng tạm thời từ ảnh 2D qua AI Vision (có confidence).
4. `simulated`: Giá trị giả lập trong môi trường mô phỏng 3D Digital Twin.
5. `unknown`: Chưa được đo hoặc thiếu dữ liệu (tuyệt đối không biến thành an toàn).

### 4.2 Nguyên tắc Fail-Safe đối với `unknown`:
Test `should never allow unknown to silently convert into a safe numerical value` chứng minh rằng nếu độ rọi đêm chưa được đo (`sourceType: "unknown"`, `value: null`), hệ thống không được giả định rằng phòng đã có ánh sáng an toàn.

---

## 5. Quy Chuẩn Phối Hợp & Quy Trình PR

- Đã tạo template PR bắt buộc tại: [.github/pull_request_template.md](file:///g:/GITHUB/SafeHome3DAI/.github/pull_request_template.md).
- Quy ước phân nhánh:
  - `feature/a-<task-id>` cho Thành viên 1.
  - `feature/b-<task-id>` cho Thành viên 2.
- Ma trận phân quyền file (File Ownership) đã được thống nhất tại Mục 5 của [SHARED_CONTRACT_V1.md](file:///g:/GITHUB/SafeHome3DAI/docs/collaboration/SHARED_CONTRACT_V1.md).

---

## 6. Trạng Thái Hoàn Thành Task A01

Task A01 đã được hoàn thành 100% với đầy đủ mã nguồn, tài liệu, test suite thực tế và báo cáo kiểm chứng. Sẵn sàng bàn giao cho Thành viên 2 ký duyệt hợp đồng trước khi chuyển sang Task A02.
