"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Save,
  RotateCcw,
  Sparkles,
  Camera,
  Upload,
  Box,
  Sliders,
  FileText,
  Printer,
  Download,
  Info,
  Layers,
  ShieldCheck,
  Zap,
  Eye,
  Check,
  X,
  Play,
  HelpCircle,
  BookOpen,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { RoomViewer } from "@/components/three/RoomViewer";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";
import { buildVerifiedPhotoDraft } from "@/lib/vision/photoSceneDraft";
import { CATEGORY_TAXONOMY } from "@/lib/vision/taxonomy";
import type { DetectionCategory, VisionClarificationQuestion, VisionDetection } from "@/lib/vision/types";
import {
  averageConfidence,
  bboxToPercentStyle,
  initialWorkflowDetections,
  patchWorkflowDetection,
  runWorkflowVision,
} from "@/lib/vision/workflowVision";
import { AssessmentStep } from "@/components/workflow/AssessmentStep";
import { SimulationStep } from "@/components/workflow/SimulationStep";
import { ReportStep, type CompareSlot } from "@/components/workflow/ReportStep";
import { createSnapshotClient, needsReload, type SnapshotLite } from "@/components/workflow/snapshotClient";
import { buildComparisonView } from "@/components/workflow/reportGuard";
import {
  EMPTY_CHECKLIST,
  buildActionPlan,
  buildAssessmentInput,
  buildPatches,
  buildStepUrl,
  buildVerifiedInput,
  lastPersistedStep,
  newWorkflowRoomId,
  parseStepParams,
  resolveRestoreStep,
  validateVerifiedForm,
  type Checklist,
  type MeasuredInput,
  type SimActionId,
  type Tri,
  type VerifiedForm,
} from "@/components/workflow/workflowLogic";
import { ACTIVE_ROOM_KEY, SNAPSHOT_SAVED_EVENT } from "@/components/layout/headerStatus";

// Workflow Steps
const WORKFLOW_STEPS = [
  { step: 1, id: "PROFILE", title: "1. Hồ sơ khảo sát", desc: "Thông tin gia đình & phòng" },
  { step: 2, id: "COLLECTION", title: "2. Thu thập dữ liệu", desc: "Kích thước & checklist nguy cơ" },
  { step: 3, id: "VISION", title: "3. Thị giác AI", desc: "Nhận diện & kiểm định không gian" },
  { step: 4, id: "DIGITAL_TWIN", title: "4. Bản sao số 3D", desc: "Dựng hình & tương tác vật thể" },
  { step: 5, id: "ASSESSMENT", title: "5. Đánh giá nguy cơ", desc: "8 Quy tắc an toàn & XAI" },
  { step: 6, id: "SIMULATION", title: "6. Mô phỏng cải thiện", desc: "Thử nghiệm can thiệp & What-if" },
  { step: 7, id: "REPORT", title: "7. Kế hoạch & Báo cáo", desc: "So sánh Trước/Sau & Xuất PDF" },
];

const snapshotApi = createSnapshotClient();
const latestOf = (snaps: SnapshotLite[], type: SnapshotLite["snapshotType"]) =>
  snaps.filter((x) => x.snapshotType === type).sort((x, y) => x.revision - y.revision).at(-1) ?? null;

const TRI_ITEMS: { key: keyof Checklist; q: string; only?: "BATHROOM" | "NOT_BATHROOM" }[] = [
  { key: "looseRug", q: "Có thảm trải sàn lỏng lẻo / chưa dán chống trượt trên lối đi?", only: "NOT_BATHROOM" },
  { key: "cablesOnWalkway", q: "Có dây điện, dây sạc chạy ngang lối đi?", only: "NOT_BATHROOM" },
  { key: "dimLighting", q: "Đường từ giường ra nhà vệ sinh ban đêm có quá tối?" },
  { key: "switchReachableFromBed", q: "Với tới công tắc đèn từ trên giường được không?", only: "NOT_BATHROOM" },
  { key: "essentialReachableFromBed", q: "Điện thoại, nước, kính để trong tầm với từ giường?", only: "NOT_BATHROOM" },
  { key: "thresholdStep", q: "Có gờ bậc cửa / chênh cốt sàn ở lối ra vào?" },
  { key: "wetFloor", q: "Sàn nhà vệ sinh hay bị ướt?", only: "BATHROOM" },
  { key: "missingGrabBar", q: "Đang THIẾU thanh tay vịn gần bồn cầu / buồng tắm?", only: "BATHROOM" },
];

