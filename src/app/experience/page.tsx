"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Box, Layers, Eye, Footprints, ShieldAlert, Columns2, Play, Pause, RotateCcw, Undo2, Redo2, Save, SlidersHorizontal, X, Menu, Sun, ChevronLeft, ChevronRight, Check, Focus, Maximize2 } from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { ChapterOverlay } from "@/components/experience/ChapterOverlay";
import { CHAPTERS_DATA } from "@/components/experience/experienceData";
import { RoomState, HazardFindingResult } from "@/types";
import { cloneRoom, compareRooms, findingKey, findingPosition, geometryLabel, INTERVENTIONS, Intervention, applyIntervention, objectProvenance, serializeExperience, ViewMode, VisualLighting } from "@/lib/experience/homeExperience";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";
import { ChatRoomStateSchema } from "@/lib/ai/chatRequest";
import "./experience.css";

const CinematicScene = dynamic(() => import("@/components/experience/CinematicScene").then((module) => module.CinematicScene), { ssr: false });
const VIEWS: { id: ViewMode; label: string; icon: typeof Box }[] = [
  { id: "DOLLHOUSE", label: "Dollhouse", icon: Box }, { id: "TOP", label: "Mặt bằng", icon: Layers },
  { id: "INTERIOR", label: "Nội thất", icon: Eye }, { id: "WALKTHROUGH", label: "Đi bộ", icon: Footprints },
  { id: "RISK", label: "Nguy cơ", icon: ShieldAlert }, { id: "COMPARE", label: "So sánh", icon: Columns2 },
];

