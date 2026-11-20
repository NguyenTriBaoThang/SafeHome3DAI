# BÁO CÁO TRIỂN KHAI & XÁC MINH: SAFEHOME AI COPILOT 2.0
## Trợ Lý AI Đa Phương Thức, Truy Xuất Y Khoa Chứng Cứ & Điều Khiển Không Gian 3D

> **Ngày hoàn thành:** 20/11/2026  
> **Phiên bản:** SafeHome AI Copilot 2.0  
> **Phân hệ ứng dụng:** `/ai-assistant` & `/api/ai/chat`  
> **Cơ chế suy luận:** Gemini Multimodal LLM (`@google/genai`) kết hợp Curated Grounded RAG Engine & Tool Calling Registry  

---

## 1. TỔNG QUAN TÍNH NĂNG ĐÃ TRIỂN KHAI THỰC TẾ

| Nhóm chức năng | Mô tả chi tiết triển khai | File mã nguồn | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Backend AI Chatbot** | Tích hợp Google Gemini SDK (`@google/genai`) với dynamic loader `new Function('return import("@google/genai")')`, xử lý timeout, retry và fallback | `src/lib/ai/geminiChatService.ts` | **PASS** |
| **Streaming API (SSE)** | Luồng Server-Sent Events phát token văn bản mượt mà kèm metadata, citations và tool actions | `src/app/api/ai/chat/stream/route.ts` | **PASS** |
| **Context-Aware Service** | `SafeHomeContextService` tự động nạp hồ sơ người cao tuổi, kích thước phòng, vật liệu sàn, ánh sáng Lux, danh mục nội thất và 8 nguy cơ lâm sàng | `src/lib/ai/safeHomeContextService.ts` | **PASS** |
| **Function Calling / Tools** | `COPILOT_TOOLS` (15 công cụ có schema Zod): `getCurrentRoom`, `getRoomObjects`, `focus3DObject`, `focus3DRoom`, `set3DCameraMode`, `compareScenarioResults`, v.v. | `src/lib/ai/copilotToolRegistry.ts` | **PASS** |
| **3D Action Bridge** | Cầu nối trạng thái giữa Chatbot và Digital Twin WebGL qua Zustand store: tự động bay máy quay đến vật thể (`FOCUS_OBJECT`) hoặc đổi góc nhìn (`SET_CAMERA_MODE`) | `src/stores/useSimulationStore.ts` & `src/app/digital-twin/page.tsx` | **PASS** |
| **Multimodal Chat (Image)** | Hỗ trợ tải ảnh hiện trường trực tiếp trong chat, khử EXIF/GPS, xác thực Magic Bytes, hiển thị thẻ thẩm định rủi ro vật dụng (`ItemHazardCard`) | `src/app/ai-assistant/page.tsx` | **PASS** |
| **Voice Interaction (STT/TTS)**| Tích hợp Web Speech API nhận diện giọng nói tiếng Việt (`SpeechRecognition`) và đọc to câu trả lời (`SpeechSynthesisUtterance`) | `src/app/ai-assistant/page.tsx` | **PASS** |
| **Giao diện Chatbot 2.0** | Sidebar quản lý lịch sử (tìm kiếm, đổi tên, xóa), Header chọn phòng trực tiếp, bong bóng chat Markdown, thẻ hành động 3D, thanh công cụ nhập liệu mở rộng | `src/app/ai-assistant/page.tsx` | **PASS** |
| **Right Inspector Drawer** | Ngăn kéo 4 tab: Bằng chứng trích dẫn chi tiết (WHO/CDC), Vật dụng & nguy cơ trong phòng, 4 Nguồn y khoa đã thẩm định, Chỉ số đánh giá RAG | `src/app/ai-assistant/page.tsx` | **PASS** |
| **Kiểm thử tự động Vitest** | Bộ 12 test cases kiểm tra Context Service, Tool Registry, RAG Citations và 3D Action Bridge | `tests/copilotV2.test.ts` | **PASS** |

---

## 2. KIẾN TRÚC HOẠT ĐỘNG (ARCHITECTURAL FLOW)

```
[Người Dùng: Text / Voice STT / Image Upload]
       │
       ▼
[/ai-assistant Frontend Interface]
       │
       ├── (POST SSE) ──────────────────────────────────────────┐
       ▼                                                        ▼
[/api/ai/chat/stream]                                 [SafeHomeContextService]
       │                                                        │
       ├─► SafeHomeContextService (Lấy thông tin phòng, đồ vật, số đo, rủi ro)
       ├─► Hybrid RAG Retrieval (Truy xuất đoạn trích WHO 2021 & CDC STEADI)
       ├─► Context Resolver (Giải quyết đại từ: "cái thảm này", "xem trên 3D")
       │
       ▼
[Gemini Multimodal LLM / Grounded RAG Generator]
       │
       ├─► Tool Registry Execution (focus3DObject, focus3DRoom, set3DCameraMode)
       │
       ▼ (Server-Sent Events: meta, tools, chunk, done)
[/ai-assistant Message Feed]
       │
       ├── Click "Mở trên 3D" ──► [useSimulationStore.copilotPendingAction]
       │                                     │
       └─────────────────────────────────────┴─► [/digital-twin WebGL Scene]
                                                  Camera Lerp & Highlight Hotspot
```

