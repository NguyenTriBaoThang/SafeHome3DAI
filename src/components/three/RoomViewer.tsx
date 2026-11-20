"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Loader2 } from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { WebGLBoundary } from "./WebGLBoundary";

const RoomCanvas = dynamic(
  () => import("./RoomCanvas").then((mod) => mod.RoomCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[480px] bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-300 gap-3 border border-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        <p className="text-xs font-medium">Đang khởi tạo không gian 3D Digital Twin...</p>
      </div>
    ),
  }
);

const ComparisonViewer = dynamic(() => import("./ComparisonViewer").then((module) => module.ComparisonViewer), { ssr: false });

export const RoomViewer: React.FC = () => {
  const mode = useSimulationStore((state) => state.cameraPreset);
  return <WebGLBoundary>{mode === "COMPARISON" ? <ComparisonViewer /> : <RoomCanvas />}</WebGLBoundary>;
};

