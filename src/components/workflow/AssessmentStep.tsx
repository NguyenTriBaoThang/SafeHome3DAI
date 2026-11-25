"use client";

import React from "react";
import { AlertTriangle, BookOpen, Link2, Link2Off } from "lucide-react";
import { RoomViewer } from "@/components/three/RoomViewer";
import type { SnapshotLite } from "./snapshotClient";
import { StepNav } from "./StepNav";

const SEV: Record<string, { label: string; cls: string; icon: string }> = {
  HIGH: { label: "Nguy cơ cao", cls: "bg-rose-100 text-rose-900", icon: "▲" },
  MEDIUM: { label: "Cần lưu ý", cls: "bg-amber-100 text-amber-900", icon: "●" },
  LOW: { label: "Mức thấp", cls: "bg-slate-100 text-slate-800", icon: "○" },
};
const CERTAINTY: Record<string, string> = {
  CONFIRMED: "đã xác nhận",
  PROVISIONAL: "tạm thời",
  HYPOTHETICAL: "giả định",
};

export function AssessmentStep(props: {
  baseline: SnapshotLite;
  sceneObjectIds: Set<string>;
  selectedId: string | null;
  onSelect: (finding: any) => void;
  onRag: (finding: any) => void;
  onPrev: () => void;
  onNext: () => void;
  busy?: boolean;
}) {
  const { baseline, sceneObjectIds, selectedId } = props;
  const a = baseline.canonicalAssessment;
  const unknownRules = a.ruleTrace.filter((t: any) => t.state === "NEEDS_VERIFICATION");
  const incomplete = a.missingInputs.length > 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6" data-testid="step-5">
      <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>Bước 5: Đánh giá nguy cơ môi trường</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Kết quả do bộ quy tắc chuẩn tính từ câu trả lời và số đo bạn đã nhập (snapshot Hiện trạng #{baseline.revision}, đã lưu). Mô hình 3D chỉ dùng để chỉ vị trí.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold" data-testid="step5-score">
            {incomplete ? (
              <span className="text-amber-300">Chưa thể đánh giá đầy đủ ({unknownRules.length} quy tắc thiếu dữ liệu)</span>
            ) : (
              <>
                <span>Chỉ số sàng lọc (tham khảo): </span>
                <span className="text-amber-400 text-sm font-black">{a.heuristicSafetyScore}/100</span>
              </>
            )}
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-900 border border-rose-300 text-sm font-bold">
            {a.findings.length} nguy cơ đã ghi nhận
          </div>
        </div>
      </div>

      {unknownRules.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid="step5-unknown">
          <strong>Chưa thể đánh giá:</strong> {unknownRules.map((t: any) => t.ruleName).join("; ")}. Các mục này không được coi là an toàn; hãy quay lại bước 2 để đo/khai báo (phòng mới) khi có số liệu.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Danh sách nguy cơ ({a.findings.length})</h3>
          {a.findings.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600" data-testid="step5-empty">
              Chưa ghi nhận nguy cơ nào từ dữ liệu đã nhập. Điều này không có nghĩa là phòng an toàn: các mục thiếu dữ liệu được liệt kê ở trên.
            </div>
          )}
          {a.findings.map((f: any) => {
            const linked = f.targetObjectId && sceneObjectIds.has(f.targetObjectId);
            const sev = SEV[f.severity] ?? SEV.LOW;
            return (
              <div
                key={f.id}
                data-testid="finding-card"
                onClick={() => props.onSelect(f)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedId === f.id ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20" : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${sev.cls}`}><span aria-hidden="true">{sev.icon} </span>{sev.label}</span>
                  <span className="text-xs font-mono text-slate-600">{f.ruleId} · {CERTAINTY[f.certainty] ?? f.certainty}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800">{f.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{f.description}</p>
                {f.requiresManualConfirmation && (
                  <p className="text-xs text-amber-700 mt-1">Cần xác nhận tại hiện trường.</p>
                )}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  {linked ? (
                    <button type="button" aria-pressed={selectedId === f.id} onClick={(e) => { e.stopPropagation(); props.onSelect(f); }} className="min-h-[44px] font-semibold flex items-center gap-1 text-teal-800 underline">
                      <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Làm nổi vật thể 3D
                    </button>
                  ) : (
                    <span className="font-semibold flex items-center gap-1 text-slate-700">
                      <Link2Off className="h-3.5 w-3.5" aria-hidden="true" /> Không gắn với vật thể 3D cụ thể
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); props.onRag(f); }}
                    className="min-h-[44px] px-2 text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1"
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Giải thích
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col space-y-3">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Mô hình phòng (mô phỏng gần đúng)</h3>
          <div className="h-[300px] sm:h-[380px] w-full max-w-full rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
            <RoomViewer />
          </div>
          <p className="text-xs text-slate-500 text-center">Chọn một nguy cơ để làm nổi vật thể liên quan trong mô hình.</p>
        </div>
      </div>

      <StepNav onPrev={props.onPrev} onNext={props.onNext} busy={props.busy} busyLabel="Đang chuyển…" nextLabel="Mô phỏng cải thiện (sang bước 6)" />
    </div>
  );
}