function ExperienceChrome({ children, zen }: { children: React.ReactNode; zen: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(<div className={"experience-fixed-ui" + (zen ? " is-zen" : "")}>{children}</div>, document.body) : null;
}

export default function ExperiencePage() {
  const store = useSimulationStore();
  const liveRoom = store.getCurrentRoom();
  const [room, setRoom] = useState<RoomState>(() => cloneRoom(liveRoom));
  const [baseline, setBaseline] = useState<RoomState>(() => cloneRoom(liveRoom));
  const [past, setPast] = useState<RoomState[]>([]);
  const [future, setFuture] = useState<RoomState[]>([]);
  const [chapter, setChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [manualMode, setManualMode] = useState<ViewMode | null>(null);
  const [lighting, setLighting] = useState<VisualLighting>("MORNING");
  const [quality, setQuality] = useState<"LOW" | "HIGH">("HIGH");
  const [walls, setWalls] = useState(false);
  const [paths, setPaths] = useState(false);
  const [inspector, setInspector] = useState(true);
  const [zen, setZen] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedFindingKey, setSelectedFindingKey] = useState<string | null>(null);
  const [focus, setFocus] = useState<[number, number, number] | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [split, setSplit] = useState(50);
  const [notice, setNotice] = useState("");
  const [intro, setIntro] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [stats, setStats] = useState<{ fps: number; calls: number; triangles: number } | null>(null);
  const [performanceVisible, setPerformanceVisible] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const comparison = useMemo(() => compareRooms(baseline, room), [baseline, room]);
  const findings = comparison.after.findings;
  const selectedFinding = findings.find((finding) => findingKey(finding) === selectedFindingKey) || (chapter === 3 ? findings[0] : undefined);
  const selectedObject = room.objects.find((object) => object.id === selectedObjectId) || room.objects.find((object) => object.id === selectedFinding?.targetObjectId);
  const mode: ViewMode = manualMode || (chapter === 5 ? "COMPARE" : chapter === 2 || chapter === 3 ? "RISK" : "DOLLHOUSE");
  const followStory = !manualMode;
  const showInspector = inspector && !zen && (chapter >= 2 || selectedObject);
  const metrics = useCallback((value: { fps: number; calls: number; triangles: number }) => setStats(value), []);

  useEffect(() => {
    setRoom(cloneRoom(liveRoom)); setBaseline(cloneRoom(liveRoom)); setPast([]); setFuture([]);
    setSelectedObjectId(null); setSelectedFindingKey(null); setFocus(null); setManualMode(null);
    setResetKey((value) => value + 1);
  }, [liveRoom.id]);
  useEffect(() => { if (window.matchMedia("(max-width: 760px)").matches) { setQuality("LOW"); setInspector(false); } }, []);
  useEffect(() => { if (reducedMotion) { setPlaying(false); setIntro(false); } }, [reducedMotion]);
  useEffect(() => { if (!sceneReady) return; const timer = setTimeout(() => setIntro(false), 1800); return () => clearTimeout(timer); }, [sceneReady]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 5000); return () => clearTimeout(timer); }, [notice]);

  const go = useCallback((index: number) => {
    const element = scroll.current;
    const section = element?.querySelector<HTMLElement>('[data-chapter="' + (Math.max(0, Math.min(5, index)) + 1) + '"]');
    if (element && section) element.scrollTo({ top: section.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop, behavior: reducedMotion ? "auto" : "smooth" });
  }, [reducedMotion]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest("button,input,select,textarea,a,[contenteditable=true]") || mode === "WALKTHROUGH") return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); go(chapter + 1); }
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); go(chapter - 1); }
      else if (event.key === "Home") { event.preventDefault(); go(0); }
      else if (event.key === "End") { event.preventDefault(); go(5); }
      else if (event.key === " ") { event.preventDefault(); if (reducedMotion) go(chapter + 1); else setPlaying((value) => !value); }
      else if (event.key === "Escape") { setZen(false); setManualMode(null); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [chapter, go, mode, reducedMotion]);
  useEffect(() => {
    if (!playing || reducedMotion) return;
    let previous = 0, frame = 0;
    const tick = (time: number) => {
      const element = scroll.current;
      if (!element) return;
      if (previous) element.scrollTop += Math.min(time - previous, 80) * element.clientHeight / 8000;
      previous = time;
      if (element.scrollTop >= element.scrollHeight - element.clientHeight - 2) { setPlaying(false); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reducedMotion]);

  const selectFinding = (finding: HazardFindingResult) => {
    setSelectedFindingKey(findingKey(finding)); setSelectedObjectId(finding.targetObjectId || null);
    setFocus(findingPosition(finding, room)); setManualMode("RISK"); setInspector(true); setPlaying(false);
  };
  const selectObject = (id: string) => {
    const object = room.objects.find((value) => value.id === id);
    if (!object) return;
    setSelectedObjectId(id); setFocus(object.position); setManualMode("INTERIOR"); setInspector(true); setPlaying(false);
    setSelectedFindingKey(findings.find((finding) => finding.targetObjectId === id) ? findingKey(findings.find((finding) => finding.targetObjectId === id)!) : null);
  };
  const selectZone = (id: string) => {
    const zone = room.zones?.find((value) => value.id === id);
    if (!zone) return;
    setFocus([(zone.bounds.minX + zone.bounds.maxX) / 2, 0.4, (zone.bounds.minZ + zone.bounds.maxZ) / 2]);
    setManualMode("INTERIOR"); setSelectedObjectId(null); setInspector(true); setPlaying(false);
    setNotice(zone.name + " · " + (zone.bounds.maxX - zone.bounds.minX).toFixed(1) + " × " + (zone.bounds.maxZ - zone.bounds.minZ).toFixed(1) + " m");
  };
  const apply = (intervention: Intervention) => {
    const next = applyIntervention(room, intervention);
    if (JSON.stringify(next) === JSON.stringify(room)) { setNotice("Không có đối tượng phù hợp cần thay đổi trong kịch bản này."); return; }
    setPast((values) => [...values, cloneRoom(room)].slice(-20)); setFuture([]); setRoom(next);
    setNotice("Đã cập nhật kịch bản. Đánh giá được tính lại từ dữ liệu mới.");
  };
  const undo = () => { if (!past.length) return; setFuture((values) => [...values, cloneRoom(room)]); setRoom(past[past.length - 1]); setPast((values) => values.slice(0, -1)); };
  const redo = () => { if (!future.length) return; setPast((values) => [...values, cloneRoom(room)]); setRoom(future[future.length - 1]); setFuture((values) => values.slice(0, -1)); };
  const save = () => {
    try { localStorage.setItem("safehome:experience:" + room.id, serializeExperience(room, baseline)); setNotice("Đã lưu kịch bản trên thiết bị này."); }
    catch { setNotice("Trình duyệt chưa thể lưu kịch bản. Hãy kiểm tra dung lượng lưu trữ."); }
  };
  const reload = () => {
    try {
      const raw = localStorage.getItem("safehome:experience:" + room.id);
      if (!raw || raw.length > 2000000) throw new Error();
      const value = JSON.parse(raw);
      if (value.version !== 1 || value.room.id !== room.id || value.baseline.id !== room.id
        || !ChatRoomStateSchema.safeParse(value.room).success || !ChatRoomStateSchema.safeParse(value.baseline).success) throw new Error();
      setRoom(value.room); setBaseline(value.baseline); setPast([]); setFuture([]); setNotice("Đã khôi phục kịch bản đã lưu trên thiết bị.");
    } catch { setNotice("Không có kịch bản hợp lệ đã lưu cho phòng này."); }
  };
  const applyToWorkspace = () => {
    store.applyRoomSnapshot(room); store.saveCurrentScenario("Kịch bản từ SafeHome Experience");
    setNotice("Đã áp dụng vào Digital Twin. Bạn có thể hoàn tác trong bộ mô phỏng.");
  };
  const enterMode = (value: ViewMode) => { setManualMode(value); setFocus(null); setPlaying(false); setResetKey((index) => index + 1); };
  const refs = selectedFinding?.referenceIds || [];
  const sourceRefs = CURATED_KNOWLEDGE_SOURCES.filter((source) => refs.includes(source.id));
  const provenance = selectedObject ? objectProvenance(selectedObject) : null;

  return <div className={"experience-shell" + (zen ? " is-zen" : "")} ref={scroll} tabIndex={0} aria-label="Hành trình khám phá nhà an toàn"
    onWheel={() => setPlaying(false)} onTouchStart={() => setPlaying(false)}
    onScroll={() => {
      const element = scroll.current; if (!element) return;
      const sections = Array.from(element.querySelectorAll<HTMLElement>("[data-chapter]"));
      const origin = element.getBoundingClientRect().top;
      const offsets = sections.map((section) => section.getBoundingClientRect().top - origin + element.scrollTop);
      let nextChapter = 0;
      offsets.forEach((offset, index) => { if (offset <= element.scrollTop + 35) nextChapter = index; });
      setChapter(nextChapter);
      setProgress(Math.max(0, Math.min(1, (element.scrollTop - offsets[nextChapter]) / ((offsets[nextChapter + 1] ?? element.scrollHeight) - offsets[nextChapter]))));
    }}>
    <div className="experience-stage">
      <ExperienceChrome zen={zen}><header className="experience-header">
        <Link className="experience-brand" href="/digital-twin"><span><Box size={23} strokeWidth={1.4} /></span><strong>SAFEHOME<span>3D AI</span></strong></Link>
        <span className="experience-header-caption">EXPERIENCE YOUR HOME SAFETY</span>
        <div className="experience-header-actions">
          <select aria-label="Chọn không gian" value={liveRoom.id} onChange={(event) => store.switchRoom(event.target.value)}>
            {store.rooms.map((value) => <option key={value.id} value={value.id}>{value.name.split("(")[0].trim()}</option>)}
          </select>
          <Link className="experience-back" href="/digital-twin">Về không gian làm việc</Link>
          <button aria-label={zen ? "Hiện các bảng điều khiển" : "Ẩn các bảng điều khiển"} onClick={() => setZen((value) => !value)}><Maximize2 size={18} /></button>
        </div>
      </header></ExperienceChrome>
      <div className="experience-scene-region">
        <CinematicScene room={room} baseline={baseline} mode={mode} chapter={chapter} chapterProgress={progress} followStory={followStory}
          lighting={lighting} quality={quality} reducedMotion={reducedMotion} showWalls={walls} showPaths={paths}
          selectedObjectId={selectedObjectId} selectedFindingKey={selectedFindingKey} focus={focus} resetKey={resetKey} comparison={split}
          onSelectObject={selectObject} onSelectFinding={selectFinding} onSelectZone={selectZone} onStats={metrics} onReady={() => setSceneReady(true)} intro={intro} />
        {mode === "COMPARE" && <div className="experience-comparison" aria-label="So sánh trước và sau">
          <span className="compare-before">Trước · {comparison.before.score}/100</span><span className="compare-after">Sau · {comparison.after.score}/100</span>
          <div className="comparison-line" style={{ left: split + "%" }}><span>↔</span></div>
          <input aria-label="Vị trí thanh so sánh trước sau" type="range" min="5" max="95" value={split} onChange={(event) => setSplit(Number(event.target.value))} />
        </div>}
      </div>
      <ExperienceChrome zen={zen}>
      {!zen && <div className="experience-scene-toolbar">
        <button className={walls ? "is-on" : ""} onClick={() => setWalls((value) => !value)} aria-pressed={walls}><Layers size={15} />Tường</button>
        <button className={paths ? "is-on" : ""} onClick={() => setPaths((value) => !value)} aria-pressed={paths}><Footprints size={15} />Lối đi</button>
        <label><Sun size={15} /><select aria-label="Ánh sáng mô phỏng" value={lighting} onChange={(event) => setLighting(event.target.value as VisualLighting)}>
          <option value="MORNING">Sáng sớm</option><option value="DAYLIGHT">Ban ngày</option><option value="EVENING">Chiều ấm</option><option value="NIGHT">Ban đêm</option><option value="STUDIO">Studio</option>
        </select></label>
        <select aria-label="Chất lượng đồ họa" value={quality} onChange={(event) => setQuality(event.target.value as "LOW" | "HIGH")}><option value="HIGH">Chi tiết cao</option><option value="LOW">Tiết kiệm</option></select>
        <button onClick={() => { setFocus(null); setManualMode("DOLLHOUSE"); setResetKey((value) => value + 1); }} aria-label="Đưa toàn cảnh vào khung nhìn"><Focus size={17} /></button>
      </div>}
      {!zen && <div className="experience-scene-meta"><span>MÉT · Y HƯỚNG LÊN</span><span>Ánh sáng hiển thị là mô phỏng</span></div>}
      {showInspector && <aside className="experience-inspector" aria-label="Chi tiết phòng và nguy cơ">
        <div className="inspector-heading"><span>{selectedObject ? "Chi tiết vật dụng" : "Đánh giá không gian"}</span><button aria-label="Đóng bảng chi tiết" onClick={() => setInspector(false)}><X size={17} /></button></div>
        <h3>{selectedObject?.name || room.name.split("(")[0]}</h3>
        <div className="inspector-score"><strong data-testid="safety-score">{comparison.after.score}<small>/100</small></strong><span>Chỉ số mô phỏng<br />{findings.length} nguy cơ hiện tại</span></div>
        {selectedObject && <p className="inspector-dimensions">{selectedObject.dimensions.width.toFixed(2)} × {selectedObject.dimensions.length.toFixed(2)} × {selectedObject.dimensions.height.toFixed(2)} m</p>}
        {selectedFinding ? <div className="inspector-evidence">
          <span className={"severity-tag " + selectedFinding.severityCategory.toLowerCase()}>{selectedFinding.severityCategory === "HIGH" ? "Cao" : selectedFinding.severityCategory === "MEDIUM" ? "Trung bình" : "Thấp"} · {selectedObject?.verified === false ? "Cần xác nhận quan sát" : "Phát hiện theo quy tắc"}</span>
          <h4>{selectedFinding.title}</h4><p>{selectedFinding.description}</p>
          <details open={chapter === 3}><summary>Quan sát & căn cứ</summary>
            <p>{selectedFinding.evidence.rationale}</p>
            {selectedFinding.evidence.measuredValue !== undefined && <p>Đầu vào: {String(selectedFinding.evidence.measuredValue)} · Ngưỡng quy tắc: {String(selectedFinding.evidence.threshold ?? "không có")}</p>}
            <code>{selectedFinding.detectionRuleId}</code>
            <p>{geometryLabel(room)}</p>
            {provenance?.sourceImageId && <p>Ảnh: {provenance.sourceImageId}</p>}
            <p>{provenance?.measurementStatus === "estimated" ? "Kích thước ước lượng; cần đo và xác nhận." : "Kích thước từ dữ liệu phòng; cần đối chiếu thực tế."}</p>
            {sourceRefs.map((source) => <a key={source.id} href={source.officialUrl} target="_blank" rel="noreferrer">{source.publisher}</a>)}
          </details>
          <div className="inspector-recommendation"><strong>Gợi ý tiếp theo</strong><p>{selectedFinding.recommendationText}</p></div>
        </div> : <p className="inspector-help">Chọn đồ vật hoặc ghim để xem kích thước, dữ liệu quan sát và quy tắc liên quan.</p>}
        <div className="inspector-findings">{findings.map((finding, index) => <button key={findingKey(finding)} onClick={() => selectFinding(finding)} aria-pressed={selectedFindingKey === findingKey(finding)}><span>H{index + 1}</span>{finding.title}</button>)}</div>
        {past.length > 0 && <button className="experience-primary" onClick={applyToWorkspace}>Áp dụng vào Digital Twin</button>}
        <Link href="/ai-assistant" className="experience-text-link">Hỏi trợ lý AI về cách khắc phục</Link>
      </aside>}
      {!showInspector && !zen && chapter >= 2 && <button className="experience-open-inspector" onClick={() => setInspector(true)}><SlidersHorizontal size={17} />Chi tiết đánh giá</button>}
      {!zen && <nav className="experience-viewbar" aria-label="Góc nhìn mô hình">
        {VIEWS.map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={mode === id} onClick={() => enterMode(id)}><Icon size={17} /><span>{label}</span></button>)}
      </nav>}
      <footer className="experience-footer">
        <div className="experience-chapter-nav"><button disabled={reducedMotion} title={reducedMotion ? "Chế độ giảm chuyển động: dùng nút chương hoặc phím mũi tên" : "Phát hoặc tạm dừng hành trình"} aria-label={playing ? "Tạm dừng hành trình" : "Phát hành trình"} onClick={() => { setManualMode(null); setPlaying((value) => !value); }}>{playing ? <Pause size={17} /> : <Play size={17} />}</button>
          {CHAPTERS_DATA.map((value, index) => <button key={value.key} aria-label={"Đến chương " + (index + 1) + ": " + value.label} aria-current={chapter === index ? "step" : undefined} onClick={() => { setPlaying(false); setManualMode(null); go(index); }}><span /></button>)}
          <span>{String(chapter + 1).padStart(2, "0")} / 06</span>
        </div>
        <span className="experience-footer-guide">{mode === "WALKTHROUGH" ? "W A S D để đi · kéo để nhìn" : "Cuộn để khám phá · phím mũi tên để chuyển chương"}</span>
        <button className="experience-performance-toggle" onClick={() => setPerformanceVisible((value) => !value)}>{performanceVisible && stats ? stats.fps + " FPS · " + stats.calls + " lượt vẽ" : "Hiệu năng"}</button>
      </footer>
      {notice && <div className="experience-toast" role="status"><Check size={16} />{notice}</div>}
      {manualMode && <button className="experience-resume" onClick={() => { setManualMode(null); setFocus(null); }}>Tiếp tục theo hành trình</button>}
      {intro && !reducedMotion && <button className="experience-skip" onClick={() => { setIntro(false); setResetKey((value) => value + 1); }}>Bỏ qua mở đầu</button>}
      </ExperienceChrome>
    </div>
    <div className="experience-story">
      {CHAPTERS_DATA.map((value, index) => <section key={value.key} className="experience-chapter" aria-label={value.label} data-chapter={index + 1}>
        {!zen && <ChapterOverlay chapter={value} active={index === chapter} reducedMotion={reducedMotion}>
          {index === 0 && <>
            <div className="experience-hero-actions"><button className="experience-primary" onClick={() => go(1)}>Khám phá ngôi nhà</button><button className="experience-secondary" onClick={() => go(2)}>Xem nguy cơ</button></div>
            <Link className="experience-text-link" href="/workflow">Bắt đầu đánh giá</Link>
            <div className="experience-facts"><div><strong>{(room.dimensions.width * room.dimensions.length).toFixed(1)}<small> m²</small></strong><span>Không gian mô phỏng</span></div><div><strong>{room.zones?.length || 1}<small> khu vực</small></strong><span>Kết nối trong một mô hình</span></div></div>
            <p className="experience-provenance">{geometryLabel(room)}</p>
          </>}
          {index === 1 && <div className="experience-zone-list">{room.zones?.length ? room.zones.map((zone) => <button key={zone.id} onClick={() => selectZone(zone.id)}><Box size={17} />{zone.name.split("(")[0]}</button>) : room.objects.slice(0, 6).map((object) => <button key={object.id} onClick={() => selectObject(object.id)}>{object.name}</button>)}</div>}
          {index === 2 && <><div className="experience-risk-summary"><strong>{findings.length}</strong><span>phát hiện từ dữ liệu phòng<br /><small>Không suy đoán chỉ từ loại đồ vật</small></span></div>{!findings.length && <button className="experience-secondary" style={{ marginTop: 20 }} onClick={() => store.switchRoom("room-bedroom-01")}>Xem phòng ngủ mẫu cần cải thiện</button>}</>}
          {index === 3 && <div className="experience-explanation">{selectedFinding ? <><span className="severity-tag">{selectedFinding.detectionRuleId}</span><p>{selectedFinding.evidence.rationale}</p><button className="experience-secondary" onClick={() => selectFinding(selectedFinding)}>Xem vị trí & căn cứ</button></> : <p>Chưa ghi nhận nguy cơ theo bộ quy tắc hiện tại. Bạn vẫn có thể kiểm tra từng đồ vật.</p>}</div>}
          {index === 4 && <><div className="experience-interventions">{INTERVENTIONS.map((intervention) => <button key={intervention.id} onClick={() => apply(intervention.id)} title={intervention.description}>{intervention.label}</button>)}</div>
            <div className="experience-history"><button aria-label="Hoàn tác" disabled={!past.length} onClick={undo}><Undo2 size={17} />Hoàn tác</button><button aria-label="Làm lại" disabled={!future.length} onClick={redo}><Redo2 size={17} />Làm lại</button><button onClick={save}><Save size={17} />Lưu trên thiết bị</button><button onClick={reload}><RotateCcw size={16} />Tải đã lưu</button></div>
            <p className="experience-provenance">Kịch bản thử nghiệm độc lập. Chỉ cập nhật không gian làm việc khi bạn chọn áp dụng.</p></>}
          {index === 5 && <><div className="experience-result"><div><span>Trước</span><strong>{comparison.before.score}</strong></div><span>—</span><div><span>Sau</span><strong data-testid="comparison-after-score">{comparison.after.score}</strong></div><em>{comparison.delta >= 0 ? "+" : ""}{comparison.delta} điểm</em></div>
            <p className="experience-result-copy">{comparison.resolved.length} nguy cơ đã giải quyết · {findings.length} còn lại · {comparison.introduced.length} mới xuất hiện.</p>
            <button className="experience-primary" onClick={applyToWorkspace}>Áp dụng kịch bản này</button>
            <div className="experience-final-links"><Link href="/reports">Xem báo cáo</Link><Link href="/digital-twin">Khám phá 3D</Link><Link href="/ai-guided-survey">Tiếp tục khảo sát</Link></div>
            <p className="experience-provenance">Điểm số là chỉ số của mô hình, không phải xác suất té ngã hay chứng nhận an toàn.</p></>}
        </ChapterOverlay>}
      </section>)}
    </div>
  </div>;
}