export default function WorkflowPage() {
  const { rooms, currentRoomId, switchRoom, addSafetyDevice, fixObject, runSimulation, restoreBaseline, selectObject, focusOnLocation } =
    useSimulationStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotLite[]>([]);
  const [saveState, setSaveState] = useState<{ status: "idle" | "saving" | "saved" | "error"; message?: string }>({ status: "idle" });

  // Step 1: Profile State. Bắt đầu rỗng: không có hồ sơ cư dân/dự án mẫu.
  const [projectName, setProjectName] = useState("");
  const [residentProfile, setResidentProfile] = useState("");
  const [roomType, setRoomType] = useState<"BEDROOM" | "BATHROOM" | "LIVINGROOM">("BEDROOM");
  const mode: "DEMO" | "REAL" = "DEMO";

  const RESIDENT_QUICK_TAGS = [
    "Thoái hóa khớp gối độ 2",
    "Giảm thị lực ban đêm",
    "Dậy vệ sinh 2 lần/đêm",
    "Đi lại cần điểm tựa vững",
    "Tiền sử từng trượt chân ngã",
  ];

  const handleToggleTag = (tag: string) => {
    if (residentProfile.includes(tag)) {
      setResidentProfile((prev) => prev.replace(new RegExp(`,?\\s*${tag}\\.?`, "gi"), "").trim());
    } else {
      setResidentProfile((prev) => (prev ? `${prev.replace(/[\.\s]+$/, "")}, ${tag}.` : `${tag}.`));
    }
  };

  // Step 2: Collection State
  const [dimensions, setDimensions] = useState({ length: 4.5, width: 3.5, height: 2.8 });
  // Axes the user actually typed. Untouched axes show template defaults (simulated), not facts.
  const [touchedDims, setTouchedDims] = useState({ length: false, width: false, height: false });
  const editDimension = (axis: "length" | "width" | "height", value: number) => {
    setDimensions((prev) => ({ ...prev, [axis]: value }));
    setTouchedDims((prev) => ({ ...prev, [axis]: true }));
  };
  const [checklist, setChecklist] = useState<Checklist>(EMPTY_CHECKLIST);
  const [thresholdCm, setThresholdCm] = useState<MeasuredInput>({ value: null, source: "measured" });
  const [walkway, setWalkway] = useState<MeasuredInput>({ value: null, source: "measured" });
  const [nightLux, setNightLux] = useState<MeasuredInput>({ value: null, source: "measured" });
  // Step 3: Vision state. Starts empty: no detections, nothing confirmed, no stock photo.
  const [visionFile, setVisionFile] = useState<File | null>(null);
  const [visionImageUrl, setVisionImageUrl] = useState<string | null>(null);
  const [visionConsent, setVisionConsent] = useState(false);
  const [visionStatus, setVisionStatus] = useState<"idle" | "analyzing" | "done" | "no_consent" | "unknown">("idle");
  const [visionMessage, setVisionMessage] = useState<string | null>(null);
  const [visionDemo, setVisionDemo] = useState(false);
  const [visionDetections, setVisionDetections] = useState<VisionDetection[]>(initialWorkflowDetections());
  const [visionClarifications, setVisionClarifications] = useState<VisionClarificationQuestion[]>([]);
  const [editingDetection, setEditingDetection] = useState<{ id: string; label: string; category: DetectionCategory } | null>(null);

  const visionRoomId = `workflow-survey-live-01-${roomType.toLowerCase()}`;

  const handleVisionFile = (file: File | undefined) => {
    if (!file) return;
    if (visionImageUrl) URL.revokeObjectURL(visionImageUrl);
    setVisionFile(file);
    setVisionImageUrl(URL.createObjectURL(file));
    setVisionDetections(initialWorkflowDetections());
    setVisionClarifications([]);
    setVisionStatus("idle");
    setVisionMessage(null);
  };

  const handleRunVision = async () => {
    if (!visionFile) return;
    setVisionStatus("analyzing");
    setVisionMessage(null);
    const outcome = await runWorkflowVision({
      file: visionFile,
      roomId: visionRoomId,
      roomType,
      consent: visionConsent,
    });
    if (outcome.kind === "ok") {
      setVisionDetections(outcome.detections);
      setVisionClarifications(outcome.clarifications);
      setVisionDemo(outcome.demo);
      setVisionStatus("done");
    } else {
      setVisionDetections([]);
      setVisionClarifications([]);
      setVisionStatus(outcome.kind);
      setVisionMessage(outcome.message);
    }
  };

  const handleDetectionAction = async (
    det: VisionDetection,
    body: { verificationStatus: "CONFIRMED" | "REJECTED" | "CORRECTED"; userLabel?: string; category?: DetectionCategory }
  ) => {
    try {
      const saved = await patchWorkflowDetection(det.id, body);
      setVisionDetections((prev) => prev.map((d) => (d.id === det.id ? { ...d, ...saved } : d)));
      setEditingDetection(null);
      setVisionMessage(null);
    } catch (error) {
      setVisionMessage(error instanceof Error ? error.message : "Không lưu được thao tác xác nhận.");
    }
  };

  const handleAnswerClarification = async (q: VisionClarificationQuestion, value: string) => {
    try {
      const res = await fetch(`/api/vision/clarifications/${encodeURIComponent(q.id)}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: value }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Không lưu được câu trả lời.");
      setVisionClarifications((prev) =>
        prev.map((x) => (x.id === q.id ? { ...x, status: "ANSWERED", userResponse: value } : x))
      );
    } catch (error) {
      setVisionMessage(error instanceof Error ? error.message : "Không lưu được câu trả lời.");
    }
  };

  const visionAvgConfidence = averageConfidence(visionDetections);
  const confirmedCount = visionDetections.filter(
    (d) => d.verificationStatus === "CONFIRMED" || d.verificationStatus === "CORRECTED"
  ).length;

  // Step 5: Selected Finding & Explanation Modal
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);
  const [showRAGModal, setShowRAGModal] = useState(false);

  // Sync Room selection with Room Type & default dimensions
  const skipRoomSync = useRef(false);
  useEffect(() => {
    if (skipRoomSync.current) {
      skipRoomSync.current = false;
      return;
    }
    setTouchedDims({ length: false, width: false, height: false });
    if (roomType === "BATHROOM" && currentRoomId !== "room-bathroom-01") {
      switchRoom("room-bathroom-01");
      setDimensions({ length: 2.4, width: 1.8, height: 2.6 });
    } else if (roomType === "BEDROOM" && currentRoomId !== "room-bedroom-01") {
      switchRoom("room-bedroom-01");
      setDimensions({ length: 4.5, width: 3.5, height: 2.8 });
    } else if (roomType === "LIVINGROOM" && currentRoomId !== "room-living-01") {
      switchRoom("room-living-01");
      setDimensions({ length: 6.0, width: 5.4, height: 2.8 });
    }
  }, [roomType]);

  // Step 4 scene: built from the detections the user accepted/edited in step 3; template room otherwise.
  const acceptedDetections = visionDetections.filter(
    (d) => d.verificationStatus === "CONFIRMED" || d.verificationStatus === "CORRECTED"
  );
  const [sceneSource, setSceneSource] = useState<"photo" | "template">("template");
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [visionAspect, setVisionAspect] = useState<number | null>(null);
  useEffect(() => {
    if (!visionImageUrl) return setVisionAspect(null);
    const img = new window.Image();
    img.onload = () => img.naturalHeight > 0 && setVisionAspect(img.naturalWidth / img.naturalHeight);
    img.src = visionImageUrl;
  }, [visionImageUrl]);
  useEffect(() => {
    if (currentStep !== 4 || snapshots.some((x) => x.snapshotType === "BASELINE")) return;
    const store = useSimulationStore.getState();
    if (acceptedDetections.length === 0) {
      // Checklist path / step 3 skipped: show the template room, clearly labelled.
      setSceneSource("template");
      setSceneError(null);
      const templateId = roomType === "BATHROOM" ? "room-bathroom-01" : roomType === "LIVINGROOM" ? "room-living-01" : "room-bedroom-01";
      if (store.currentRoomId !== templateId) store.switchRoom(templateId);
      return;
    }
    try {
      const draft = buildVerifiedPhotoDraft(
        visionDetections,
        roomType === "LIVINGROOM" ? "LIVING_ROOM" : roomType,
        "ảnh bước 3",
        visionImageUrl ? [visionImageUrl] : undefined,
        {
          imageAspect: visionAspect ?? 4 / 3,
          manualDimensions: { width: dimensions.width, length: dimensions.length, height: dimensions.height },
          dimensionSources: {
            width: touchedDims.width ? "user_confirmed" : "simulated",
            length: touchedDims.length ? "user_confirmed" : "simulated",
            height: touchedDims.height ? "user_confirmed" : "simulated",
          },
        }
      );
      // id ổn định: dựng lại cùng phòng thì thay thế, không thêm phòng mới vào store (B07).
      store.loadReconstructedRoom({ ...draft, id: `photo-draft-workflow-${roomType.toLowerCase()}` });
      setSceneSource("photo");
      setSceneError(null);
    } catch (error) {
      setSceneError(error instanceof Error ? error.message : "Không dựng được cảnh từ ảnh.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, visionDetections, visionAspect, dimensions, touchedDims, roomType]);

  // Run initial simulation if not run yet
  useEffect(() => {
    runSimulation();
  }, [currentStep]);

  // ------------------------------------------------------------------
  // B09: nguồn sự thật = snapshot A11 trên máy chủ. Chỉ "Đã lưu" khi máy chủ xác nhận.
  // ------------------------------------------------------------------
  const baseline = latestOf(snapshots, "BASELINE");
  const proposed = latestOf(snapshots, "PROPOSED_SCENARIO");
  const verified = latestOf(snapshots, "VERIFIED_POST_INTERVENTION");
  const locked = baseline != null;
  const currentRoom = rooms.find((r) => r.id === currentRoomId) || rooms[0];
  const roomLabel = roomType === "BATHROOM" ? "Nhà vệ sinh" : roomType === "LIVINGROOM" ? "Phòng khách" : "Phòng ngủ";

  const [busy, setBusy] = useState(false);
  const [simChosen, setSimChosen] = useState<SimActionId[]>([]);
  const [simError, setSimError] = useState<string | null>(null);
  const [verifiedForm, setVerifiedForm] = useState<VerifiedForm>({
    who: "", when: "", done: [],
    walkway: { value: null, source: "measured" }, nightLux: { value: null, source: "measured" }, confirm: false,
  });
  const [verifiedError, setVerifiedError] = useState<string | null>(null);
  const [cmpProposed, setCmpProposed] = useState<CompareSlot>({ state: "none" });
  const [cmpVerified, setCmpVerified] = useState<CompareSlot>({ state: "none" });

  const savedSim = useMemo<SimActionId[]>(() => {
    const m = /\[([A-Z_,]*)\]/.exec(proposed?.notes ?? "");
    return m && m[1] ? (m[1].split(",") as SimActionId[]) : [];
  }, [proposed]);
  useEffect(() => setSimChosen(savedSim), [savedSim]);

  const announce = (room: string) => {
    try { localStorage.setItem(ACTIVE_ROOM_KEY, room); } catch { /* lưu trữ bị chặn: header sẽ hiện "Chưa đánh giá" */ }
    window.dispatchEvent(new Event(SNAPSHOT_SAVED_EVENT));
  };
  const setUrl = (step: number, room: string | null, push: boolean) => {
    const url = buildStepUrl({ step, room });
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  };
  const hasInput =
    projectName.trim() !== "" || residentProfile.trim() !== "" ||
    Object.values(touchedDims).some(Boolean) || Object.values(checklist).some((v) => v !== null) ||
    [thresholdCm, walkway, nightLux].some((m) => m.value != null);
  const simDirty = simChosen.slice().sort().join() !== savedSim.slice().sort().join();
  const dirty = (!locked && hasInput) || simDirty || saveState.status === "saving";

  // Cảnh báo rời trang khi còn dữ liệu chưa lưu (tải lại/đóng tab + bấm liên kết trong ứng dụng).
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.getAttribute("href")?.startsWith("#") || a.pathname === window.location.pathname) return;
      if (!window.confirm("Bạn có dữ liệu chưa lưu trên máy chủ. Rời trang sẽ mất dữ liệu này. Vẫn rời đi?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const draftNow = () => ({
    roomId: roomKey ?? "pending", roomType, roomName: roomLabel, dims: dimensions, touchedDims, checklist,
    thresholdCm, walkway, nightLux, sceneObjects: currentRoom.objects.map((o) => ({ id: o.id, category: o.category })),
  });

  const saveBaseline = async (): Promise<string | null> => {
    if (baseline) return baseline.roomId;
    const room = roomKey ?? newWorkflowRoomId(roomType);
    const now = new Date().toISOString();
    const { input, provenanceMap } = buildAssessmentInput({ ...draftNow(), roomId: room }, now);
    // Không lưu mô tả sức khỏe tự do của cư dân (tối thiểu hóa dữ liệu); chỉ lưu cấu hình để khôi phục.
    input.workflowMeta = {
      projectName, roomType, dims: dimensions, touchedDims, checklist, thresholdCm, walkway, nightLux,
      sceneRoom: { ...currentRoom, sourceImageUrls: undefined },
    };
    setSaveState({ status: "saving" });
    const r = await snapshotApi.create(
      { snapshotType: "BASELINE", roomId: room, roomInput: input, provenanceMap, expectedRevision: 0, notes: `Hiện trạng ${roomLabel}`, deterministicTimestamp: now },
      `baseline-${room}`
    );
    if (!r.ok) {
      if (needsReload(r)) {
        const l = await snapshotApi.list(room);
        if (l.ok) setSnapshots(l.data);
      }
      setSaveState({ status: "error", message: r.message });
      return null;
    }
    setRoomKey(room);
    setSnapshots([r.data]);
    announce(room);
    setSaveState({ status: "saved", message: `Hiện trạng đã lưu trên máy chủ (rev ${r.data.revision}).` });
    return room;
  };

  const goTo = async (n: number) => {
    if (busy || n < 1 || n > 7 || n === currentStep) return;
    setBusy(true);
    try {
      let room = baseline?.roomId ?? null;
      let target = n;
      if (n >= 5 && !baseline) {
        room = await saveBaseline();
        if (!room) return; // lỗi đã hiển thị; ở lại bước hiện tại, người dùng có thể thử lại
        target = 5;
      }
      setCurrentStep(target);
      setUrl(target, room ?? roomKey, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  };
  const handleNextStep = () => goTo(currentStep + 1);
  const handlePrevStep = () => goTo(currentStep - 1);

  const findSceneId = (cat: string) => currentRoom.objects.find((o) => o.category === cat)?.id;
  const applyVisual = (ids: SimActionId[]) => {
    for (const id of ids) {
      if (id === "SECURE_RUG") { const o = findSceneId("RUG"); if (o) fixObject(o); }
      if (id === "ROUTE_CABLE") { const o = findSceneId("CABLE"); if (o) fixObject(o); }
      if (id === "ADD_GRAB_BAR") addSafetyDevice("grab_bar_toilet");
      if (id === "ADD_NIGHT_LIGHT") addSafetyDevice("night_light");
    }
  };
  const toggleSim = (id: SimActionId) => {
    if (simChosen.includes(id)) {
      const rest = simChosen.filter((x) => x !== id);
      restoreBaseline();
      applyVisual(rest);
      setSimChosen(rest);
    } else {
      applyVisual([id]);
      setSimChosen([...simChosen, id]);
    }
  };
  const resetSim = () => { restoreBaseline(); setSimChosen([]); };

  const saveSim = async () => {
    if (!baseline || busy) return;
    setBusy(true);
    setSimError(null);
    const r = await snapshotApi.simulate({
      baselineSnapshotId: baseline.snapshotId,
      roomPatches: buildPatches(baseline.roomState, simChosen),
      expectedRevision: proposed?.revision ?? 0,
      notes: `Mô phỏng đề xuất [${simChosen.join(",")}]`,
    });
    if (!r.ok) {
      if (needsReload(r)) {
        const l = await snapshotApi.list(baseline.roomId);
        if (l.ok) setSnapshots(l.data);
      }
      setSimError(r.message);
    } else {
      setSnapshots((prev) => [...prev, r.data]);
      announce(baseline.roomId);
    }
    setBusy(false);
  };

  const submitVerified = async () => {
    if (!baseline || busy) return;
    const errs = validateVerifiedForm(verifiedForm);
    if (errs.length) return setVerifiedError(errs.join(" "));
    setBusy(true);
    setVerifiedError(null);
    const now = new Date().toISOString();
    const built = buildVerifiedInput(baseline.roomState, verifiedForm, now);
    const r = await snapshotApi.create({
      snapshotType: "VERIFIED_POST_INTERVENTION", roomId: baseline.roomId, roomInput: built.input, provenanceMap: built.provenanceMap,
      parentSnapshotId: baseline.snapshotId, expectedRevision: verified?.revision ?? 0, notes: built.notes, deterministicTimestamp: now,
    });
    if (!r.ok) {
      if (needsReload(r)) {
        const l = await snapshotApi.list(baseline.roomId);
        if (l.ok) setSnapshots(l.data);
      }
      setVerifiedError(r.message);
    } else {
      setSnapshots((prev) => [...prev, r.data]);
      announce(baseline.roomId);
    }
    setBusy(false);
  };

  // Bước 7: đối chiếu qua API compare; không tự tính diff ở client.
  useEffect(() => {
    if (currentStep !== 7 || !baseline) return;
    let cancelled = false;
    const run = async (after: SnapshotLite | null, set: (s: CompareSlot) => void) => {
      if (!after) return set({ state: "none" });
      set({ state: "loading" });
      const r = await snapshotApi.compare(baseline.snapshotId, after.snapshotId);
      if (cancelled) return;
      set(r.ok ? { state: "ok", view: buildComparisonView(r.data, after) } : { state: "error", message: r.message });
    };
    run(proposed, setCmpProposed);
    run(verified, setCmpVerified);
    return () => { cancelled = true; };
  }, [currentStep, baseline?.snapshotId, proposed?.snapshotId, verified?.snapshotId]);

  // Khôi phục sau khi tải lại: URL ?step=&room= -> danh sách snapshot đã lưu.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { step, room } = parseStepParams(window.location.search);
      const finish = (msg?: string) => { if (alive) { if (msg) setRestoreError(msg); setRestoring(false); } };
      if (!room) { if (step !== 1) setUrl(1, null, false); return finish(); }
      const r = await snapshotApi.list(room);
      if (!alive) return;
      if (!r.ok) { setUrl(1, null, false); return finish(r.message); }
      const base = latestOf(r.data, "BASELINE");
      if (!base) { setUrl(1, null, false); return finish("Chưa có dữ liệu đã lưu cho phòng này; bắt đầu lại từ bước 1."); }
      const meta = base.roomState.workflowMeta ?? {};
      if (meta.roomType && meta.roomType !== "BEDROOM") skipRoomSync.current = true;
      setProjectName(meta.projectName ?? "");
      if (meta.roomType) setRoomType(meta.roomType);
      if (meta.dims) setDimensions(meta.dims);
      if (meta.touchedDims) setTouchedDims(meta.touchedDims);
      if (meta.checklist) setChecklist({ ...EMPTY_CHECKLIST, ...meta.checklist });
      if (meta.thresholdCm) setThresholdCm(meta.thresholdCm);
      if (meta.walkway) setWalkway(meta.walkway);
      if (meta.nightLux) setNightLux(meta.nightLux);
      if (meta.sceneRoom) useSimulationStore.getState().loadReconstructedRoom(meta.sceneRoom);
      setSnapshots(r.data);
      setRoomKey(room);
      const target = resolveRestoreStep(step, r.data);
      setCurrentStep(target);
      setUrl(target, room, false);
      announce(room);
      setSaveState({ status: "saved", message: `Đã khôi phục từ dữ liệu đã lưu (${lastPersistedStep(r.data) >= 6 ? "có mô phỏng" : "hiện trạng"}).` });
      finish();
    })();
    const onPop = () => {
      const { step } = parseStepParams(window.location.search);
      setCurrentStep(step);
    };
    window.addEventListener("popstate", onPop);
    return () => { alive = false; window.removeEventListener("popstate", onPop); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sceneObjectIds = useMemo(() => new Set(currentRoom.objects.map((o) => o.id)), [currentRoom]);
  const selectFinding = (f: any) => {
    setSelectedFinding(f);
    if (f.targetObjectId && sceneObjectIds.has(f.targetObjectId)) {
      selectObject(f.targetObjectId);
      const obj = currentRoom.objects.find((o) => o.id === f.targetObjectId);
      if (obj) focusOnLocation(obj.position);
    } else {
      selectObject(null);
    }
  };
  const plan = useMemo(() => buildActionPlan(baseline?.canonicalAssessment.findings ?? []), [baseline]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Header Banner & Guided Stepper */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Top Title & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Hành trình Đánh giá An toàn Nhà ở</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold uppercase">
                    7 Bước Khép Kín
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  {projectName || "Chưa đặt tên dự án"} • Bước {currentStep}/7: {WORKFLOW_STEPS[currentStep - 1].title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {saveState.status === "saving" && (
                <span data-testid="save-status" className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">Đang lưu...</span>
              )}
              {saveState.status === "saved" && (
                <span data-testid="save-status" className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Đã lưu trên máy chủ
                </span>
              )}
              {saveState.status === "error" && (
                <span data-testid="save-status" role="alert" className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                  Chưa lưu được
                </span>
              )}
              {dirty && saveState.status !== "saving" && (
                <span data-testid="dirty-flag" className="text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">Có dữ liệu chưa lưu</span>
              )}

              <Link
                href="/ai-guided-survey"
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <Save className="h-3.5 w-3.5 text-teal-600" />
                <span>Mở khảo sát thực tế</span>
              </Link>

              <button
                onClick={handlePrevStep}
                disabled={currentStep === 1 || busy}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Quay lại</span>
              </button>

              <button
                onClick={handleNextStep}
                disabled={currentStep === 7 || busy}
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-40"
              >
                <span>{currentStep === 7 ? "Đã hoàn tất" : "Tiếp tục"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 7-Step Interactive Progress Bar */}
          <div className="pt-2 border-t border-slate-100">
            {/* Progress line */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-2">
              <span className="flex items-center gap-1.5 text-teal-700 font-bold">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                Tiến độ: Bước {currentStep}/7 — {WORKFLOW_STEPS[currentStep - 1].title.split(".")[1].trim()}
              </span>
              <span>{Math.round((currentStep / 7) * 100)}% Hoàn tất</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {WORKFLOW_STEPS.map((s) => {
                const isPast = currentStep > s.step;
                const isCurrent = currentStep === s.step;

                return (
                  <button
                    key={s.step}
                    onClick={() => goTo(s.step)}
                    className={`text-left p-2.5 rounded-xl transition-all border flex items-center gap-2.5 relative group ${
                      isCurrent
                        ? "bg-teal-50/90 border-teal-500 shadow-sm ring-2 ring-teal-500/20"
                        : isPast
                        ? "bg-emerald-50/50 border-emerald-200/90 hover:bg-emerald-50 text-slate-700"
                        : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    }`}
                  >
                    {/* Circle badge */}
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                        isCurrent
                          ? "bg-teal-600 text-white shadow-xs"
                          : isPast
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      }`}
                    >
                      {isPast ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : s.step}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[10px] uppercase font-bold tracking-wider ${
                          isCurrent
                            ? "text-teal-700 font-black"
                            : isPast
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        Bước {s.step}
                      </div>
                      <div
                        className={`text-xs font-bold truncate ${
                          isCurrent ? "text-slate-900" : isPast ? "text-slate-700" : "text-slate-500"
                        }`}
                      >
                        {s.title.split(".")[1].trim()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Step Content Container */}
      <p role="note" className="mx-auto max-w-7xl px-6 py-3 text-sm text-amber-900 bg-amber-50">Sau khi lưu hiện trạng ở bước 5, kết quả được lưu trên máy chủ theo từng tài khoản. Chỉ số bạn thấy do bộ quy tắc chuẩn tính từ câu trả lời/số đo bạn nhập; mục chưa trả lời được ghi là &quot;chưa biết&quot;, không được coi là an toàn.</p>
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {restoring && <div data-testid="restoring" className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">Đang tải dữ liệu đã lưu...</div>}
        {restoreError && (
          <div role="alert" data-testid="restore-error" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            {restoreError}
          </div>
        )}
        {saveState.status === "error" && (
          <div role="alert" data-testid="save-error" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 flex items-center justify-between gap-3">
            <span>{saveState.message}</span>
            <button onClick={() => goTo(Math.max(currentStep + 1, 5))} className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold">Thử lại</button>
          </div>
        )}
        {locked && currentStep <= 4 && (
          <div data-testid="locked-banner" className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
            Hiện trạng đã được lưu và bất biến, nên dữ liệu bước 1-4 chỉ xem lại. Muốn nhập lại số liệu mới, hãy chọn &quot;Đánh giá phòng mới&quot; ở bước 7. Ảnh và nhận diện của phiên trước không được giữ lại sau khi tải lại trang.
          </div>
        )}
        {/* ========================================================================= */}
        {/* STEP 1: TẠO HỒ SƠ KHẢO SÁT */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                <span>Bước 1: Khởi Tạo Hồ Sơ Khảo Sát Không Gian Sống</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Thiết lập thông tin dự án, đối tượng người cao tuổi và lựa chọn không gian phòng cần thẩm định an toàn.
              </p>
            </div>

            <fieldset disabled={locked} className="min-w-0 border-0 p-0 m-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Project & Resident Info (7 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên dự án / Căn hộ khảo sát:
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50"
                    placeholder="Ví dụ: Khảo sát căn hộ gia đình Bác Nam"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Hồ sơ thể trạng người cao tuổi (Target Resident):
                    </label>
                    <span className="text-[10px] text-slate-400">Nhấp thẻ bên dưới để chèn nhanh</span>
                  </div>
                  <textarea
                    rows={3}
                    value={residentProfile}
                    onChange={(e) => setResidentProfile(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 leading-relaxed"
                    placeholder="Mô tả tuổi tác, thị lực, khả năng giữ thăng bằng..."
                  />

                  {/* Quick Clickable Health Condition Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {RESIDENT_QUICK_TAGS.map((tag) => {
                      const isIncluded = residentProfile.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition flex items-center gap-1 ${
                            isIncluded
                              ? "bg-teal-100 text-teal-800 border border-teal-300 font-bold"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span>{isIncluded ? "✓" : "+"}</span>
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chế độ dữ liệu khảo sát:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => { window.location.href = "/ai-guided-survey"; }}
                      className={`p-3.5 rounded-xl border text-left transition ${
                        false
                          ? "bg-teal-50 border-teal-400 text-teal-950 font-bold ring-2 ring-teal-500/15"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Khảo sát Thực Tế</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Nhập số đo phòng &amp; tải ảnh chụp thật</div>
                    </button>
                    <button
                      type="button"
                      className={`p-3.5 rounded-xl border text-left transition ${
                        mode === "DEMO"
                          ? "bg-teal-50 border-teal-400 text-teal-950 font-bold ring-2 ring-teal-500/15"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Trải nghiệm thử</span>
                        {mode === "DEMO" && <span className="h-2 w-2 rounded-full bg-teal-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Chỉ để xem thử; dữ liệu bạn nhập vẫn được lưu</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Room Selection (3 Rooms) & Clinical Guidelines (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chọn không gian phòng khảo sát trọng tâm (3 loại phòng mẫu):
                  </label>
                  <div className="space-y-2.5">
                    {/* Room 1: Bedroom */}
                    <button
                      type="button"
                      onClick={() => setRoomType("BEDROOM")}
                      className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                        roomType === "BEDROOM"
                          ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg shrink-0">
                          🛏️
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Phòng Ngủ Người Cao Tuổi</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                              mẫu 4.5m × 3.5m
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Trọng tâm: Mép giường cao, thảm chân lỏng lẻo &amp; dây điện sạc sàn.
                          </div>
                        </div>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${roomType === "BEDROOM" ? "bg-teal-600 ring-4 ring-teal-100" : "bg-slate-300"}`} />
                    </button>

                    {/* Room 2: Bathroom */}
                    <button
                      type="button"
                      onClick={() => setRoomType("BATHROOM")}
                      className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                        roomType === "BATHROOM"
                          ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center text-lg shrink-0">
                          🚿
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Phòng Tắm &amp; Nhà Vệ Sinh</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                              mẫu 2.4m × 1.8m
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Trọng tâm: Sàn ướt trơn trượt, thiếu thanh vịn bồn cầu, gờ cửa cao.
                          </div>
                        </div>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${roomType === "BATHROOM" ? "bg-teal-600 ring-4 ring-teal-100" : "bg-slate-300"}`} />
                    </button>

                    {/* Room 3: Living Room */}
                    <button
                      type="button"
                      onClick={() => setRoomType("LIVINGROOM")}
                      className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                        roomType === "LIVINGROOM"
                          ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">
                          🛋️
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Phòng Khách Sinh Hoạt Chung</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                              mẫu 6.0m × 5.4m
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Trọng tâm: Lối đi chung, bàn trà góc nhọn, thảm sofa &amp; chướng ngại vật.
                          </div>
                        </div>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${roomType === "LIVINGROOM" ? "bg-teal-600 ring-4 ring-teal-100" : "bg-slate-300"}`} />
                    </button>
                  </div>
                </div>

                {/* Medical & Engineering Standard Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-50/60 to-sky-50/60 border border-teal-100 space-y-1.5 text-xs text-slate-600">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>Cơ sở y tế đối chiếu: CDC STEADI (2019) &amp; WHO (2021)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Công cụ này sàng lọc yếu tố môi trường dựa trên hướng dẫn tham chiếu; không chẩn đoán và không dự báo té ngã của từng người.
                  </p>
                </div>
              </div>
            </div>
            </fieldset>

            {/* Bottom Configuration Summary & Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Đã chọn:</span>
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs">
                  {roomType === "BEDROOM"
                    ? "Phòng Ngủ (kích thước mẫu 4.5m × 3.5m)"
                    : roomType === "BATHROOM"
                    ? "Nhà Vệ Sinh / Tắm (kích thước mẫu 2.4m × 1.8m)"
                    : "Phòng Khách (kích thước mẫu 6.0m × 5.4m)"}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs">
                  Kích thước phòng chuẩn là mẫu danh định, không phải số đo
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white font-bold text-xs shadow-md shadow-teal-600/25 flex items-center gap-2 transition active:scale-95"
                >
                  <span>Bắt đầu khảo sát (Sang bước 2)</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: THU THẬP DỮ LIỆU NHÀ Ở */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-teal-600" />
                <span>Bước 2: Thu Thập Kích Thước &amp; Checklist Nguy Cơ Môi Trường</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Khai báo thông số phòng và trả lời checklist nhanh để hệ thống xây dựng mô hình rủi ro.
              </p>
            </div>

            <fieldset disabled={locked} className="min-w-0 border-0 p-0 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Dimensions & Photo */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400">
                  1. Kích thước phòng (mét) — {touchedDims.length || touchedDims.width || touchedDims.height ? "trục bạn chưa nhập vẫn là mặc định mô phỏng" : "đang là mặc định mô phỏng, hãy nhập số đo"}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Chiều dài (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dimensions.length}
                      onChange={(e) => editDimension("length", parseFloat(e.target.value) || 4)}
                      className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Chiều rộng (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dimensions.width}
                      onChange={(e) => editDimension("width", parseFloat(e.target.value) || 3)}
                      className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Chiều cao (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dimensions.height}
                      onChange={(e) => editDimension("height", parseFloat(e.target.value) || 2.8)}
                      className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400 mb-2">
                    2. Hình ảnh không gian khảo sát
                  </h3>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center">
                    <Camera className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">Ảnh phòng được tải ở Bước 3 (Thị giác AI)</p>
                    <p className="text-[11px] text-slate-400">
                      Chỉ gửi cho AI khi bạn đồng ý. Có thể bỏ qua và dùng checklist bên phải.
                    </p>
                  </div>
                  {visionImageUrl && (
                    <div className="mt-3 flex items-center gap-3">
                      <img
                        src={visionImageUrl}
                        alt="Ảnh phòng đã chọn"
                        className="h-20 w-32 object-contain bg-slate-900 rounded-xl border border-slate-200 shadow-sm"
                      />
                      <span className="text-xs font-medium text-slate-500">Ảnh bạn đã chọn ở Bước 3</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Risk Checklist */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400">
                  3. Checklist (mặc định &quot;Chưa biết&quot;: chưa trả lời thì không được coi là an toàn)
                </h3>
                <div className="space-y-2.5">
                  {TRI_ITEMS.filter((it) => !it.only || (it.only === "BATHROOM" ? roomType === "BATHROOM" : roomType !== "BATHROOM")).map((it) => (
                    <div key={it.key} className="p-3 rounded-xl border border-slate-200" data-testid={`tri-${it.key}`}>
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">{it.q}</div>
                      <div className="flex gap-1.5" role="group" aria-label={it.q}>
                        {([[true, "Có"], [false, "Không"], [null, "Chưa biết"]] as [Tri, string][]).map(([v, label]) => (
                          <button
                            key={label}
                            type="button"
                            aria-pressed={checklist[it.key] === v}
                            onClick={() => setChecklist({ ...checklist, [it.key]: v })}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold border ${checklist[it.key] === v ? "bg-teal-600 text-white border-teal-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400 pt-2">4. Số đo (để trống = chưa đo)</h3>
                {([
                  ["Độ rộng lối đi thông thủy (m)", walkway, setWalkway, "0.01", "walkway"],
                  ["Độ rọi ban đêm trên lối đi (Lux)", nightLux, setNightLux, "1", "nightlux"],
                  ...(checklist.thresholdStep === true ? [["Chênh cao gờ cửa (cm)", thresholdCm, setThresholdCm, "0.1", "threshold"]] : []),
                ] as [string, MeasuredInput, (m: MeasuredInput) => void, string, string][]).map(([label, m, set, step, id]) => (
                  <div key={id} className="grid grid-cols-2 gap-2 items-end">
                    <label className="text-[11px] font-semibold text-slate-600">{label}
                      <input type="number" min={0} step={step} value={m.value ?? ""} data-testid={`in-${id}`}
                        onChange={(e) => set({ ...m, value: e.target.value === "" ? null : Number(e.target.value) })}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800" />
                    </label>
                    <select value={m.source} onChange={(e) => set({ ...m, source: e.target.value as MeasuredInput["source"] })} className="px-2 py-1.5 rounded-xl border border-slate-200 text-[11px]">
                      <option value="measured">Đã đo bằng dụng cụ</option>
                      <option value="user_confirmed">Tôi ước/xác nhận</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
            </fieldset>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2"
              >
                <span>Xác nhận dữ liệu (Sang Thị giác AI)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: THỊ GIÁC AI VÀ XÁC NHẬN KHÔNG GIAN */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Camera className="h-5 w-5 text-teal-600" />
                <span>Bước 3: Gợi ý AI từ ảnh &amp; xác nhận của bạn</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                AI chỉ đưa ra gợi ý vật thể (ước lượng từ ảnh). Mỗi gợi ý chỉ được tính khi bạn chấp nhận, sửa hoặc loại.
                Bạn có thể bỏ qua AI và dùng checklist ở Bước 2.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="relative rounded-2xl border border-slate-200 bg-slate-900 min-h-[240px] flex items-center justify-center p-2">
                  {visionImageUrl ? (
                    // Wrapper hugs the object-contain image so percent bboxes map onto the real picture.
                    <div className="relative inline-block max-w-full">
                      <img
                        src={visionImageUrl}
                        alt="Ảnh phòng cần phân tích"
                        className="block max-h-[420px] max-w-full w-auto h-auto object-contain"
                      />
                      {visionStatus === "done" &&
                        visionDetections
                          .filter((d) => d.verificationStatus !== "REJECTED")
                          .map((d) => {
                            const accepted = d.verificationStatus === "CONFIRMED" || d.verificationStatus === "CORRECTED";
                            return (
                              <div
                                key={d.id}
                                style={bboxToPercentStyle(d.bbox)}
                                className={`absolute border-2 pointer-events-none ${
                                  accepted ? "border-emerald-400 bg-emerald-400/10" : "border-amber-400 bg-amber-400/10 border-dashed"
                                }`}
                              >
                                <span className="absolute -top-4 left-0 bg-slate-800 text-white text-[9px] font-bold px-1 rounded whitespace-nowrap">
                                  {d.userLabel || d.originalLabel}
                                  {accepted ? "" : " (chờ xác nhận)"}
                                </span>
                              </div>
                            );
                          })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 text-center px-4">Chưa có ảnh. Chọn ảnh phòng của bạn bên dưới.</p>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Chọn ảnh phòng"
                  onChange={(e) => handleVisionFile(e.target.files?.[0])}
                  className="block w-full text-xs"
                />
                <label className="flex items-start gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={visionConsent}
                    onChange={(e) => setVisionConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Tôi đồng ý lưu ảnh và gửi ảnh tới nhà cung cấp AI bên thứ ba để nhận diện vật thể. Tránh ảnh có người
                    hoặc thông tin riêng tư.
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRunVision}
                    disabled={!visionFile || !visionConsent || visionStatus === "analyzing"}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs"
                  >
                    {visionStatus === "analyzing" ? "Đang phân tích..." : visionStatus === "unknown" ? "Thử lại" : "Phân tích ảnh bằng AI"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                  >
                    Bỏ qua AI, dùng checklist
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {visionMessage && (
                  <div role="alert" className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900">
                    {visionMessage}
                    {visionStatus !== "idle" && visionStatus !== "done" && (
                      <div className="mt-1 font-semibold">
                        Kết quả nhận diện: chưa xác định. Không có vật thể nào được suy đoán thay cho AI.
                      </div>
                    )}
                  </div>
                )}
                {visionDemo && (
                  <div role="status" className="p-3 rounded-xl border border-amber-400 bg-amber-100 text-xs font-bold text-amber-900">
                    DEMO: dữ liệu minh họa, không phải kết quả phân tích ảnh của bạn.
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Gợi ý AI ({visionDetections.length}) • đã xác nhận {confirmedCount}
                  </h3>
                  {visionAvgConfidence !== null && (
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Điểm tham khảo của mô hình, chưa hiệu chuẩn: TB {(visionAvgConfidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {visionStatus === "done" && visionDetections.length === 0 && (
                  <p className="text-xs text-slate-500">AI không đề xuất vật thể nào. Hãy dùng checklist ở Bước 2.</p>
                )}

                <div className="space-y-2">
                  {visionDetections.map((det) => {
                    const accepted = det.verificationStatus === "CONFIRMED" || det.verificationStatus === "CORRECTED";
                    const rejected = det.verificationStatus === "REJECTED";
                    const editing = editingDetection?.id === det.id;
                    return (
                      <div key={det.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-slate-800">{det.userLabel || det.originalLabel}</div>
                            <div className="text-[10px] text-slate-400">
                              Điểm tham khảo của mô hình, chưa hiệu chuẩn: {(det.confidence * 100).toFixed(0)}% •{" "}
                              {accepted ? "đã xác nhận" : rejected ? "đã loại" : "chờ xác nhận"}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDetectionAction(det, { verificationStatus: "CONFIRMED" })}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" /> Chấp nhận
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingDetection({ id: det.id, label: det.userLabel || det.originalLabel, category: det.category })
                              }
                              className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold"
                            >
                              Sửa nhãn
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDetectionAction(det, { verificationStatus: "REJECTED" })}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1"
                            >
                              <X className="h-3 w-3" /> Loại
                            </button>
                          </div>
                        </div>
                        {editing && editingDetection && (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              aria-label="Loại vật thể"
                              value={editingDetection.category}
                              onChange={(e) =>
                                setEditingDetection({
                                  ...editingDetection,
                                  category: e.target.value as DetectionCategory,
                                  label: CATEGORY_TAXONOMY[e.target.value as DetectionCategory].vietnameseName,
                                })
                              }
                              className="text-xs rounded border border-slate-300 px-1 py-1"
                            >
                              {Object.values(CATEGORY_TAXONOMY).map((c) => (
                                <option key={c.category} value={c.category}>
                                  {c.vietnameseName}
                                </option>
                              ))}
                            </select>
                            <input
                              aria-label="Nhãn"
                              value={editingDetection.label}
                              maxLength={200}
                              onChange={(e) => setEditingDetection({ ...editingDetection, label: e.target.value })}
                              className="text-xs rounded border border-slate-300 px-2 py-1 flex-1 min-w-[120px]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleDetectionAction(det, {
                                  verificationStatus: "CORRECTED",
                                  userLabel: editingDetection.label,
                                  category: editingDetection.category,
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-teal-600 text-white text-[10px] font-bold"
                            >
                              Lưu
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {visionClarifications.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-teal-600" />
                      <span>Câu hỏi làm rõ (AI không tự trả lời thay bạn):</span>
                    </div>
                    {visionClarifications.map((q) => (
                      <div key={q.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                        <p className="font-semibold text-amber-900">{q.questionText}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              aria-pressed={q.userResponse === opt.value}
                              onClick={() => handleAnswerClarification(q, opt.value)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                                q.userResponse === opt.value
                                  ? "bg-teal-600 text-white border-teal-700"
                                  : "bg-white text-slate-700 border-slate-200"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2"
              >
                <span>Dựng mô hình phòng (mô phỏng gần đúng)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: DIGITAL TWIN 3D */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Box className="h-5 w-5 text-teal-600" />
                  <span>Bước 4: Mô hình phòng (mô phỏng gần đúng)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Không gian 3D được tự động dựng từ số đo và đồ vật đã xác nhận. Bạn có thể tương tác, xoay góc và thêm thiết bị an toàn.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => addSafetyDevice("grab_bar_toilet")}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center gap-1"
                >
                  <span>+ Thêm tay vịn Inox</span>
                </button>
                <button
                  onClick={() => addSafetyDevice("anti_slip_mat")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1"
                >
                  <span>+ Thêm thảm chống trượt</span>
                </button>
                <button
                  onClick={restoreBaseline}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                  title="Khôi phục trạng thái ban đầu"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              data-testid="scene-source-banner"
              className={`rounded-xl border px-3 py-2 text-xs ${
                sceneSource === "photo" ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              {sceneSource === "photo" ? (
                <>
                  <strong>Dựng từ {acceptedDetections.length} vật thể bạn đã chấp nhận/sửa ở bước 3.</strong> Vị trí và kích thước là{" "}
                  <em>ước lượng từ ảnh</em>, không phải số đo; kích thước phòng
                  {touchedDims.length || touchedDims.width || touchedDims.height ? " lấy từ số bạn nhập (các trục chưa nhập vẫn là mặc định mô phỏng)" : " là mặc định mô phỏng (bạn chưa nhập)"}.
                  Vật thể bị loại không xuất hiện.
                </>
              ) : (
                <>
                  <strong>Phòng mẫu (template, mô phỏng).</strong> Chưa có vật thể nào từ ảnh được chấp nhận ở bước 3 (hoặc bạn dùng checklist), nên đây
                  là bố cục mẫu, không phản ánh phòng thật.
                </>
              )}
              {sceneError && <div className="mt-1 text-rose-700">{sceneError}</div>}
            </div>

            {/* Embedded 3D Canvas with Non-Overlapping Clustered Markers */}
            <div className="h-[480px] w-full rounded-2xl overflow-hidden shadow-inner border border-slate-800">
              <RoomViewer />
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2"
              >
                <span>Chạy Đánh Giá Nguy Cơ AI (Sang bước 5)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Bước 5-7: dữ liệu đến từ snapshot đã lưu (A11), không từ store mẫu */}
        {currentStep >= 5 && !baseline && !restoring && (
          <div data-testid="no-baseline" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Chưa có hiện trạng nào được lưu cho phòng này nên chưa thể đánh giá. <button className="underline font-bold" onClick={() => { setCurrentStep(4); setUrl(4, null, false); }}>Quay lại bước 4</button> rồi bấm &quot;Tiếp tục&quot; để lưu.
          </div>
        )}
        {currentStep === 5 && baseline && (
          <AssessmentStep
            baseline={baseline}
            sceneObjectIds={sceneObjectIds}
            selectedId={selectedFinding?.id ?? null}
            onSelect={selectFinding}
            onRag={(f) => { setSelectedFinding(f); setShowRAGModal(true); }}
            onPrev={handlePrevStep}
            onNext={handleNextStep}
          />
        )}
        {currentStep === 6 && baseline && (
          <SimulationStep
            baseline={baseline}
            proposed={proposed}
            chosen={simChosen}
            savedChosen={savedSim}
            saving={busy}
            error={simError}
            onToggle={toggleSim}
            onReset={resetSim}
            onSave={saveSim}
            onPrev={handlePrevStep}
            onNext={handleNextStep}
          />
        )}
        {currentStep === 7 && baseline && (
          <ReportStep
            projectName={projectName}
            roomName={roomLabel}
            baseline={baseline}
            proposed={proposed}
            verified={verified}
            cmpProposed={cmpProposed}
            cmpVerified={cmpVerified}
            plan={plan}
            onPickPlan={(p) => p.targetObjectId && selectFinding({ id: p.findingId, targetObjectId: p.targetObjectId })}
            form={verifiedForm}
            setForm={setVerifiedForm}
            submitting={busy}
            formError={verifiedError}
            onSubmitVerified={submitVerified}
            onPrev={handlePrevStep}
            onRestart={() => {
              if (verifiedForm.who || simDirty) {
                if (!window.confirm("Dữ liệu chưa lưu sẽ mất. Bắt đầu đánh giá phòng mới?")) return;
              }
              window.location.assign("/workflow");
            }}
          />
        )}
      </div>

      {/* RAG Medical Explanation Modal */}
      {showRAGModal && selectedFinding && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <BookOpen className="h-5 w-5" />
                <h3 className="font-bold text-sm text-slate-900">Giải thích Y khoa &amp; Bằng chứng RAG</h3>
              </div>
              <button
                onClick={() => setShowRAGModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700">Mối nguy: </span>
                <span className="text-slate-900 font-semibold">{selectedFinding.title}</span>
                <p className="text-[11px] text-slate-600 mt-1">{selectedFinding.description}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>Vì sao ghi nhận mục này</span>
                </div>
                <ul className="text-indigo-900 leading-relaxed text-[11px] list-disc pl-4">
                  {(selectedFinding.recommendation?.steps ?? []).map((st: string, k: number) => <li key={k}>{st}</li>)}
                </ul>
                <div className="text-[10px] text-indigo-700 font-mono pt-1 border-t border-indigo-200/60">
                  Mã nguồn tham chiếu: {(selectedFinding.recommendation?.referenceIds ?? []).join(", ") || "chưa có"}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowRAGModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
