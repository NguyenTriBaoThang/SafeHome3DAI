"use client";

import React from "react";
import { ArrowRight, Loader2 } from "lucide-react";

/** Thanh điều hướng cuối mỗi bước: một nút chính nổi bật (trên cùng ở điện thoại), nút Quay lại phụ. */
export function StepNav(props: {
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel: React.ReactNode;
  busy?: boolean;
  busyLabel?: string;
  nextIcon?: React.ReactNode;
}) {
  return (
    <div className="pt-4 border-t border-slate-100 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center print:hidden">
      {props.onPrev ? (
        <button type="button" onClick={props.onPrev} disabled={props.busy} className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Quay lại
        </button>
      ) : <span />}
      <button
        type="button"
        onClick={props.onNext}
        disabled={props.busy}
        aria-busy={props.busy || undefined}
        className="min-h-[48px] px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-base sm:text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {props.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : props.nextIcon ?? <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span>{props.busy ? props.busyLabel ?? "Đang xử lý…" : props.nextLabel}</span>
      </button>
    </div>
  );
}
