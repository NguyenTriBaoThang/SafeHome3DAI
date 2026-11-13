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
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";

export const ObjectInspector: React.FC = () => {
  const {
    getCurrentRoom,
    selectedObjectId,
    selectObject,
    updateObjectPosition,
    updateObjectRotation,
    fixObject,
    removeObject,
    addSafetyDevice,
    setLightingLevel,
    setFloorWetness,
    setAntiSlip,
    currentAssessment,
  } = useSimulationStore();

  const room = getCurrentRoom();
  const selectedObject = room.objects.find((o) => o.id === selectedObjectId);
  const hazard = currentAssessment?.findings.find(
    (f) => f.targetObjectId === selectedObjectId
  );

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
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Độ rọi chiếu sáng:
              </span>
              <span className="font-bold text-slate-800">{room.lightingLevel} Lux</span>
            </div>
            <input
              type="range"
              min={30}
              max={350}
              step={10}
              value={room.lightingLevel}
              onChange={(e) => setLightingLevel(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Đêm tối (30 Lux)</span>
              <span>Tiêu chuẩn (150 Lux)</span>
              <span>Rõ nét (300+ Lux)</span>
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
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Lớp chống trượt: {room.isSlipResistant ? "Đã có" : "Chưa"}</span>
            </button>
          </div>
        </div>

        {/* Add Safety Devices */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Thêm thiết bị hỗ trợ an toàn
          </div>
          <div className="grid grid-cols-2 gap-2">
            {room.roomType === "BATHROOM" ? (
              <>
                <button
                  onClick={() => addSafetyDevice("grab_bar_toilet")}
                  className="px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 flex items-center gap-1.5 transition"
                >
                  <ShieldPlus className="h-3.5 w-3.5 text-teal-600" />
                  <span>Vịn bồn cầu</span>
                </button>
                <button
                  onClick={() => addSafetyDevice("grab_bar_shower")}
                  className="px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 flex items-center gap-1.5 transition"
                >
                  <ShieldPlus className="h-3.5 w-3.5 text-teal-600" />
                  <span>Vịn vòi sen</span>
                </button>
                <button
                  onClick={() => addSafetyDevice("anti_slip_mat")}
                  className="col-span-2 px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 flex items-center justify-center gap-1.5 transition"
                >
                  <ShieldPlus className="h-3.5 w-3.5 text-teal-600" />
                  <span>Thảm cao su chống trượt hút sàn</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => addSafetyDevice("night_light")}
                  className="col-span-2 px-2.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Lightbulb className="h-3.5 w-3.5 text-teal-600" />
                  <span>Lắp đèn ngủ cảm ứng chân tường</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
          <span>
            Bấm chọn một vật thể trong không gian 3D để kiểm tra thông số chi tiết, điều chỉnh vị trí hoặc áp dụng biện pháp khắc phục.
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
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {selectedObject.category}
          </span>
          <h3 className="text-sm font-bold text-slate-900">{selectedObject.name}</h3>
        </div>
        <button
          onClick={() => selectObject(null)}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
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
          <div className="font-bold text-slate-700">{selectedObject.dimensions.width}m</div>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <div className="text-[10px] text-slate-400">Dài (L)</div>
          <div className="font-bold text-slate-700">{selectedObject.dimensions.length}m</div>
        </div>
        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
          <div className="text-[10px] text-slate-400">Cao (H)</div>
          <div className="font-bold text-slate-700">{selectedObject.dimensions.height}m</div>
        </div>
      </div>

      {/* Position Sliders (Constrained within room boundaries) */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Move className="h-3.5 w-3.5 text-teal-600" />
          <span>Vị trí không gian (Meters):</span>
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

