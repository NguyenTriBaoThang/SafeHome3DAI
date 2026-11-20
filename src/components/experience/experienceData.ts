export interface ChapterData {
  id: number
  key: string
  tag: string
  headline: string
  subhead: string
  description: string
  cameraPosition: [number, number, number]
  cameraLookAt: [number, number, number]
  cameraFov: number
  lightingPreset: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'STUDIO'
  isSafeState: boolean
  showRiskMarkers: boolean
  highlightedRiskId?: string
  metrics: Array<{ label: string; value: string; badge?: string }>
  evidenceDetails?: {
    mechanism: string
    clinicalEvidence: string
    citation: string
  }
}

export const CHAPTERS_DATA: ChapterData[] = [
  {
    id: 1,
    key: 'home-reveal',
    tag: 'CHƯƠNG 01 · TỔNG QUAN KHÔNG GIAN',
    headline: 'Ngôi nhà thân quen. Những nguy cơ có thể bị bỏ sót.',
    subhead: 'Khám phá bản sao số 3D hoàn chỉnh không gian sống gia đình',
    description:
      'Không gian sinh hoạt hàng ngày lưu giữ những kỷ niệm ấm áp, nhưng đối với người cao tuổi, những chi tiết nhỏ nhất trong bài trí nội thất lại có thể trở thành cái bẫy nguy hiểm dẫn đến té ngã nghiêm trọng.',
    cameraPosition: [7.8, 8.6, 8.4],
    cameraLookAt: [0.1, 0.4, -0.1],
    cameraFov: 38,
    lightingPreset: 'STUDIO',
    isSafeState: false,
    showRiskMarkers: false,
    metrics: [
      { label: 'Diện tích số hóa', value: '7.5m × 5.2m', badge: '1:1 Scale' },
      { label: 'Phân khu chức năng', value: '4 Khu vực', badge: 'Multi-Zone' },
      { label: 'Ánh sáng tự nhiên', value: '320 Lux', badge: 'PBR Shaders' }
    ]
  },
  {
    id: 2,
    key: 'look-inside',
    tag: 'CHƯƠNG 02 · KHÁM PHÁ NỘI THẤT',
    headline: 'Bóc tách không gian phòng ngủ & hành lang đi lại',
    subhead: 'Phòng ngủ là nơi phát sinh hơn 43% các ca té ngã ban đêm',
    description:
      'Hành trình di chuyển từ giường ngủ sang nhà vệ sinh là cung đường có rủi ro cao nhất. Mắt người cao tuổi cần từ 3–5 phút để thích nghi với bóng tối khi thức giấc, trong khi khả năng giữ thăng bằng giảm sút rõ rệt.',
    cameraPosition: [-1.8, 3.4, 2.8],
    cameraLookAt: [-1.8, 0.4, -0.2],
    cameraFov: 42,
    lightingPreset: 'MORNING',
    isSafeState: false,
    showRiskMarkers: false,
    metrics: [
      { label: 'Nguy cơ ban đêm', value: '43% ca té ngã', badge: 'WHO 2021' },
      { label: 'Chiều rộng thông thủy', value: '0.95m', badge: 'ADA Standard' },
      { label: 'Cao độ mặt đệm', value: '48 cm', badge: 'Công thái học' }
    ]
  },
  {
    id: 3,
    key: 'discover-risks',
    tag: 'CHƯƠNG 03 · NHẬN DIỆN MỐI NGUY',
    headline: '4 Điểm nguy cơ tiềm ẩn được phát hiện tự động',
    subhead: 'Hệ thống đối chiếu hiện trạng với 8 quy tắc lâm sàng WHO & CDC',
    description:
      'Khi chuyển sang chế độ ban đêm y học (40 Lux), các mối nguy lập tức bộc lộ. Điểm an toàn ban đầu chỉ đạt 28/100 — thuộc nhóm Nguy Cơ Cao với 4 vi phạm nghiêm trọng cần xử lý gấp.',
    cameraPosition: [-1.5, 3.8, 3.4],
    cameraLookAt: [-1.2, 0.3, 0.2],
    cameraFov: 44,
    lightingPreset: 'NIGHT',
    isSafeState: false,
    showRiskMarkers: true,
    highlightedRiskId: 'RISK-001',
    metrics: [
      { label: 'Điểm an toàn hiện tại', value: '28 / 100', badge: 'Nguy Cơ Cao' },
      { label: 'Mối nguy phát hiện', value: '4 Điểm', badge: '4 Vi phạm' },
      { label: 'Ánh sáng ban đêm', value: '40 Lux', badge: 'Thiếu sáng' }
    ]
  },
  {
    id: '4' as any,
    key: 'understand-why',
    tag: 'CHƯƠNG 04 · CƠ CHẾ Y KHOA LÂM SÀNG',
    headline: 'Tại sao điểm này lại nguy hiểm đối với người già?',
    subhead: 'Phân tích cơ chế sinh học chấn thương (Biomechanics)',
    description:
      'Người cao tuổi có dáng đi lê với khoảng cách nhấc bàn chân rất thấp (<1.5cm). Mép thảm quăn hoặc dây điện chỉ dày 6mm vắt ngang lối đi cũng đủ để móc vào mũi dép, làm đổ người về phía trước.',
    cameraPosition: [-1.6, 2.0, 1.4],
    cameraLookAt: [-1.4, 0.1, -0.2],
    cameraFov: 35,
    lightingPreset: 'NIGHT',
    isSafeState: false,
    showRiskMarkers: true,
    highlightedRiskId: 'RISK-001',
    metrics: [
      { label: 'Khoảng cách nhấc chân', value: '< 1.5 cm', badge: 'Dáng đi lê' },
      { label: 'Nguy cơ va đập góc nhọn', value: 'Focal Impact', badge: 'Tụ máu' },
      { label: 'Thời gian phản xạ', value: 'Chậm 2.4 lần', badge: 'Thần kinh' }
    ],
    evidenceDetails: {
      mechanism:
        'Cơ chế mất thăng bằng đột ngột do vấp mép thảm hoặc dây điện kết hợp với giảm thị lực sâu, khiến người cao tuổi không kịp đưa tay chống đỡ, ngã trực tiếp xuống sàn cứng.',
      clinicalEvidence:
        'Gãy cổ xương đùi (Femoral Neck Fracture) là biến chứng thường gặp nhất, với tỷ lệ tử vong trong năm đầu sau ngã lên đến 24% theo thống kê y tế quốc tế.',
      citation: 'WHO Global Report on Fall Prevention (2021) Trang 14 & CDC STEADI Checklist Trang 2.'
    }
  },
  {
    id: 5,
    key: 'make-it-safer',
    tag: 'CHƯƠNG 05 · MÔ PHỎNG CAN THIỆP WHAT-IF',
    headline: 'Khắc phục triệt để với chi phí thấp (~65.000 VNĐ)',
    subhead: 'Thử nghiệm can thiệp ảo trực quan trước khi mua sắm thật',
    description:
      'Không cần đập phá hay sửa chữa đắt tiền. SafeHome 3D AI kích hoạt can thiệp ảo: Dây điện được kẹp gọn vào nẹp chân tường, mép thảm dán băng dính chống trơn, tăng ánh sáng 320 Lux và bổ sung thanh vịn.',
    cameraPosition: [1.2, 4.4, 4.2],
    cameraLookAt: [0.2, 0.5, 0.1],
    cameraFov: 40,
    lightingPreset: 'STUDIO',
    isSafeState: true,
    showRiskMarkers: false,
    metrics: [
      { label: 'Điểm an toàn phục hồi', value: '100 / 100', badge: '+72 Điểm' },
      { label: 'Chi phí ước tính', value: '~65.000 đ', badge: 'Siêu tiết kiệm' },
      { label: 'Thời gian thi công', value: '< 30 phút', badge: 'Tự làm được' }
    ]
  },
  {
    id: 6,
    key: 'compare-results',
    tag: 'CHƯƠNG 06 · SO SÁNH TRƯỚC / SAU & HÀNH ĐỘNG',
    headline: 'Ngôi nhà an toàn, tuổi già an tâm',
    subhead: 'Bảo vệ toàn diện sức khỏe và tính mạng đấng sinh thành',
    description:
      'Chỉ qua một vài bước điều chỉnh thiết thực dựa trên y học chứng cứ, không gian sống trở nên an toàn 100%. Toàn bộ dữ liệu được liên kết đồng bộ sang Hồ sơ Báo cáo y tế và Kế hoạch thi công.',
    cameraPosition: [7.2, 7.8, 7.6],
    cameraLookAt: [0.1, 0.3, -0.1],
    cameraFov: 38,
    lightingPreset: 'STUDIO',
    isSafeState: true,
    showRiskMarkers: false,
    metrics: [
      { label: 'Chỉ số an toàn tổng hợp', value: '100 / 100', badge: 'Hoàn Hảo' },
      { label: 'Nguy cơ còn tồn đọng', value: '0 Mối nguy', badge: 'Đã giải tỏa' },
      { label: 'Bằng chứng y khoa', value: '100% Verified', badge: 'WHO & CDC' }
    ]
  }
]

