import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";

export const metadata: Metadata = {
  title: "SafeHome 3D AI — Nhà an toàn, tuổi già an tâm",
  description:
    "Nền tảng Digital Twin 3D hỗ trợ nhận diện, giải trình và giảm thiểu nguy cơ té ngã trong không gian sống của người cao tuổi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full">
      <body className="font-sans antialiased h-full bg-slate-50 flex flex-col text-slate-900">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
