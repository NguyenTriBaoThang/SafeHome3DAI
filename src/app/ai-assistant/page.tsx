"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Loader2,
  Building,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Search,
  ChevronRight,
  ChevronLeft,
  X,
  FileText,
  Activity,
  Check,
  Edit2,
  MessageSquare,
  ShieldAlert,
  Flame,
  Camera,
  Layers,
  ArrowRight,
  Eye,
  Compass,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  StopCircle,
  Paperclip,
  CheckCheck,
  Box,
} from "lucide-react";
import { useSimulationStore, Copilot3DAction } from "@/stores/useSimulationStore";
import { StructuredCitation } from "@/lib/rag/types";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";
import { SafeHomeMarkdown } from "@/components/chat/SafeHomeMarkdown";
import { ItemHazardCard } from "@/components/chat/ItemHazardCard";
import { ItemAssessmentModal } from "@/components/chat/ItemAssessmentModal";
import type { ItemHazardAssessment } from "@/lib/vision/itemHazardTypes";
import type { ToolExecutionResult } from "@/lib/ai/copilotToolRegistry";

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  evidenceStatus?: string;
  responseMode?: string;
  citations?: StructuredCitation[];
  suggestedFollowUps?: string[];
  toolInvocations?: ToolExecutionResult[];
  itemAssessment?: ItemHazardAssessment;
  attachedImageUrl?: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

const PRESET_WELCOME_PROMPTS = [
  "Những yếu tố nào có thể gây té ngã trong phòng ngủ của người già?",
  "Nhà vệ sinh của người cao tuổi nên được kiểm tra như thế nào?",
  "Tôi cần chú ý gì với thảm trải sàn và dây điện trên lối đi?",
  "Hãy giải thích các biện pháp cải thiện lối đi thông thoáng theo CDC.",
];

