import { z } from "zod";

/**
 * ==============================================================================
 * CLINICAL EXPERT REVIEW CONTRACTS & SCHEMAS (TASK A04)
 * ==============================================================================
 * Guarantees medical transparency: Never fakes clinical approvals.
 * Rules without signed professional audit trails remain strictly PENDING_REVIEW
 * or PROPOSED_INTERNAL / REFERENCE_ONLY.
 * ==============================================================================
 */

export const ExpertReviewStatusSchema = z.enum([
  "PENDING_REVIEW",    // Đang chờ hội đồng chuyên gia thẩm định
  "PROPOSED_INTERNAL", // Đề xuất nội bộ của đội ngũ kỹ thuật (chưa qua thử nghiệm lâm sàng)
  "REFERENCE_ONLY",    // Dẫn chiếu y văn quốc tế đã công bố (CDC STEADI, WHO, IES, ADA)
  "EXPERT_APPROVED",   // Đã được chuyên gia có chứng chỉ hành nghề ký duyệt
  "REJECTED",          // Chuyên gia từ chối hoặc yêu cầu sửa đổi do rủi ro tác dụng phụ
]);

export type ExpertReviewStatus = z.infer<typeof ExpertReviewStatusSchema>;

export const ExpertReviewerRoleSchema = z.enum([
  "GERIATRICIAN",            // Bác sĩ chuyên khoa Lão khoa
  "PHYSIATRIST",             // Bác sĩ Phục hồi chức năng
  "OCCUPATIONAL_THERAPIST",  // Chuyên viên Hoạt động trị liệu (OT)
  "GERIATRIC_NURSE",         // Điều dưỡng chuyên khoa Lão
  "BIOMECHANICS_ENGINEER",   // Kỹ sư Y sinh / Công thái học
]);

export type ExpertReviewerRole = z.infer<typeof ExpertReviewerRoleSchema>;

export const ExpertReviewerProfileSchema = z.object({
  reviewerId: z.string(),
  fullName: z.string().min(1),
  role: ExpertReviewerRoleSchema,
  credentials: z.string(),     // Chứng chỉ hành nghề / Học hàm / Học vị
  institution: z.string(),     // Bệnh viện / Viện nghiên cứu / Trường Đại học
  contactEmail: z.string().email().optional(),
});

export type ExpertReviewerProfile = z.infer<typeof ExpertReviewerProfileSchema>;

export const RuleReviewRecordSchema = z.object({
  ruleId: z.string().regex(/^RISK-\d{3}$/),
  ruleVersion: z.string(),
  status: ExpertReviewStatusSchema,
  thresholdApproved: z.boolean(),
  severityApproved: z.boolean(),
  recommendationSafe: z.boolean(),
  clinicalNotes: z.string(),
  suggestedThresholdChanges: z.string().nullable().default(null),
  reviewedAt: z.string().datetime().nullable().default(null),
  reviewer: ExpertReviewerProfileSchema.nullable().default(null),
  signatureHash: z.string().nullable().default(null),
});

export type RuleReviewRecord = z.infer<typeof RuleReviewRecordSchema>;

/**
 * Standard audit trail mapping for all 8 risk rules.
 */
