"use client";

import React from "react";
import { AiRoomScannerWizard } from "@/components/scanner/AiRoomScannerWizard";

export default function VisionScannerPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-6 bg-slate-100 flex flex-col justify-center">
      <div className="max-w-6xl mx-auto w-full">
        <AiRoomScannerWizard />
      </div>
    </div>
  );
}
