"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  Bot,
  Network,
  BarChart3,
  UserCheck,
  Info,
  ArrowRight,
  ChevronDown,
  Layers,
  Box,
  ClipboardCheck,
  Camera,
  Sliders,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Các phân hệ độc lập bên ngoài (không nằm trong luồng tuyến tính 7 bước)
const EXTERNAL_MODULES = [
  {
    href: "/experience",
    label: "Trải nghiệm Cinematic",
    icon: Compass,
    badge: "Tour 3D",
    highlight: true,
  },
  {
    href: "/dashboard",
    label: "Tổng quan & Chỉ số",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    href: "/ai-vision",
    label: "Thị giác AI (AI Vision)",
    icon: Camera,
    badge: "Vision",
    highlight: true,
  },
  {
    href: "/simulations",
    label: "Kho mô phỏng 3D",
    icon: Box,
    badge: "3D Hub",
    highlight: true,
  },
  {
    href: "/ai-assistant",
    label: "Trợ lý AI Agent",
    icon: Bot,
    badge: "Agent",
    highlight: true,
  },
  {
    href: "/explainability",
    label: "Truy vết quyết định (Provenance)",
    icon: Network,
    badge: "Trace",
    highlight: true,
  },
  {
    href: "/analytics",
    label: "Phân tích Trước/Sau",
    icon: BarChart3,
    badge: null,
  },
];

// Các công cụ thành phần đã nằm trọn vẹn trong 7 bước (có thể mở riêng lẻ khi cần)
const COMPONENT_TOOLS = [
  { href: "/ai-guided-survey", label: "Khảo sát AI (Bước 1-2)", icon: ClipboardCheck },
  { href: "/ai-vision", label: "Thị giác AI (Bước 3)", icon: Camera },
  { href: "/digital-twin", label: "Bản sao số 3D (Bước 4)", icon: Box },
  { href: "/risk-assessment", label: "Đánh giá nguy cơ (Bước 5)", icon: AlertTriangle },
  { href: "/scenario-simulator", label: "Mô phỏng can thiệp (Bước 6)", icon: Sliders },
  { href: "/reports", label: "Báo cáo an toàn (Bước 7)", icon: FileText },
];

export const AppSidebar: React.FC = () => {
  const pathname = usePathname();
  const isWorkflowActive = pathname === "/workflow";
  const [showComponents, setShowComponents] = useState(false);

  if (pathname === "/experience" || pathname === "/sign-in") return null;

  return (
    <aside className="w-64 h-full overflow-hidden border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 hidden lg:flex">
      {/* Navigation Links */}
      <div className="p-3 space-y-2.5 flex-1 min-h-0 overflow-y-auto">
        {/* 1 Nút Gom Toàn Bộ Quy Trình: Hành trình 7 Bước AI */}
        <div>
          <Link
            href="/workflow"
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-2xl text-sm font-bold transition-all shadow-md group border",
              isWorkflowActive
                ? "bg-gradient-to-r from-teal-600 to-sky-600 text-white border-teal-500 shadow-teal-500/20 ring-2 ring-teal-400/30"
                : "bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white border-transparent hover:shadow-teal-500/25"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs shrink-0">
                <Compass className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-black tracking-tight">Hành trình 7 Bước AI</div>
                <div className="text-[11px] text-teal-100 font-normal leading-snug">
                  Khảo sát ➔ 3D ➔ Đánh giá ➔ Mô phỏng ➔ Báo cáo
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-teal-100 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        </div>

        {/* Danh sách các phân hệ độc lập ngoài luồng 7 bước */}
        <div>
          <div className="px-3 text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Phân hệ ứng dụng
          </div>
          <nav className="space-y-0.5">
            {EXTERNAL_MODULES.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 rounded-xl text-sm font-semibold transition-all group",
                    isActive
                      ? "bg-teal-50 text-teal-800 font-bold border border-teal-200/80 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                    item.highlight && !isActive && "text-teal-700 font-bold"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive
                          ? "text-teal-600"
                          : item.highlight
                          ? "text-teal-600"
                          : "text-slate-600 group-hover:text-slate-700"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-bold",
                        isActive
                          ? "bg-teal-200/80 text-teal-900"
                          : item.highlight
                          ? "bg-teal-100 text-teal-800"
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

        {/* Xem các công cụ thành phần lẻ (đã nằm trong 7 bước) */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowComponents(!showComponents)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-600 transition"
          >
            <span>Mở lẻ từng bước (Tùy chọn)</span>
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", showComponents && "rotate-180")}
            />
          </button>

          {showComponents && (
            <div className="mt-1 space-y-0.5 animate-fade-in pl-1">
              {COMPONENT_TOOLS.map((tool) => {
                const isActive = pathname === tool.href;
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition text-slate-500 hover:text-slate-800 hover:bg-slate-50",
                      isActive && "font-bold text-teal-700 bg-teal-50"
                    )}
                  >
                    <Icon className="h-3 w-3 text-slate-600" />
                    <span>{tool.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Resident Persona Widget */}
        <div className="rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/70 to-white p-2.5 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Gia đình của bạn
              </div>
              <div className="text-[11px] text-slate-500">Hồ sơ khảo sát riêng</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug bg-white/80 p-1.5 rounded-lg border border-slate-100">
            Thông tin người được khảo sát cần do gia đình cung cấp và xác nhận trong phần khảo sát tại nhà.
          </p>
        </div>
      </div>

      {/* Educational & Medical Safety Disclaimer */}
      <div className="p-2.5 border-t border-slate-100">
        <div className="rounded-xl bg-slate-50 p-2 border border-slate-200/80">
          <div className="flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-snug">
              <strong>Tuyên bố y tế:</strong> Hệ thống phục vụ mục đích giáo dục
              và hoạch định cải tạo không gian sống an toàn, không thay thế cho
              chẩn đoán y khoa.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
