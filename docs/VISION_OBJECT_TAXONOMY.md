# Bộ Phân Loại Thực Thể Thị Giác (Vision Object Taxonomy)

Hệ thống phân loại thực thể trong **SafeHome Vision Intelligence** bao gồm 15 lớp đối tượng nội thất và vật cản quan trọng đối với nguy cơ trượt, ngã của người cao tuổi.

---

## 1. Bảng 15 Nhóm Thực Thể Chuẩn Hóa

| Mã Danh Mục (`DetectionCategory`) | Tên Tiếng Việt | Màu Đại Diện | Biểu Tượng | Đòi Hỏi Đánh Giá Chuyên Biệt | Quan Hệ Với Té Ngã |
|---|---|---|---|:---:|---|
| `bed` | Giường ngủ | `#6366F1` (Indigo) | Bed | Không | Nguy cơ ngã khi lên/xuống giường |
| `chair` | Ghế ngồi | `#3B82F6` (Blue) | Armchair | Không | Độ vững chãi và tay vịn khi đứng lên |
| `table` | Bàn ăn / Bàn làm việc | `#0EA5E9` (Sky) | Table | Không | Chắn lối đi hoặc điểm bám tạm thời |
| `cabinet` | Tủ đồ / Tủ quần áo | `#8B5CF6` (Purple) | Archive | Không | Tầm với quá cao gây mất thăng bằng |
| `nightstand` | Tab đầu giường | `#A855F7` (Violet) | Layers | Không | Vị trí đặt đèn ngủ và chuông khẩn cấp |
| `door` | Cửa ra vào / Cửa phòng | `#14B8A6` (Teal) | DoorOpen | Không | Độ rộng mở cửa, bản lề mở vào/ra |
| `toilet` | Bồn cầu vệ sinh | `#06B6D4` (Cyan) | Bath | Không | Chiều cao bệ ngồi và hỗ trợ đứng |
| `sink` | Bồn rửa mặt / Lavabo | `#22D3EE` (Light Cyan) | Droplets | Không | Tránh bám vào lavabo thay cho tay vịn |
| `bathtub` | Bồn tắm nằm / Khay tắm | `#38BDF8` (Light Blue) | Waves | Không | Nguy cơ trơn trượt rất cao khi bước qua thành |
| `sofa` | Ghế bành / Sofa | `#64748B` (Slate) | Sofa | Không | Ghế quá lún hoặc quá thấp |
| `rug` | Thảm trải sàn | `#F59E0B` (Amber) | Footprints | **Có** | Mép thảm quăn, không cố định gây vấp ngã |
| `electrical_cable` | Dây điện sàn | `#EF4444` (Red) | Zap | **Có** | Vướng chân trên đường di chuyển |
| `grab_bar` | Thanh tay vịn | `#10B981` (Emerald) | Shield | **Có** | Điểm tựa an toàn quan trọng nhất phòng tắm |
| `obstacle_route` | Vật cản lối đi | `#F97316` (Orange) | AlertTriangle | **Có** | Hộp giấy, đồ chơi bừa bộn trên đường đi |
| `threshold_step` | Gờ cửa / Bậc tam cấp | `#EC4899` (Pink) | Milestone | **Có** | Chênh lệch độ cao nền không nhìn rõ |

---

## 2. Xử Lý Các Lớp Đối Tượng Chuyên Biệt (Specialized Classes)

Các lớp như `grab_bar`, `electrical_cable`, `rug` và `threshold_step` đòi hỏi sự xác minh của con người vì:
1. **Thanh tay vịn (`grab_bar`) vs Giá treo khăn**: Các mô hình thị giác thông thường dễ nhầm lẫn giữa thanh treo khăn nhẹ và thanh tay vịn chịu tải chuyên dụng.
2. **Dây điện (`electrical_cable`) vs Vân gạch/ron sàn**: Dây cáp mỏng trên nền gạch hoa văn có thể gây dương tính giả (false positive) hoặc bỏ sót (false negative).
3. **Thảm trải sàn (`rug`)**: Thị giác 2D nhìn thấy thảm nhưng không thể xác định lớp đế có chống trượt (anti-slip backing) hay đã được dán keo cố định hay chưa. Do đó, hệ thống luôn tự động đặt câu hỏi làm rõ (`BED_006` / `BED_007`).

