# Lược Đồ Dữ Liệu Thị Giác (Vision Data Schema & Contract)

Tài liệu này định nghĩa cấu trúc cơ sở dữ liệu (Prisma Schema) và hợp đồng dữ liệu JSON (Data Contract) cho phân hệ **SafeHome Vision Intelligence**.

---

## 1. Các Thực Thể Cơ Sở Dữ Liệu (Prisma Models)

```prisma
// 1. Ảnh phòng
model RoomImage {
  id              String           @id @default(cuid())
  roomId          String
  filePath        String
  fileName        String
  mimeType        String
  fileSizeBytes   Int
  width           Int?
  height          Int?
  viewpointType   String           @default("ENTRANCE")
  isPrimary       Boolean          @default(false)
  uploadedAt      DateTime         @default(now())
  analyses        VisionAnalysis[]
}

// 2. Phiên phân tích thị giác
model VisionAnalysis {
  id              String            @id @default(cuid())
  imageId         String
  roomId          String
  providerType    String            @default("AI_VISION")
  confidenceScore Float             @default(0.0)
  status          String            @default("COMPLETED")
  analyzedAt      DateTime          @default(now())
  image           RoomImage         @relation(fields: [imageId], references: [id], onDelete: Cascade)
  detections      ObjectDetection[]
  observations    VisionObservation[]
}

// 3. Thực thể nhận diện được
model ObjectDetection {
  id                  String         @id @default(cuid())
  analysisId          String
  category            String
  label               String
  confidence          Float
  bboxJson            String         // "{ xMin, yMin, xMax, yMax }"
  source              String         @default("MODEL_PREDICTED")
  verificationStatus  String         @default("PENDING_REVIEW")
  reviewedByUserId    String?
  reviewedAt          DateTime?
  analysis            VisionAnalysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
}

// 4. Quan sát vật lý tiềm ẩn nguy cơ
model VisionObservation {
  id              String         @id @default(cuid())
  analysisId      String
  observationType String
  uncertaintyType String
  description     String
  severity        String         @default("MEDIUM")
  analysis        VisionAnalysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
}

// 5. Câu hỏi làm rõ hướng dẫn người dùng
model VisionClarification {
  id              String    @id @default(cuid())
  roomId          String
  relatedImageId  String?
  questionId      String    // BED_006, BED_007, BED_008, BATH_005, ...
  questionText    String
  suggestedAnswer String?
  status          String    @default("PENDING") // PENDING, ANSWERED, DISMISSED
  userResponse    String?
  answeredAt      DateTime?
}

// 6. Sự thật phòng đã xác nhận
model VisionRoomFact {
  id                  String    @id @default(cuid())
  roomId              String
  factKey             String    // has_rug, rug_fixed, cable_on_floor, has_grab_bar
  factValue           String    // "YES" | "NO" | JSON
  source              String    @default("USER_CONFIRMED_VISION")
  verificationStatus  String    @default("CONFIRMED")
  confirmedAt         DateTime  @default(now())
}

// 7. Nhật ký kiểm toán bảo mật và hành động
model VisionAuditEvent {
  id          String   @id @default(cuid())
  roomId      String
  actionType  String   // IMAGE_UPLOADED, DETECTION_CONFIRMED, FACTS_SYNCED_TO_SURVEY
  targetId    String?
  previousVal String?
  newValue    String?
  actorId     String   @default("USER")
  createdAt   DateTime @default(now())
}
```

---

## 2. Chuẩn Hóa Tọa Độ Bounding Box (Bounding Box Contract)

Hộp giới hạn luôn được chuẩn hóa trong khoảng `[0.0, 1.0]` tương đối với kích thước ảnh:

```typescript
export interface NormalizedBoundingBox {
  xMin: number; // 0.0 .. 1.0 (Trái)
  yMin: number; // 0.0 .. 1.0 (Trên)
  xMax: number; // 0.0 .. 1.0 (Phải)
  yMax: number; // 0.0 .. 1.0 (Dưới)
}
```
Mô hình đảm bảo:
- `xMin < xMax` và `yMin < yMax`
- Không phụ thuộc vào kích thước màn hình thiết bị người dùng.

