"use client";

import React from "react";
import { ArrowRight, Loader2, RotateCcw, Sliders } from "lucide-react";
import { RoomViewer } from "@/components/three/RoomViewer";
import type { SnapshotLite } from "./snapshotClient";
import { buildStateCard } from "./reportGuard";
import { SIM_ACTIONS, simActionApplicable, type SimActionId } from "./workflowLogic";

export function SimulationStep(props: {
  baseline: SnapshotLite;
  proposed: SnapshotLite | null;
  chosen: SimActionId[];
  savedChosen: SimActionId[];
  saving: boolean;
  error: string | null;
  onToggle: (id: SimActionId) => void;
  onReset: () => void;
  onSave: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { baseline, proposed, chosen } = props;
  const dirty = chosen.slice().sort().join() !== props.savedChosen.slice().sort().join();
  const card = buildStateCard("proposed", proposed);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6" data-testid="step-6">
      <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-teal-600" />
            <span>Bước 6: Mô phỏng cải thiện (chỉ là giả lập)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Chọn các thay đổi muốn thử, rồi lưu thành snapshot &quot;Mô phỏng đề xuất&quot;. Kết quả mô phỏng không chứng minh phòng đã an toàn ngoài thực tế.
          </p>
        </div>
        <button onClick={props.onReset} className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Bỏ chọn
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
        <div className="text-xs font-bold text-teal-900">Thay đổi thử nghiệm (chỉ hiện khi áp dụng được với dữ liệu hiện trạng):</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SIM_ACTIONS.map((a) => {
            const ok = simActionApplicable(a.id, baseline.roomState);
            const on = chosen.includes(a.id);
            return (
              <button
                key={a.id}
                disabled={!ok}
                aria-pressed={on}
                data-testid={`sim-action-${a.id}`}
                onClick={() => props.onToggle(a.id)}
                className={`p-3 rounded-xl border text-left transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  on ? "bg-teal-600 text-white border-teal-700" : "bg-white border-teal-200 hover:border-teal-400"
                }`}
              >
                <div className="text-xs font-bold">{a.label}</div>
                <div className={`text-[11px] mt-0.5 ${on ? "text-teal-50" : "text-slate-500"}`}>{ok ? a.hint : "Không áp dụng với dữ liệu hiện trạng"}</div>
                <div className={`text-[10px] mt-1 font-semibold ${on ? "text-teal-100" : "text-teal-700"}`}>{a.cost} · {a.effort}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-[440px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
        <RoomViewer />
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4" data-testid="sim-result">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-300">{card.title} — {card.subtitle}</div>
          {proposed ? (
            <div className="text-sm font-bold">
              {card.hazardCount} nguy cơ còn ghi nhận ·{" "}
              {card.screeningScore == null ? (
                <span className="text-amber-300">chưa thể đánh giá đầy đủ ({card.unknownCount} quy tắc thiếu dữ liệu)</span>
              ) : (
                <span>chỉ số sàng lọc mô phỏng {card.screeningScore}/100</span>
              )}
              <span className="ml-2 text-[10px] font-mono text-slate-400">rev {card.revision}</span>
            </div>
          ) : (
            <div className="text-sm font-bold text-slate-300">Chưa lưu mô phỏng nào.</div>
          )}
          {dirty && <div className="text-[11px] text-amber-300">Có thay đổi chưa lưu.</div>}
        </div>
        <button
          onClick={props.onSave}
          disabled={props.saving || chosen.length === 0 || !dirty}
          data-testid="sim-save"
          className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold text-xs disabled:opacity-40 flex items-center gap-2"
        >
          {props.saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {props.saving ? "Đang lưu..." : "Lưu mô phỏng đề xuất"}
        </button>
      </div>
      {props.error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800" data-testid="sim-error">
          {props.error}
        </div>
      )}

      <div className="pt-4 border-t border-slate-100 flex justify-between">
        <button onClick={props.onPrev} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Quay lại</button>
        <button onClick={props.onNext} className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2">
          <span>So sánh &amp; báo cáo (bước 7)</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
