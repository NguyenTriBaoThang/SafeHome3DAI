# Chiến Lược Nhà Cung Cấp Mô Hình Thị Giác (Vision Model Provider Strategy)

Tài liệu này trình bày thiết kế kiến trúc đa mô hình (Dual-Engine Strategy) cho phân hệ **SafeHome Vision Intelligence**, đảm bảo tính liên tục trong vận hành (high availability), bảo vệ quyền riêng tư người dùng y tế và hoàn toàn không phụ thuộc cứng vào bất kỳ nhà cung cấp AI đám mây nào.

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

1. **Không Bao Giờ Bị Tắc Nghẽn (Never Blocked)**: Hệ thống luôn cung cấp đường lui (Graceful Fallback). Nếu không có kết nối internet hoặc API Multimodal AI bị quá tải/lỗi quota, hệ thống tự động chuyển sang Chế độ Kiểm tra Thủ công (Manual Photo Review Mode) mà không báo lỗi sập ứng dụng.
2. **Minh Bạch Tuyệt Đối (Zero Hallucination Tolerance)**: Mọi kết quả phát hiện từ mô hình đều phải đính kèm độ tin cậy (`confidence` 0..1), nguồn nhận diện (`DETECTION_SOURCE`), và hộp giới hạn tọa độ chuẩn hóa (`[ymin, xmin, ymax, xmax]`).
3. **Phân Định Giới Hạn Của Thị Giác 2D (2D Limitations)**: Tuyệt đối không để AI Vision tự suy đoán thông số đo đạc 3D thực tế (như chiều cao giường chính xác bằng cm) hoặc tình trạng ánh sáng ban đêm khi chỉ có ảnh chụp ban ngày.

---

## 2. Hai Chế Độ Vận Hành (Two Operational Modes)

### 2.1 Chế Độ A: Multimodal AI Vision Engine (Tự Động)
- **Cơ chế**: Kết hợp giữa Multimodal Vision-Language Model (VLM) hoặc các mạng nơ-ron nhận diện chuyên biệt (Pretrained Object Detector) với các quy tắc suy luận heuristic theo chuẩn an toàn nhà ở người cao tuổi.
- **Quy trình hoạt động**:
  1. Tiếp nhận ảnh phòng ngủ hoặc phòng tắm đã qua làm sạch EXIF.
  2. Phân tích ngữ cảnh toàn phòng (Room Context) và phát hiện các thực thể quan trọng (Giường, Ghế, Thảm trải sàn, Dây điện, Tay vịn, Bồn cầu).
  3. Trả về danh sách `ObjectDetection` và kích hoạt động cơ sinh `VisionObservation` (ví dụ: phát hiện thảm trải sàn cạnh mép giường hoặc dây điện bắc ngang sàn).
  4. Tạo các câu hỏi làm rõ (`VisionClarification`) tương ứng với các quan sát có độ bất định cao.

### 2.2 Chế Độ B: Manual Photo Review Mode (Thủ Công Chuyên Nghiệp)
- **Mục đích**: Dành cho gia đình hoặc điều dưỡng viên muốn trực tiếp kiểm tra ảnh mà không cần gửi dữ liệu qua API AI bên ngoài (đảm bảo quyền riêng tư tuyệt đối).
- **Tính năng Studio**:
  - Tải ảnh hoặc chụp ảnh trực tiếp từ webcam/camera điện thoại.
  - Sử dụng công cụ vẽ Bounding Box trực quan trên ảnh chất lượng cao.
  - Chọn danh mục thực thể từ bộ phân loại 15 nhóm chuẩn hóa.
  - Xác nhận hoặc bác bỏ nhãn và hoàn thành bảng câu hỏi làm rõ.

---

## 3. Khả Năng Mở Rộng API Multimodal (Pluggable Providers)

Giao diện `VisionProvider` được thiết kế theo mẫu *Strategy Pattern*:

```typescript
export interface IVisionProvider {
  analyzeRoomImage(
    input: VisionAnalysisInput
  ): Promise<VisionAnalysisOutput>;
}
```

Các nhà cung cấp có thể tích hợp:
- **Google Gemini Multimodal API** (Gemini 1.5 Pro / Flash Vision)
- **Local YOLOv8 / RT-DETR** chạy trên Edge / Container nội bộ
- **Rule-based Heuristic Fallback** (mặc định sẵn có trong mã nguồn dự án)