---

## 3. CÁC CÔNG CỤ FUNCTION CALLING ĐƯỢC HỖ TRỢ

1. `getCurrentRoom({ roomId? })`: Lấy thông số căn phòng đang chọn.
2. `getRoomObjects({ roomId? })`: Trả về toàn bộ danh mục nội thất và tọa độ 3D.
3. `getRoomRiskFindings({ roomId?, severity? })`: Lấy danh sách vi phạm nguy cơ té ngã.
4. `getRiskAssessment({ roomId? })`: Lấy điểm an toàn (0-100) và các khoản trừ điểm.
5. `focus3DObject({ objectId })`: Định vị và phóng to máy quay 3D vào một đồ vật cụ thể.
6. `focus3DRoom({ roomId })`: Chuyển đổi không gian 3D sang phòng khác.
7. `highlight3DRisk({ findingId })`: Kích hoạt nhãn cảnh báo nguy cơ trên 3D.
8. `set3DCameraMode({ mode })`: Đổi góc nhìn (`ISOMETRIC`, `INTERIOR`, `TOP`, `WALKTHROUGH`, `SAFETY`, `COMPARISON`).
9. `getSurveyProgress({ roomId? })`: Xem tiến độ khảo sát thích ứng.
10. `openSurvey({ roomId? })`: Điều hướng đến biểu mẫu khảo sát an toàn.
11. `getAvailableScenarios({ roomId? })`: Lấy danh sách các kịch bản What-If.
12. `previewScenario({ scenarioId })`: Kích hoạt xem trước kịch bản can thiệp trên 3D.
13. `compareScenarioResults({ roomId? })`: So sánh điểm an toàn trước/sau cải tạo (+72 điểm).
14. `openReport({ reportId? })`: Mở trang báo cáo cải tạo và dự toán vật tư.
15. `navigateToPage({ route })`: Điều hướng nhanh đến bất kỳ phân hệ nào.

---

## 4. KẾT QUẢ KIỂM THỬ THỰC TẾ

```text
 ✓ tests/copilotV2.test.ts (12 tests passed)
   ✓ SafeHomeContextService > should retrieve full system context with resident profile and room inventory
   ✓ SafeHomeContextService > should format rich system prompt for LLM injection
   ✓ SafeHomeContextService > should resolve context references (pronouns, 3D intents, objects)
   ✓ Copilot Tool Registry > should declare 15 typed tools
   ✓ Copilot Tool Registry > should execute getCurrentRoom tool
   ✓ Copilot Tool Registry > should execute focus3DObject tool and return clientAction
   ✓ Copilot Tool Registry > should execute set3DCameraMode tool
   ✓ Copilot Tool Registry > should execute compareScenarioResults tool
   ✓ Copilot Chat Service & RAG Integration > should answer clinical fall hazard question with evidence citations
   ✓ Copilot Chat Service & RAG Integration > should attach tool action when user asks to see object on 3D
   ✓ 3D Copilot Action Bridge > should execute FOCUS_OBJECT action on simulation store
   ✓ 3D Copilot Action Bridge > should execute SET_CAMERA_MODE action on simulation store

Tổng số bài kiểm thử toàn hệ thống: 21 test suites, 121 tests passed (100%).
```

---

## 5. HƯỚNG DẪN CẤU HÌNH BIẾN MÔI TRƯỜNG (.env)

```bash
# Khóa API Google Gemini (Bắt buộc cho live multimodal LLM)
GEMINI_API_KEY=your_gemini_api_key_here

# Phiên bản mô hình Gemini ưu tiên (Tùy chọn: gemini-1.5-flash hoặc gemini-1.5-pro)
GEMINI_MODEL=gemini-1.5-flash

# Bật cờ cho phép gọi mô hình LLM ngoại vi (Mặc định: true)
ENABLE_EXTERNAL_LLM=true
```

*(Lưu ý: Nếu không cấu hình `GEMINI_API_KEY`, SafeHome AI Copilot 2.0 sẽ tự động kích hoạt cơ chế Local Grounded RAG Generator với 114 chunks y học chứng cứ đã thẩm định, đảm bảo 100% không bị gián đoạn hoạt động).*