export default function AIAssistantPage() {
  const router = useRouter();
  const {
    rooms,
    currentRoomId,
    switchRoom,
    getCurrentRoom,
    currentAssessment,
    setCopilotPendingAction,
  } = useSimulationStore();

  const room = getCurrentRoom();
  const findings = currentAssessment?.findings || [];

  // Conversation sessions state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>("default-session");
  const [searchConvQuery, setSearchConvQuery] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activeTitle, setActiveTitle] = useState("Tư vấn an toàn phòng ngừa té ngã");

  // Messages state
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Attached image state for Multimodal Chat
  const [attachedImage, setAttachedImage] = useState<{
    dataUrl: string;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Speech-to-Text state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Abort controller for Stop Generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Right Inspector state
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<"evidence" | "objects" | "sources" | "eval">("evidence");
  const [selectedCitation, setSelectedCitation] = useState<StructuredCitation | null>(null);

  // Item Hazard Assessment state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [recentItemAssessments, setRecentItemAssessments] = useState<ItemHazardAssessment[]>([]);
  const [selectedItemAssessment, setSelectedItemAssessment] = useState<ItemHazardAssessment | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initial load: fetch conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation messages when session changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId]);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setConversations(data);
          if (!currentConversationId || currentConversationId === "default-session") {
            setCurrentConversationId(data[0].id);
            setActiveTitle(data[0].title);
          }
        } else {
          createNewConversation();
        }
      }
    } catch (e) {
      console.warn("Lỗi tải danh sách hội thoại:", e);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveTitle(data.title || "Tư vấn an toàn phòng ngừa té ngã");
        if (data.messages && data.messages.length > 0) {
          const mapped: ChatMessageItem[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            evidenceStatus: m.evidenceStatus,
            responseMode: m.responseMode,
            citations: m.citations || [],
            timestamp: m.createdAt,
          }));
          setMessages(mapped);
          const lastAssistant = [...mapped].reverse().find((m) => m.role === "assistant" && m.citations && m.citations.length > 0);
          if (lastAssistant && lastAssistant.citations && lastAssistant.citations.length > 0) {
            setSelectedCitation(lastAssistant.citations[0]);
          }
        } else {
          showWelcomeMessage();
        }
      } else {
        showWelcomeMessage();
      }
    } catch (e) {
      showWelcomeMessage();
    }
  };

  const showWelcomeMessage = () => {
    setMessages([
      {
        id: "msg-welcome",
        role: "assistant",
        content: `Xin chào! Tôi là **SafeHome AI Copilot 2.0** — trợ lý an toàn không gian sống và phòng ngừa té ngã cho người cao tuổi.

Tôi kết nối trực tiếp với **Bản sao số 3D** căn nhà và kho tri thức y học chứng cứ đã qua thẩm định từ **WHO 2021**, **CDC STEADI Hoa Kỳ** và **Bộ Y tế Việt Nam**.

**Bạn có thể yêu cầu tôi:**
- 🔍 *Kiểm tra các mối nguy té ngã trong phòng ngủ hoặc nhà vệ sinh.*
- 🎯 *Định vị và phóng to các vật thể nguy hiểm trực tiếp trên mô hình 3D.*
- 📷 *Gửi ảnh vật dụng thực tế để tôi phân tích điểm rủi ro CDC STEADI.*
- 🎙️ *Trò chuyện bằng giọng nói tiếng Việt tự nhiên.*`,
        evidenceStatus: "SUPPORTED",
        responseMode: "LOCAL_GROUNDED",
        timestamp: new Date().toISOString(),
        suggestedFollowUps: [
          "Phòng ngủ của tôi có những nguy cơ té ngã nào?",
          "Hãy cho tôi xem thảm chân và dây điện trên 3D.",
          "Vị trí lắp đặt thanh vịn nhà tắm theo chuẩn CDC STEADI?",
          "Điểm an toàn môi trường hiện tại được tính như thế nào?",
        ],
      },
    ]);
  };

  const createNewConversation = async () => {
    try {
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Cuộc trò chuyện mới" }),
      });
      if (res.ok) {
        const newConv = await res.json();
        setConversations((prev) => [newConv, ...prev]);
        setCurrentConversationId(newConv.id);
        setActiveTitle(newConv.title);
        showWelcomeMessage();
      }
    } catch (e) {
      const fallbackId = `conv-${Date.now()}`;
      setCurrentConversationId(fallbackId);
      setActiveTitle("Cuộc trò chuyện mới");
      showWelcomeMessage();
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/conversations/${convId}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (currentConversationId === convId) {
        const remaining = conversations.filter((c) => c.id !== convId);
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id);
        } else {
          createNewConversation();
        }
      }
    } catch (err) {
      console.warn("Lỗi xóa hội thoại:", err);
    }
  };

  const handleSaveRename = async () => {
    setIsEditingTitle(false);
    if (!activeTitle.trim()) return;
    try {
      await fetch(`/api/ai/conversations/${currentConversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: activeTitle.trim() }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === currentConversationId ? { ...c, title: activeTitle.trim() } : c))
      );
    } catch (e) {}
  };

  // Voice Speech-to-Text (STT) handler
  const handleToggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Trình duyệt không hỗ trợ nhận diện giọng nói Web Speech API. Vui lòng sử dụng Google Chrome hoặc Microsoft Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "vi-VN";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e: any) => {
        const transcript = Array.from(e.results)
          .map((r: any) => r[0].transcript)
          .join("");
        setInputQuery(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  // Voice Text-to-Speech (TTS) handler
  const handleSpeakAnswer = (msgId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`>\[\]]/g, "").replace(/\n+/g, ". ");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "vi-VN";
    utterance.rate = 1.05;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Stop Generation handler
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // 3D Bridge Navigation Action
  const handleNavigateTo3D = (toolRes: ToolExecutionResult) => {
    if (toolRes.clientAction) {
      const { type, payload } = toolRes.clientAction;
      if (type === "NAVIGATE") {
        router.push(payload.route);
        return;
      }
      let bridgeAction: Copilot3DAction | null = null;

      if (type === "FOCUS_3D_OBJECT") {
        bridgeAction = {
          action: "FOCUS_OBJECT",
          targetId: payload.objectId,
          roomId: payload.roomId,
          timestamp: Date.now(),
        };
      } else if (type === "FOCUS_3D_ROOM") {
        bridgeAction = {
          action: "FOCUS_ROOM",
          roomId: payload.roomId,
          timestamp: Date.now(),
        };
      } else if (type === "SET_CAMERA_MODE") {
        bridgeAction = {
          action: "SET_CAMERA_MODE",
          mode: payload.mode,
          timestamp: Date.now(),
        };
      } else if (type === "HIGHLIGHT_RISK") {
        bridgeAction = {
          action: "HIGHLIGHT_RISK",
          targetId: payload.findingId,
          roomId: payload.roomId,
          timestamp: Date.now(),
        };
      }

      if (bridgeAction) {
        setCopilotPendingAction(bridgeAction);
      }
    }
    router.push("/digital-twin");
  };

  // Image Selection Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Dung lượng ảnh tối đa là 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage({
        dataUrl: reader.result as string,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Send Message Handler
  const handleSendMessage = async (queryText?: string) => {
    const text = queryText || inputQuery;
    const hasImage = Boolean(attachedImage);
    if ((!text.trim() && !hasImage) || isLoading) return;

    const userMessageText = text.trim() || (hasImage ? "Phân tích nguy cơ vật dụng từ ảnh này" : "");
    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessageText,
      attachedImageUrl: attachedImage?.dataUrl,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    const currentAttached = attachedImage;
    setAttachedImage(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessageText,
          conversationId: currentConversationId,
          roomId: room.id,
          roomState: room,
          attachedImage: currentAttached?.dataUrl,
        }),
      });

      if (!res.ok) throw new Error("Lỗi kết nối máy chủ");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      const assistantMsgId = `asst-${Date.now()}`;
      let accumulatedText = "";
      let streamedEvidenceStatus = "SUPPORTED";
      let streamedResponseMode = "LLM_GENERATED";
      let streamedCitations: StructuredCitation[] = [];
      let streamedFollowUps: string[] = [];
      let streamedToolInvocations: ToolExecutionResult[] = [];

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
          isStreaming: true,
        },
      ]);

      if (reader) {
        let done = false;
        let pendingLine = "";
        while (!done) {
          const { value, done: isDone } = await reader.read();
          done = isDone;
          if (value) {
            pendingLine += decoder.decode(value, { stream: true });
            const lines = pendingLine.split("\n");
            pendingLine = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.replace("data: ", ""));
                  if (data.type === "meta") {
                    streamedEvidenceStatus = data.evidence_status;
                    streamedResponseMode = data.response_mode;
                  } else if (data.type === "tools") {
                    streamedToolInvocations = data.tool_invocations || [];
                  } else if (data.type === "chunk") {
                    accumulatedText += data.content;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                      )
                    );
                  } else if (data.type === "done") {
                    streamedCitations = data.citations || [];
                    streamedFollowUps = data.suggested_follow_ups || [];
                    if (data.tool_invocations) {
                      streamedToolInvocations = data.tool_invocations;
                    }
                  }
                } catch (e) {}
              }
            }
          }
        }
      }

      let finalText = accumulatedText.trim();
      if (!finalText) {
        try {
          const fbRes = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              message: userMessageText,
              conversationId: currentConversationId,
              roomId: room.id,
              roomState: room,
            }),
          });
          const fbData = await fbRes.json();
          if (!fbRes.ok || !fbData.answer) throw new Error("Không nhận được phản hồi");
          finalText = fbData.answer;
          streamedEvidenceStatus = fbData.evidence_status;
          streamedResponseMode = fbData.response_mode;
          streamedCitations = fbData.citations || [];
          streamedFollowUps = fbData.suggested_follow_ups || [];
          streamedToolInvocations = fbData.tool_invocations || [];
        } catch (fbErr) {
          finalText = "Chưa thể kết nối với trợ lý. Vui lòng thử gửi lại tin nhắn.";
          streamedEvidenceStatus = "INSUFFICIENT_EVIDENCE";
          streamedResponseMode = "REFUSAL_INSUFFICIENT";
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: finalText,
                evidenceStatus: streamedEvidenceStatus,
                responseMode: streamedResponseMode,
                citations: streamedCitations,
                suggestedFollowUps: streamedFollowUps,
                toolInvocations: streamedToolInvocations,
                isStreaming: false,
              }
            : m
        )
      );

      if (streamedCitations.length > 0) {
        setSelectedCitation(streamedCitations[0]);
      }

      loadConversations();
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Stream aborted by user");
      } else {
        console.warn("Streaming error, falling back to standard API:", err);
        try {
          const fallbackRes = await fetch("/api/ai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              message: userMessageText,
              conversationId: currentConversationId,
              roomId: room.id,
              roomState: room,
            }),
          });
          const data = await fallbackRes.json();
          if (!fallbackRes.ok || !data.answer) throw new Error("Không nhận được phản hồi");
          setMessages((prev) => [
            ...prev,
            {
              id: `asst-fb-${Date.now()}`,
              role: "assistant",
              content: data.answer,
              evidenceStatus: data.evidence_status,
              responseMode: data.response_mode,
              citations: data.citations || [],
              suggestedFollowUps: data.suggested_follow_ups || [],
              toolInvocations: data.tool_invocations || [],
              timestamp: new Date().toISOString(),
            },
          ]);
          if (data.citations && data.citations.length > 0) {
            setSelectedCitation(data.citations[0]);
          }
        } catch (e) {}
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchConvQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-100 font-sans">
      {/* =================================================================== */}
      {/* 1. LEFT SIDEBAR: CONVERSATION SESSIONS & HISTORY */}
      {/* =================================================================== */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* New Chat Button */}
        <div className="p-3 border-b border-slate-100">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white font-bold rounded-xl text-xs shadow-sm transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Cuộc trò chuyện mới</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 pb-1">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm hội thoại..."
              value={searchConvQuery}
              onChange={(e) => setSearchConvQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Conversation Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Lịch sử tư vấn ({filteredConversations.length})
          </div>
          {filteredConversations.map((c) => {
            const isActive = c.id === currentConversationId;
            return (
              <div
                key={c.id}
                onClick={() => setCurrentConversationId(c.id)}
                className={`group flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                  isActive
                    ? "bg-teal-50 text-teal-900 font-bold border border-teal-200/80 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-teal-600" : "text-slate-400"}`} />
                  <span className="truncate">{c.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 transition shrink-0"
                  title="Xóa hội thoại"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* System Capabilities Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            <span>Chuẩn Y Khoa: WHO & CDC</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Tất cả khuyến nghị đều được đối chiếu từ cẩm nang y tế chính thống.
          </p>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* 2. MAIN CHAT AREA */}
      {/* =================================================================== */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header Bar */}
        <header className="px-4 py-2.5 border-b border-slate-200 bg-white/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <Bot className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={activeTitle}
                    onChange={(e) => setActiveTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
                    className="text-xs font-bold px-2 py-0.5 border border-teal-300 rounded focus:outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveRename} className="p-1 hover:text-teal-600">
                    <Check className="h-3.5 w-3.5 text-teal-600" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold text-slate-800 truncate">{activeTitle}</h2>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    title="Đổi tên hội thoại"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                <span>SafeHome AI Agent</span>
                <span>•</span>
                <span className="text-teal-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang đồng bộ 3D ({room.name.split("(")[0].trim()})
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions & 3D Connection Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Room Selector */}
            <select
              value={currentRoomId}
              onChange={(e) => switchRoom(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name.split("(")[0].trim()}
                </option>
              ))}
            </select>

            {/* Direct Digital Twin Shortcut */}
            <Link
              href="/digital-twin"
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition"
              title="Mở Bản sao số 3D"
            >
              <Box className="h-3.5 w-3.5 text-teal-600" />
              <span className="hidden sm:inline">Mở 3D</span>
            </Link>

            {/* Toggle Right Inspector */}
            <button
              onClick={() => setRightPanelOpen((prev) => !prev)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition ${
                rightPanelOpen
                  ? "bg-teal-50 text-teal-700 border-teal-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              title="Bật/Tắt bảng thông tin tra cứu y khoa"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Bằng chứng ({selectedCitation ? "1" : "0"})</span>
            </button>
          </div>
        </header>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto justify-end" : "mr-auto justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`space-y-2 max-w-2xl ${isUser ? "items-end" : "items-start"}`}>
                  {/* User Uploaded Image Preview */}
                  {msg.attachedImageUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-xs mb-1">
                      <img
                        src={msg.attachedImageUrl}
                        alt="Ảnh đính kèm"
                        className="max-h-48 object-cover w-full"
                      />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-gradient-to-r from-teal-600 to-sky-600 text-white rounded-tr-none font-medium"
                        : "bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none space-y-2"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <>
                        <SafeHomeMarkdown content={msg.content} />

                        {/* Interactive Citations Bar */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Nguồn kiểm chứng:
                            </span>
                            {msg.citations.map((c) => (
                              <button
                                key={c.citationId}
                                onClick={() => {
                                  setSelectedCitation(c);
                                  setRightPanelOpen(true);
                                  setActiveRightTab("evidence");
                                }}
                                className="px-2 py-0.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-md text-[10px] font-bold text-teal-700 flex items-center gap-1 transition shadow-2xs"
                                title={`${c.publisher}: ${c.documentTitle}`}
                              >
                                <span>[{c.citationNumber}] {c.publisher}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Tool Invocations Action Cards (e.g. Focus 3D Object) */}
                        {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {msg.toolInvocations.map((t, idx) => (
                              <div
                                key={idx}
                                className="bg-white border border-teal-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
                                    <Box className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-bold text-slate-800 truncate">
                                      {t.message}
                                    </div>
                                    <div className="text-[10px] text-teal-600 font-medium">
                                      Công cụ hệ thống: {t.tool}
                                    </div>
                                  </div>
                                </div>

                                {t.clientAction && (
                                  <button
                                    onClick={() => handleNavigateTo3D(t)}
                                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition shrink-0"
                                  >
                                    <span>{t.clientAction.type === "NAVIGATE" ? "Mở phân hệ" : "Mở trên 3D"}</span>
                                    <ArrowRight className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Message Action Footer (for Assistant) */}
                  {!isUser && !msg.isStreaming && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-slate-600 flex items-center gap-1 transition"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <CheckCheck className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>

                      <span>•</span>

                      <button
                        onClick={() => handleSpeakAnswer(msg.id, msg.content)}
                        className={`hover:text-slate-600 flex items-center gap-1 transition ${
                          speakingMsgId === msg.id ? "text-teal-600 font-bold" : ""
                        }`}
                        title="Đọc to câu trả lời bằng giọng nói tiếng Việt"
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="h-3 w-3 text-teal-600 animate-pulse" />
                            <span>Dừng đọc</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3 w-3" />
                            <span>Đọc to</span>
                          </>
                        )}
                      </button>

                      <span>•</span>

                      <button
                        onClick={() => handleSendMessage(messages[messages.length - 2]?.content)}
                        className="hover:text-slate-600 flex items-center gap-1 transition"
                        title="Tạo lại câu trả lời"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Tạo lại</span>
                      </button>
                    </div>
                  )}

                  {/* Suggested Follow-Ups */}
                  {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestedFollowUps.map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(prompt)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 text-slate-600 rounded-full text-[11px] font-medium border border-slate-200/80 transition shadow-2xs"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading / Streaming Skeleton */}
          {isLoading && (
            <div className="flex gap-3 max-w-xl mr-auto items-start animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2 font-medium text-teal-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang suy luận từ dữ liệu không gian 3D & tài liệu y khoa...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white space-y-2">
          {/* Attached Image Preview */}
          {attachedImage && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200 w-fit">
              <img
                src={attachedImage.dataUrl}
                alt="Preview"
                className="w-10 h-10 object-cover rounded-lg"
              />
              <div className="text-[11px] font-medium text-slate-700 truncate max-w-xs">
                {attachedImage.name}
              </div>
              <button
                onClick={() => setAttachedImage(null)}
                className="p-1 hover:text-rose-600 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 rounded-2xl p-2 transition">
            {/* File Upload Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            {/* Attach Image Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-200/60 rounded-xl transition"
              title="Đính kèm ảnh đồ vật hoặc căn phòng để AI phân tích"
            >
              <Camera className="h-4 w-4" />
            </button>

            {/* Voice Input Button */}
            <button
              onClick={handleToggleVoice}
              className={`p-2 rounded-xl transition ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse"
                  : "text-slate-400 hover:text-teal-600 hover:bg-slate-200/60"
              }`}
              title={isListening ? "Đang ghi âm giọng nói..." : "Nói bằng giọng nói tiếng Việt"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Main Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isListening
                  ? "Đang lắng nghe giọng nói..."
                  : "Hỏi về an toàn thảm, thanh vịn, độ sáng phòng ngủ, hoặc yêu cầu xem trên 3D..."
              }
              className="flex-1 bg-transparent border-0 resize-none text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none max-h-32 py-1.5"
            />

            {/* Stop or Send Button */}
            {isLoading ? (
              <button
                onClick={handleStopGeneration}
                className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-xs transition"
                title="Dừng tạo câu trả lời"
              >
                <StopCircle className="h-4 w-4 text-rose-400" />
              </button>
            ) : (
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() && !attachedImage}
                className="p-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white rounded-xl shadow-xs transition disabled:cursor-not-allowed"
                title="Gửi câu hỏi"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Nhấn Enter để gửi, Shift + Enter để xuống dòng</span>
            <span>Mọi câu trả lời đều được kiểm chứng từ tài liệu y tế chính thống</span>
          </div>
        </div>
      </main>

      {/* =================================================================== */}
      {/* 3. RIGHT INSPECTOR PANEL: EVIDENCE, OBJECTS & RAG SOURCES */}
      {/* =================================================================== */}
      {rightPanelOpen && (
        <aside className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0 animate-fade-in">
          {/* Header Tabs */}
          <div className="p-2 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveRightTab("evidence")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  activeRightTab === "evidence"
                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Bằng chứng
              </button>
              <button
                onClick={() => setActiveRightTab("objects")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  activeRightTab === "objects"
                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Vật dụng ({room.objects.length})
              </button>
              <button
                onClick={() => setActiveRightTab("sources")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  activeRightTab === "sources"
                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Kho nguồn
              </button>
            </div>

            <button
              onClick={() => setRightPanelOpen(false)}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeRightTab === "evidence" && (
              <>
                {selectedCitation ? (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          {selectedCitation.publisher}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Trích dẫn [{selectedCitation.citationNumber}]
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 leading-snug">
                        {selectedCitation.documentTitle}
                      </h4>

                      <div className="text-[11px] text-slate-500 font-semibold">
                        Mục: {selectedCitation.sectionTitle}
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-700 italic leading-relaxed">
                        "{selectedCitation.supportingExcerpt}"
                      </div>

                      {selectedCitation.officialUrl && (
                        <a
                          href={selectedCitation.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-sky-600 hover:underline font-semibold pt-1"
                        >
                          <span>Xem toàn văn tài liệu chính thức</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                    <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
                    <p>Nhấp vào bất kỳ nhãn trích dẫn [1], [2] trong câu trả lời để xem chi tiết bằng chứng y khoa.</p>
                  </div>
                )}
              </>
            )}

            {activeRightTab === "objects" && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Đồ nội thất trong {room.name.split("(")[0].trim()}
                </div>
                {room.objects.map((obj) => {
                  const hazard = findings.find((f) => f.targetObjectId === obj.id);
                  return (
                    <div
                      key={obj.id}
                      onClick={() => handleSendMessage(`Cái ${obj.name} này có nguy hiểm không và tôi nên xử lý thế nào?`)}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 hover:border-teal-300 transition cursor-pointer space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 truncate">{obj.name}</span>
                        {hazard ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Nguy cơ
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700">
                            An toàn
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Loại: {obj.modelType}</span>
                        <span>Tọa độ: [{obj.position.join(", ")}]</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeRightTab === "sources" && (
              <div className="space-y-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  4 Nguồn tài liệu đã được thẩm định
                </div>
                {CURATED_KNOWLEDGE_SOURCES.map((src) => (
                  <div key={src.id} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-700 text-[11px]">{src.organization}</span>
                      <span className="text-[9px] text-slate-400">{src.publicationDate}</span>
                    </div>
                    <div className="font-semibold text-slate-800 text-[11px] leading-tight">
                      {src.title}
                    </div>
                    <a
                      href={src.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-sky-600 hover:underline flex items-center gap-1 pt-1"
                    >
                      <span>Cổng thông tin gốc</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