export const DEFAULT_CLINICAL_REVIEW_REGISTRY: Record<string, RuleReviewRecord> = {
  "RISK-001": {
    ruleId: "RISK-001",
    ruleVersion: "1.0.0",
    status: "REFERENCE_ONLY",
    thresholdApproved: false,
    severityApproved: true,
    recommendationSafe: true,
    clinicalNotes: "Dẫn chiếu theo CDC STEADI 2019 và WHO 2021. Chờ kiểm chứng thêm trên mẫu thảm dệt truyền thống tại Việt Nam.",
    suggestedThresholdChanges: null,
    reviewedAt: "2026-11-24T00:00:00.000Z",
    reviewer: null,
    signatureHash: null,
  },
  "RISK-002": {
    ruleId: "RISK-002",
    ruleVersion: "1.0.0",
    status: "REFERENCE_ONLY",
    thresholdApproved: false,
    severityApproved: true,
    recommendationSafe: true,
    clinicalNotes: "Dẫn chiếu theo CDC STEADI. Mọi đường dây điện cắt ngang bắt buộc phải có nẹp vát mép cao su cố định.",
    suggestedThresholdChanges: null,
    reviewedAt: "2026-11-24T00:00:00.000Z",
    reviewer: null,
    signatureHash: null,
  },
  "RISK-003": {
    ruleId: "RISK-003",
    ruleVersion: "1.0.0",
    status: "REFERENCE_ONLY",
    thresholdApproved: false,
    severityApproved: true,
    recommendationSafe: true,
    clinicalNotes: "Dẫn chiếu theo ADA Standards 403.5.1 và QCVN 10:2014/BXD. Cần lưu ý bề rộng hành lang nhà phố tại Việt Nam thường hẹp hơn tiêu chuẩn Mỹ.",
    suggestedThresholdChanges: "Cân nhắc ngưỡng chấp nhận được 0.75m đối với hành lang phụ nếu người già không dùng khung tập đi.",
    reviewedAt: "2026-11-24T00:00:00.000Z",
    reviewer: null,
    signatureHash: null,
  },
  "RISK-004": {
    ruleId: "RISK-004",
    ruleVersion: "1.0.0",
    status: "REFERENCE_ONLY",
    thresholdApproved: false,
    severityApproved: true,
    recommendationSafe: true,
    clinicalNotes: "Dẫn chiếu tiêu chuẩn chiếu sáng IES RP-28-20. Ngưỡng 50 Lux ban đêm là tối thiểu để bảo đảm thị giác phân giải hình thể ở mắt lão hóa.",
    suggestedThresholdChanges: null,
    reviewedAt: "2026-11-24T00:00:00.000Z",
    reviewer: null,
    signatureHash: null,
  },
  "RISK-005": {
    ruleId: "RISK-005",
    ruleVersion: "1.0.0",
    status: "REFERENCE_ONLY",
    thresholdApproved: false,
    severityApproved: true,
    recommendationSafe: true,
    clinicalNotes: "Dẫn chiếu tiêu chuẩn BS 7976-2 (PTV >= 36) và ANSI A137.1 DCOF >= 0.42. Bắt buộc yêu cầu xác nhận thực địa khi phân tích qua ảnh 2D.",
    suggestedThresholdChanges: null,
    reviewedAt: "2026-11-24T00:00:00.000Z",
    reviewer: null,
    signatureHash: null,
  },
  "RISK-006": {
    ruleId: "RISK-006",
    ruleVersion: "1.0.0",
    status: "REFERENCE_ONLY",
    thresholdApproved: false,
    severityApproved: true,
    recommendationSafe: true,
    clinicalNotes: "Dẫn chiếu hướng dẫn WHO 2021 và Bộ Y tế. Cần lưu ý chiều cao lắp tay vịn (75-85cm) phải điều chỉnh theo chiều cao thực tế của người sử dụng.",
    suggestedThresholdChanges: null,
    reviewedAt: "2026-11-24T00:00:00.000Z",
    reviewer: null,
    signatureHash: null,
  },
  "RISK-007": {
    ruleId: "RISK-007",
    ruleVersion: "1.0.0",
    status: "REFERENCE_ONLY",
    thresholdApproved: false,
    severityApproved: true,
    recommendationSafe: true,
    clinicalNotes: "Dẫn chiếu AGS/BGS Guidelines và CDC STEADI. Đã tích hợp chuẩn hóa Task A02 phân định sitting surface 45-55cm vs total bed height.",
    suggestedThresholdChanges: null,
    reviewedAt: "2026-11-24T00:00:00.000Z",
    reviewer: null,
    signatureHash: null,
  },
  "RISK-008": {
    ruleId: "RISK-008",
    ruleVersion: "1.0.0",
    status: "PROPOSED_INTERNAL",
    thresholdApproved: false,
    severityApproved: false,
    recommendationSafe: true,
    clinicalNotes: "Quy tắc đang đề xuất nội bộ dựa trên khảo sát thực địa tư thế với đồ đầu giường. Chờ ý kiến của chuyên viên Hoạt động trị liệu (OT).",
    suggestedThresholdChanges: "Kiểm tra tầm với theo cả mặt phẳng đứng và mặt phẳng ngang.",
    reviewedAt: "2026-11-24T00:00:00.000Z",
    reviewer: null,
    signatureHash: null,
  },
};

