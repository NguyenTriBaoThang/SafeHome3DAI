"use client";

import React from "react";
import { Download, FileText, Loader2, Printer, RotateCcw } from "lucide-react";
import type { SnapshotLite } from "./snapshotClient";
import { buildStateCard, type ComparisonView, type StateCard } from "./reportGuard";
import { labelCost, SIM_ACTIONS, validateVerifiedForm, type PlanItem, type SimActionId, type VerifiedForm } from "./workflowLogic";

export interface CompareSlot {
  state: "none" | "loading" | "error" | "ok";
  message?: string;
  view?: ComparisonView;
}

const TONE: Record<StateCard["key"], string> = {
  baseline: "border-slate-300 bg-slate-50 text-slate-900",
  proposed: "border-sky-300 bg-sky-50 text-sky-900",
  verified: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

function Card({ card }: { card: StateCard }) {
  return (
    <div data-testid={`state-card-${card.key}`} className={`p-4 rounded-xl border space-y-1 ${card.present ? TONE[card.key] : "border-dashed border-slate-300 bg-white text-slate-500"}`}>
      <div className="text-xs font-bold uppercase tracking-wide">{card.title}</div>
      <div className="text-[11px] opacity-80">{card.subtitle}</div>
      {card.present ? (
        <div className="text-xs pt-1 space-y-0.5">
          <div><strong>{card.hazardCount}</strong> nguy cơ ghi nhận · rev {card.revision}</div>
          <div>{card.screeningScore == null ? "Chưa thể đánh giá đầy đủ" : `Chỉ số sàng lọc (tham khảo): ${card.screeningScore}/100`}</div>
          <div className="text-[11px] opacity-80">{card.statusText}{card.unknownCount ? ` (${card.unknownCount} mục thiếu dữ liệu)` : ""}</div>
        </div>
      ) : (
        <div className="text-xs pt-1">{card.statusText}</div>
      )}
    </div>
  );
}

const CHANGE_TONE: Record<string, string> = {
  giảm: "bg-emerald-100 text-emerald-800",
  tăng: "bg-rose-100 text-rose-800",
  mới: "bg-rose-100 text-rose-800",
  "chưa biết": "bg-amber-100 text-amber-800",
  "không đổi": "bg-slate-100 text-slate-700",
};

function Comparison({ title, slot }: { title: string; slot: CompareSlot }) {
  return (
    <div className="space-y-2" data-testid={`compare-${title}`}>
      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h4>
      {slot.state === "none" && <div className="text-xs text-slate-500">Chưa có snapshot để so sánh.</div>}
      {slot.state === "loading" && <div className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang so sánh...</div>}
      {slot.state === "error" && <div role="alert" className="text-xs rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2">{slot.message}</div>}
      {slot.state === "ok" && slot.view && (
        <>
          <div data-testid="compare-headline" className={`rounded-lg px-3 py-2 text-xs font-bold ${slot.view.safeWording ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-amber-50 text-amber-900 border border-amber-200"}`}>
            {slot.view.headline}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border border-slate-200 rounded-lg">
              <thead className="bg-slate-50 text-slate-600">
                <tr><th className="text-left p-2">Quy tắc</th><th className="p-2">Thay đổi</th><th className="text-left p-2">Trước</th><th className="text-left p-2">Sau</th></tr>
              </thead>
              <tbody>
                {slot.view.rows.map((r) => (
                  <tr key={r.ruleId} className="border-t border-slate-100 align-top" data-testid="diff-row">
                    <td className="p-2 font-semibold text-slate-800">{r.ruleName}<div className="font-normal text-slate-500">{r.reason}</div>{r.warning && <div className="text-amber-700">{r.warning}</div>}</td>
                    <td className="p-2 text-center"><span className={`px-2 py-0.5 rounded-full font-bold ${CHANGE_TONE[r.change]}`}>{r.change}</span></td>
                    <td className="p-2 text-slate-600">{r.before}</td>
                    <td className="p-2 text-slate-600">{r.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {slot.view.missing.length > 0 && <div className="text-[11px] text-amber-800">Còn thiếu dữ liệu: {slot.view.missing.join(", ")}</div>}
          <p className="text-[10px] text-slate-500">{slot.view.notes}</p>
          <p className="text-[10px] text-slate-500">{slot.view.disclaimer}</p>
        </>
      )}
    </div>
  );
}

export function ReportStep(props: {
  projectName: string;
  roomName: string;
  baseline: SnapshotLite;
  proposed: SnapshotLite | null;
  verified: SnapshotLite | null;
  cmpProposed: CompareSlot;
  cmpVerified: CompareSlot;
  plan: PlanItem[];
  onPickPlan: (p: PlanItem) => void;
  form: VerifiedForm;
  setForm: (f: VerifiedForm) => void;
  submitting: boolean;
  formError: string | null;
  onSubmitVerified: () => void;
  onPrev: () => void;
  onRestart: () => void;
}) {
  const { form, setForm } = props;
  const formErrors = validateVerifiedForm(form);
  const exportJson = () => {
    const data = {
      project: props.projectName,
      room: props.roomName,
      snapshots: [props.baseline, props.proposed, props.verified].filter(Boolean).map((s) => ({ id: s!.snapshotId, type: s!.snapshotType, revision: s!.revision })),
      comparisons: { proposed: props.cmpProposed.view ?? null, verified: props.cmpVerified.view ?? null },
      exportedAt: new Date().toISOString(),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `SafeHome-Report-${props.baseline.roomId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const setMeasured = (key: "walkway" | "nightLux", patch: Partial<VerifiedForm["walkway"]>) => setForm({ ...form, [key]: { ...form[key], ...patch } });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 print:p-0 print:border-none print:shadow-none" data-testid="step-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileText className="h-5 w-5 text-teal-600" /><span>Bước 7: Báo cáo &amp; kế hoạch</span></h2>
          <p className="text-xs text-slate-500 mt-1">Ba trạng thái được giữ riêng: hiện trạng, mô phỏng đề xuất, đã xác minh thực tế.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportJson} className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"><Download className="h-4 w-4" /> Xuất JSON</button>
          <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5"><Printer className="h-4 w-4" /> In / Lưu PDF</button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs">
        <div className="font-bold uppercase tracking-wider">Báo cáo sàng lọc môi trường phòng</div>
        <div className="text-slate-300 mt-1">Dự án: {props.projectName || "(chưa đặt tên)"} · Phòng: {props.roomName}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="three-states">
        <Card card={buildStateCard("baseline", props.baseline)} />
        <Card card={buildStateCard("proposed", props.proposed)} />
        <Card card={buildStateCard("verified", props.verified)} />
      </div>

      <Comparison title="Hiện trạng so với Mô phỏng đề xuất" slot={props.cmpProposed} />
      <Comparison title="Hiện trạng so với Đã xác minh thực tế" slot={props.cmpVerified} />

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kế hoạch hành động (ưu tiên theo mức khẩn, ít bước trước)</h4>
        {props.plan.length === 0 && <div className="text-xs text-slate-500">Không có nguy cơ nào được ghi nhận để lập kế hoạch. Các mục thiếu dữ liệu vẫn cần được đo/khai báo.</div>}
        {props.plan.map((p, i) => (
          <button key={p.findingId} onClick={() => props.onPickPlan(p)} data-testid="plan-item" className="w-full text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">{i + 1}</span>
            <div className="flex-1">
              <div className="text-xs font-bold text-slate-800">{p.actionTitle} <span className="font-normal text-slate-500">({p.severity === "HIGH" ? "khẩn" : p.severity === "MEDIUM" ? "cần lưu ý" : "thấp"} · {p.ruleId})</span></div>
              <ul className="text-[11px] text-slate-600 mt-0.5 list-disc pl-4">{p.steps.map((s, k) => <li key={k}>{s}</li>)}</ul>
              <span className="text-[10px] font-bold text-teal-700 mt-1 inline-block">{labelCost(p.costEstimate)} · {p.steps.length} bước</span>
            </div>
          </button>
        ))}
      </div>

      <details className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 print:hidden" open={!props.verified} data-testid="verified-panel">
        <summary className="text-xs font-bold text-emerald-900 cursor-pointer">Tôi đã sửa ngoài thực tế (khai báo để tạo trạng thái &quot;Đã xác minh thực tế&quot;)</summary>
        <div className="mt-3 space-y-3 text-xs">
          <p className="text-slate-600">Chỉ khai báo những gì đã làm thật. Độ rộng lối đi và độ rọi đêm của hiện trạng <strong>không được mang sang</strong>: hãy đo/xác nhận lại sau khi sửa, nếu không hệ thống sẽ ghi &quot;chưa đo&quot; và không kết luận.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">Người thực hiện / xác nhận<input value={form.who} onChange={(e) => setForm({ ...form, who: e.target.value })} className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-300" data-testid="vf-who" /></label>
            <label className="block">Ngày thực hiện<input type="date" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-300" data-testid="vf-when" /></label>
          </div>
          <fieldset className="space-y-1">
            <legend className="font-semibold">Đã làm gì</legend>
            {SIM_ACTIONS.map((a) => (
              <label key={a.id} className="flex items-center gap-2">
                <input type="checkbox" checked={form.done.includes(a.id)} onChange={(e) => setForm({ ...form, done: e.target.checked ? [...form.done, a.id] : form.done.filter((x: SimActionId) => x !== a.id) })} data-testid={`vf-done-${a.id}`} />
                {a.label}
              </label>
            ))}
          </fieldset>
          <div className="grid sm:grid-cols-2 gap-3">
            {(["walkway", "nightLux"] as const).map((k) => (
              <div key={k} className="space-y-1">
                <label className="block">{k === "walkway" ? "Độ rộng lối đi sau khi sửa (m)" : "Độ rọi ban đêm sau khi sửa (Lux)"}
                  <input type="number" min={0} step={k === "walkway" ? 0.01 : 1} value={form[k].value ?? ""} onChange={(e) => setMeasured(k, { value: e.target.value === "" ? null : Number(e.target.value) })} className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-300" data-testid={`vf-${k}`} />
                </label>
                <select value={form[k].source} onChange={(e) => setMeasured(k, { source: e.target.value as "measured" | "user_confirmed" })} className="w-full px-2 py-1 rounded-lg border border-slate-300">
                  <option value="measured">Đã đo bằng dụng cụ</option>
                  <option value="user_confirmed">Tôi xác nhận (không đo bằng dụng cụ)</option>
                </select>
                {form[k].value == null && <div className="text-[11px] text-amber-700">Để trống = chưa đo, sẽ không kết luận được.</div>}
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.checked })} data-testid="vf-confirm" /> Tôi xác nhận các thay đổi trên đã được làm thật ngoài thực tế.</label>
          {formErrors.length > 0 && <ul className="text-[11px] text-slate-500 list-disc pl-4">{formErrors.map((e) => <li key={e}>{e}</li>)}</ul>}
          {props.formError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2" data-testid="vf-error">{props.formError}</div>}
          <button disabled={props.submitting || formErrors.length > 0} onClick={props.onSubmitVerified} data-testid="vf-submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-40">{props.submitting ? "Đang lưu..." : "Lưu xác minh thực tế"}</button>
        </div>
      </details>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-normal">
        <strong>Tuyên bố miễn trừ:</strong> Báo cáo sàng lọc môi trường phục vụ lập kế hoạch cải tạo, không phải chẩn đoán y khoa và không thay thế đánh giá của chuyên gia. Chi phí chỉ là ước tính. Điểm tổng không dùng làm bằng chứng giảm té ngã.
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-between print:hidden">
        <button onClick={props.onPrev} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">Quay lại</button>
        <button onClick={props.onRestart} className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2"><RotateCcw className="h-4 w-4" /> Đánh giá phòng mới</button>
      </div>
    </div>
  );
}
