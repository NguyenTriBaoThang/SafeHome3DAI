export interface ChapterData {
  id: number;
  key: string;
  label: string;
  headline: string;
  description: string;
}
export const CHAPTERS_DATA: ChapterData[] = [
  { id: 1, key: "home-reveal", label: "Ngôi nhà của bạn", headline: "Ngôi nhà thân quen. Những nguy cơ có thể bị bỏ sót.", description: "Khám phá từng góc không gian sống, nhìn rõ những điều cần thay đổi để mỗi bước chân vững vàng hơn." },
  { id: 2, key: "look-inside", label: "Nhìn vào bên trong", headline: "Mỗi đồ vật. Một phần của hành trình.", description: "Chọn phòng, chạm vào đồ vật và quan sát lối đi. Hiểu cách các không gian kết nối trước khi đánh giá nguy cơ." },
  { id: 3, key: "discover-risks", label: "Nhận diện nguy cơ", headline: "Nhìn thấy điều mắt thường dễ bỏ qua.", description: "Mỗi ghim gắn với một phát hiện của bộ quy tắc đang chạy trên dữ liệu phòng. Chọn ghim để xem quan sát và cách khắc phục." },
  { id: 4, key: "understand-why", label: "Hiểu rõ nguyên nhân", headline: "Một dấu hiệu. Đầy đủ ngữ cảnh.", description: "Đọc quy tắc, dữ liệu đầu vào và nguồn quan sát. Kích thước ước lượng cần được kiểm tra trước khi quyết định cải tạo." },
  { id: 5, key: "make-it-safer", label: "Thử một thay đổi", headline: "An tâm hơn, từ những điều nhỏ.", description: "Cố định thảm, thu gọn dây điện hoặc thêm thiết bị hỗ trợ. Điểm số được tính lại từ trạng thái mới, không gán sẵn kết quả." },
  { id: 6, key: "compare-results", label: "Trước và sau", headline: "Thấy sự thay đổi. Chọn bước tiếp theo.", description: "Kéo thanh so sánh để xem cùng một góc nhìn. Xem các nguy cơ đã giải quyết, còn tồn tại và đưa kịch bản vào không gian đang làm việc." },
];

