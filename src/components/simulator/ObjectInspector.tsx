"use client";

import React from "react";
import {
  Layers,
  Move,
  RotateCw,
  Trash2,
  CheckCircle,
  ShieldPlus,
  SlidersHorizontal,
  Lightbulb,
  Droplets,
  HelpCircle,
  X,
  Focus,
  BadgeCheck,
  Box,
  Palette,
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { ASSET_REGISTRY } from "@/data/assetRegistry";

export const ObjectInspector: React.FC = () => {
  const {
    getCurrentRoom,
    selectedObjectId,
    selectObject,
    updateObjectPosition,
    updateObjectRotation,
    updateObjectProperties,
    fixObject,
    removeObject,
    addSafetyDevice,
    setLightingLevel,
    setFloorWetness,
    setAntiSlip,
    focusOnLocation,
    currentAssessment,
    transformMode,
    setTransformMode,
  } = useSimulationStore();

  const room = getCurrentRoom();
  const selectedObject = room.objects.find((o) => o.id === selectedObjectId);
  const hazard = currentAssessment?.findings.find(
    (f) => f.targetObjectId === selectedObjectId
  );
  const assetDef = selectedObject?.assetId
    ? ASSET_REGISTRY[selectedObject.assetId]
    : null;

  if (!selectedObject) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Điều khiển môi trường phòng
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
            {room.name.split("(")[0].trim()}
          </span>
        </div>

        {/* Room Environmental Controls */}
        <div className="space-y-3">
          {/* Lighting slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Độ rọi
                chiếu sáng:
              </span>
              <span className="font-bold text-slate-800">
                {room.lightingLevel} Lux
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={380}
              step={10}
              value={room.lightingLevel}
              onChange={(e) => setLightingLevel(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Đêm tối (30 Lux)</span>
              <span>Tiêu chuẩn (150 Lux)</span>
              <span>Ánh nắng (320+ Lux)</span>
            </div>
          </div>

          {/* Wet floor & anti-slip toggles */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
            <button
              onClick={() => setFloorWetness(!room.isWet)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                room.isWet
                  ? "bg-sky-50 border-sky-300 text-sky-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Droplets className="h-3.5 w-3.5" />
              <span>Sàn ướt: {room.isWet ? "Có" : "Khô ráo"}</span>
            </button>

            <button
              onClick={() => setAntiSlip(!room.isSlipResistant)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                room.isSlipResistant
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Chống trượt: {room.isSlipResistant ? "Đạt" : "Kém"}</span>
            </button>
          </div>
        </div>

        {/* Quick Add Safety Devices */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <ShieldPlus className="h-3.5 w-3.5 text-teal-600" />
            <span>Thêm thiết bị an toàn chống ngã:</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => addSafetyDevice("grab_bar_toilet")}
              className="px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 flex items-center gap-1.5 transition"
            >
              <ShieldPlus className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span>Vịn bồn cầu</span>
            </button>
            <button
              onClick={() => addSafetyDevice("grab_bar_shower")}
              className="px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 flex items-center gap-1.5 transition"
            >
              <ShieldPlus className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span>Vịn vòi sen</span>
            </button>
            <button
              onClick={() => addSafetyDevice("anti_slip_mat")}
              className="col-span-2 px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 flex items-center justify-center gap-1.5 transition"
            >
              <ShieldPlus className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span>Thảm cao su chống trượt giác hút</span>
            </button>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
          <span>
            Bấm chọn một đồ nội thất trong mô hình 3D (giường, tủ, bồn cầu, vòi
            sen...) để xem thông số kỹ thuật, điều chỉnh vị trí hoặc kiểm tra
            rủi ro.
          </span>
        </div>
      </div>
    );
  }

  // An object is selected
  const halfW = room.dimensions.width / 2 - 0.3;
  const halfL = room.dimensions.length / 2 - 0.3;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
      {/* Header with Category and Verification */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
              {selectedObject.category}
            </span>
            {selectedObject.verified && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <BadgeCheck className="h-3 w-3 text-emerald-600" />
                <span>Verified AI</span>
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">
            {selectedObject.name}
          </h3>
          {assetDef && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
              <Box className="h-3 w-3 text-slate-400" />
              <span>Asset: {assetDef.id}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => selectObject(null)}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
          title="Đóng bảng chi tiết"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Hazard Warning Pill if any */}
      {hazard && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Nguy cơ: {hazard.title}</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-snug">
            {hazard.description}
          </p>
        </div>
      )}

      {/* Dimensions & Properties */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <div className="text-[10px] text-slate-400">Rộng (W)</div>
          <div className="font-bold text-slate-700">
            {selectedObject.dimensions.width.toFixed(2)}m
          </div>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <div className="text-[10px] text-slate-400">Dài (L)</div>
          <div className="font-bold text-slate-700">
            {selectedObject.dimensions.length.toFixed(2)}m
          </div>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <div className="text-[10px] text-slate-400">Cao (H)</div>
          <div className="font-bold text-slate-700">
            {selectedObject.dimensions.height.toFixed(2)}m
          </div>
        </div>
      </div>

      {/* Focus Camera & 3D Gizmo Mode */}
      <div className="space-y-2">
        <button
          onClick={() => focusOnLocation(selectedObject.position)}
          className="w-full py-1.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
        >
          <Focus className="h-3.5 w-3.5 text-sky-600" />
          <span>Góc nhìn cận cảnh đồ vật</span>
        </button>

        {/* 3D Transform Mode Toggles */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() =>
              setTransformMode(transformMode === "translate" ? null : "translate")
            }
            className={`py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition ${
              transformMode === "translate"
                ? "bg-teal-50 border-teal-300 text-teal-800 font-bold shadow-sm"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Move className="h-3 w-3" />
            <span>Kéo 3D</span>
          </button>
          <button
            onClick={() =>
              setTransformMode(transformMode === "rotate" ? null : "rotate")
            }
            className={`py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition ${
              transformMode === "rotate"
                ? "bg-teal-50 border-teal-300 text-teal-800 font-bold shadow-sm"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <RotateCw className="h-3 w-3" />
            <span>Xoay 3D</span>
          </button>
          <button
            onClick={() => {
              // Snap to floor: clamp Y=0
              updateObjectPosition(selectedObject.id, [
                selectedObject.position[0],
                0,
                selectedObject.position[2],
              ]);
            }}
            className="py-1 px-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1 transition"
            title="Hạ đồ vật tiếp xúc sát mặt sàn Y=0"
          >
            <span>Snap Sàn</span>
          </button>
        </div>
      </div>

      {/* Model Selection & Verification status */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-600">Mô hình 3D:</span>
          {!selectedObject.verified ? (
            <button
              onClick={() =>
                updateObjectProperties(selectedObject.id, { verified: true })
              }
              className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 hover:bg-teal-100"
            >
              ✓ Xác nhận đúng
            </button>
          ) : (
            <span className="text-[10px] font-bold text-emerald-600">
              ✓ Đã xác minh
            </span>
          )}
        </div>

        {/* Change 3D Model dropdown */}
        <select
          value={selectedObject.assetId || ""}
          onChange={(e) => {
            const newAssetId = e.target.value;
            const newEntry = ASSET_REGISTRY[newAssetId];
            if (newEntry) {
              updateObjectProperties(selectedObject.id, {
                assetId: newEntry.id,
                glbPath: newEntry.glbPath,
                dimensions: newEntry.nominalDimensions,
              });
            }
          }}
          className="w-full px-2 py-1 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800"
        >
          <option value="">(Mô hình hình học chi tiết)</option>
          {Object.values(ASSET_REGISTRY).map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>

      {/* Position Sliders */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Move className="h-3.5 w-3.5 text-teal-600" />
          <span>Vị trí không gian (Tọa độ):</span>
        </div>

        {/* X position */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Trục X (Ngang):</span>
            <span className="font-mono font-bold text-slate-700">
              {selectedObject.position[0].toFixed(2)}m
            </span>
          </div>
          <input
            type="range"
            min={-halfW}
            max={halfW}
            step={0.05}
            value={selectedObject.position[0]}
            onChange={(e) =>
              updateObjectPosition(selectedObject.id, [
                Number(e.target.value),
                selectedObject.position[1],
                selectedObject.position[2],
              ])
            }
            className="w-full accent-teal-600 cursor-pointer"
          />
        </div>

        {/* Z position */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Trục Z (Dọc):</span>
            <span className="font-mono font-bold text-slate-700">
              {selectedObject.position[2].toFixed(2)}m
            </span>
          </div>
          <input
            type="range"
            min={-halfL}
            max={halfL}
            step={0.05}
            value={selectedObject.position[2]}
            onChange={(e) =>
              updateObjectPosition(selectedObject.id, [
                selectedObject.position[0],
                selectedObject.position[1],
                Number(e.target.value),
              ])
            }
            className="w-full accent-teal-600 cursor-pointer"
          />
        </div>

        {/* Rotation Y */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Góc xoay (Trục đứng):</span>
            <span className="font-mono font-bold text-slate-700">
              {Math.round((selectedObject.rotation[1] * 180) / Math.PI)}°
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.PI * 2}
            step={Math.PI / 12}
            value={selectedObject.rotation[1]}
            onChange={(e) =>
              updateObjectRotation(selectedObject.id, [
                selectedObject.rotation[0],
                Number(e.target.value),
                selectedObject.rotation[2],
              ])
            }
            className="w-full accent-teal-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
        {/* Quick Fix Button if applicable */}
        {(selectedObject.category === "RUG" ||
          selectedObject.category === "CABLE" ||
          selectedObject.category === "OBSTACLE") && (
          <button
            onClick={() => fixObject(selectedObject.id)}
            className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 transition"
          >
            <CheckCircle className="h-4 w-4" />
            <span>
              {selectedObject.category === "RUG"
                ? "Dán băng dính & lót cao su chống trượt"
                : selectedObject.category === "CABLE"
                ? "Luồn nẹp bảo vệ sát tường"
                : "Kê dịch sát góc tường"}
            </span>
          </button>
        )}

        <button
          onClick={() => removeObject(selectedObject.id)}
          className="w-full py-2 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
        >
          <Trash2 className="h-4 w-4" />
          <span>Di dời / Loại bỏ khỏi phòng</span>
        </button>
      </div>
    </div>
  );
};
