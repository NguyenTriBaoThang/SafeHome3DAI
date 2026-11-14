"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Box,
  Sliders,
  AlertTriangle,
  Bot,
  BarChart3,
  Network,
  FileText,
  UserCheck,
  Info,
  ShieldCheck,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Tổng quan & Chỉ số",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    href: "/ai-guided-survey",
    label: "Khảo sát AI thông minh",
    icon: ClipboardCheck,
    badge: "AI Survey",
  },
  {
    href: "/digital-twin",
    label: "Bản sao số 3D",
    icon: Box,
    badge: "Core",
  },
  {
    href: "/scenario-simulator",
    label: "Mô phỏng kịch bản",
    icon: Sliders,
    badge: "Interactive",
  },
  {
    href: "/risk-assessment",
    label: "Đánh giá nguy cơ",
    icon: AlertTriangle,
    badge: "Risk AI",
  },
  {
    href: "/risk-assessment/traceability",
    label: "Truy xuất nguồn gốc XAI",
    icon: Network,
    badge: "Audit",
  },
  {
    href: "/ai-assistant",
    label: "Trợ lý AI & RAG",
    icon: Bot,
    badge: "RAG",
  },
  {
    href: "/analytics",
    label: "Phân tích Trước/Sau",
    icon: BarChart3,
    badge: null,
  },
  {
    href: "/explainability",
    label: "Sơ đồ giải trình XAI",
    icon: Network,
    badge: "Trace",
  },
  {
    href: "/reports",
    label: "Báo cáo an toàn",
    icon: FileText,
    badge: "Xuất PDF",
  },
];

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 hidden lg:flex">
      {/* Navigation Links */}
      <div className="p-4 space-y-6">
        <div>
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Phân hệ ứng dụng
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                    isActive
                      ? "bg-teal-50 text-teal-800 font-bold border border-teal-200/80 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive
                          ? "text-teal-600"
                          : "text-slate-400 group-hover:text-slate-700"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold",
                        isActive
                          ? "bg-teal-200/80 text-teal-900"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Resident Persona Widget */}
        <div className="rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/70 to-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Bác Nam (75 tuổi)
              </div>
              <div className="text-[10px] text-slate-500">Đối tượng đánh giá</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed bg-white/80 p-2 rounded-lg border border-slate-100">
            Giảm thị lực ban đêm, thoái hóa khớp gối độ 2, đi lại cần khoảng tựa vững, có thói quen dậy vệ sinh 2 lần/đêm.
          </p>
        </div>
      </div>

      {/* Educational & Medical Safety Disclaimer */}
      <div className="p-4 border-t border-slate-100">
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 leading-normal">
              <strong>Tuyên bố y tế:</strong> Hệ thống phục vụ mục đích giáo dục
              và hoạch định cải tạo không gian sống an toàn, không thay thế cho
              chẩn đoán y khoa hay khảo sát xây dựng thực tế.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

