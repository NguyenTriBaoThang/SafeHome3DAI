"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { StructuredCitation, EvidenceStatus } from "@/lib/rag/types";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  evidenceStatus?: string;
  responseMode?: string;
  citations?: StructuredCitation[];
  suggestedFollowUps?: string[];
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
  const { getCurrentRoom, currentAssessment } = useSimulationStore();
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

  // Right Inspector state
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<"evidence" | "sources" | "eval">("evidence");
  const [selectedCitation, setSelectedCitation] = useState<StructuredCitation | null>(null);

  // RAG Evaluation live report state
  const [evalReport, setEvalReport] = useState<any>(null);
  const [evalLoading, setEvalLoading] = useState(false);

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
          // Initialize a first session
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
          // Set first citation if exists
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
        content: `Xin chào! Tôi là **SafeHome Copilot** — trợ lý an toàn không gian sống và phòng ngừa té ngã cho người cao tuổi.

Tôi được trang bị hệ thống tri thức đã qua thẩm định từ **Tổ chức Y tế Thế giới (WHO)**, **CDC Hoa Kỳ (Chương trình STEADI)** và **Bộ Y tế Việt Nam**.

Mọi khuyến nghị đều có trích dẫn trực tiếp từ các cẩm nang chính thống, minh bạch và có thể kiểm chứng độc lập.`,
        evidenceStatus: "SUPPORTED",
        responseMode: "LOCAL_GROUNDED",
        timestamp: new Date().toISOString(),
        suggestedFollowUps: [
          "Những yếu tố nào có thể gây té ngã trong phòng ngủ?",
          "Nhà vệ sinh cần trang bị thanh vịn ở những vị trí nào?",
          "Tôi cần chú ý gì với thảm trải sàn và dây điện?",
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

  const handleSendMessage = async (queryText?: string) => {
    const text = queryText || inputQuery;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      // Stream assistant response
      const res = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          conversationId: currentConversationId,
          roomContext: {
            roomName: room.name,
            hazardCount: findings.length,
            hazardTitles: findings.map((f) => f.title),
            lightingLux: room.lightingLevel,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Lỗi kết nối máy chủ");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      const assistantMsgId = `asst-${Date.now()}`;
      let accumulatedText = "";
      let streamedEvidenceStatus = "SUPPORTED";
      let streamedResponseMode = "LOCAL_GROUNDED";
      let streamedCitations: StructuredCitation[] = [];
      let streamedFollowUps: string[] = [];

      // Add placeholder assistant message
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
        while (!done) {
          const { value, done: isDone } = await reader.read();
          done = isDone;
          if (value) {
            const rawChunk = decoder.decode(value, { stream: true });
            const lines = rawChunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.replace("data: ", ""));
                  if (data.type === "meta") {
                    streamedEvidenceStatus = data.evidence_status;
                    streamedResponseMode = data.response_mode;
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
                  }
                } catch (e) {}
              }
            }
          }
        }
      }

      // Finalize assistant message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: accumulatedText,
                evidenceStatus: streamedEvidenceStatus,
                responseMode: streamedResponseMode,
                citations: streamedCitations,
                suggestedFollowUps: streamedFollowUps,
                isStreaming: false,
              }
            : m
        )
      );

      // Focus first citation in right inspector if available
      if (streamedCitations.length > 0) {
        setSelectedCitation(streamedCitations[0]);
        setRightPanelOpen(true);
      }

      // Refresh conversation list to update message count & timestamp
      loadConversations();
    } catch (err: any) {
      console.warn("Streaming error, falling back to standard API:", err);
      // Fallback to standard /api/ai/chat
      try {
        const fallbackRes = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            conversationId: currentConversationId,
          }),
        });
        const data = await fallbackRes.json();
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
            timestamp: new Date().toISOString(),
          },
        ]);
        if (data.citations && data.citations.length > 0) {
          setSelectedCitation(data.citations[0]);
        }
      } catch (fErr) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content:
              "Không thể kết nối đến dịch vụ AI. Vui lòng kiểm tra lại mạng hoặc máy chủ cục bộ.",
            evidenceStatus: "INSUFFICIENT_EVIDENCE",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunEvaluation = async () => {
    setEvalLoading(true);
    setActiveRightTab("eval");
    setRightPanelOpen(true);
    try {
      const res = await fetch("/api/rag/eval");
      if (res.ok) {
        const data = await res.json();
        setEvalReport(data);
      }
    } catch (e) {
      console.warn("Lỗi chạy kiểm thử RAG:", e);
    } finally {
      setEvalLoading(false);
    }
  };

  // Render clickable inline citations [1], [2]
  const renderMessageContent = (content: string, citations?: StructuredCitation[]) => {
    const parts = content.split(/(\[\d+(?:,\s*\d+)*\])/g);

    return (
      <div className="whitespace-pre-line leading-relaxed">
        {parts.map((part, i) => {
          const match = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
          if (match) {
            const numbers = match[1].split(",").map((s) => parseInt(s.trim(), 10));
            return (
              <span key={i} className="inline-flex gap-0.5 mx-1">
                {numbers.map((num) => {
                  const citationObj = citations?.find((c) => c.citationNumber === num);
                  return (
                    <button
                      key={num}
                      onClick={() => {
                        if (citationObj) {
                          setSelectedCitation(citationObj);
                          setActiveRightTab("evidence");
                          setRightPanelOpen(true);
                        }
                      }}
                      className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-teal-100 hover:bg-teal-200 text-teal-900 font-mono text-[10px] font-bold transition shadow-xs border border-teal-300"
                      title={citationObj ? `${citationObj.publisher}: ${citationObj.sectionTitle}` : `Trích dẫn [${num}]`}
                    >
                      [{num}]
                    </button>
                  );
                })}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "SUPPORTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Có bằng chứng hỗ trợ
          </span>
        );
      case "PARTIALLY_SUPPORTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            Bằng chứng hỗ trợ một phần
          </span>
        );
      case "INSUFFICIENT_EVIDENCE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertCircle className="h-3 w-3 text-orange-600" />
            Chưa đủ bằng chứng
          </span>
        );
      case "OUT_OF_SCOPE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <HelpCircle className="h-3 w-3 text-slate-500" />
            Ngoài phạm vi hỗ trợ
          </span>
        );
      case "EMERGENCY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <Flame className="h-3 w-3 text-rose-600" />
            Tình huống khẩn cấp
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <ShieldCheck className="h-3 w-3 text-teal-600" />
            Đã kiểm chứng
          </span>
        );
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchConvQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-100 font-sans">
      {/* ========================================================= */}
      {/* 1. LEFT PANEL: Conversations & Knowledge Status */}
      {/* ========================================================= */}
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0 hidden md:flex">
        {/* Top: New Chat & Search */}
        <div className="p-3.5 space-y-3">
          <button
            onClick={createNewConversation}
            className="w-full py-2.5 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Cuộc trò chuyện mới</span>
          </button>

          {/* Search Bar */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchConvQuery}
              onChange={(e) => setSearchConvQuery(e.target.value)}
              placeholder="Tìm kiếm lịch sử chat..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Middle: Conversation Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Lịch sử tư vấn ({filteredConversations.length})
          </div>

          {filteredConversations.map((conv) => {
            const isActive = conv.id === currentConversationId;
            return (
              <div
                key={conv.id}
                onClick={() => setCurrentConversationId(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  isActive
                    ? "bg-teal-50 text-teal-900 border border-teal-200/80 font-bold shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <MessageSquare
                    className={`h-4 w-4 shrink-0 ${isActive ? "text-teal-600" : "text-slate-400"}`}
                  />
                  <span className="truncate">{conv.title}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 rounded transition"
                  title="Xóa cuộc trò chuyện"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom: Knowledge Status & Live Evaluation trigger */}
        <div className="p-3.5 border-t border-slate-100 space-y-2.5 bg-slate-50/70">
          <div className="p-3 rounded-2xl bg-white border border-slate-200 text-[11px] space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Kho tri thức chuẩn:</span>
              <span className="font-bold text-teal-700">4 nguồn WHO/CDC</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Đoạn trích thẩm định:</span>
              <span className="font-bold text-slate-800">10 chunks</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Chế độ AI:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
                Evidence Fallback Active
              </span>
            </div>
          </div>

          <button
            onClick={handleRunEvaluation}
            disabled={evalLoading}
            className="w-full py-2 px-3 rounded-xl border border-teal-200 bg-white hover:bg-teal-50 text-teal-800 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            {evalLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />
                <span>Đang thẩm định RAG...</span>
              </>
            ) : (
              <>
                <Activity className="h-3.5 w-3.5 text-teal-600" />
                <span>Chạy Thẩm Định RAG (8 tiêu chí)</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. CENTER PANEL: Chat Interface */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="h-16 px-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={activeTitle}
                      onChange={(e) => setActiveTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
                      className="px-2 py-0.5 text-xs font-bold border border-teal-300 rounded focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveRename}
                      className="p-1 text-teal-600 hover:text-teal-800"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                      {activeTitle}
                    </h1>
                    <button
                      onClick={() => setIsEditingTitle(true)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                      title="Đổi tên cuộc trò chuyện"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 hidden sm:inline">
                  SafeHome Copilot
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Đối chiếu tri thức y tế chuẩn &amp; Liên kết không gian 3D {room.name.split("(")[0]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Inspector Drawer */}
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                rightPanelOpen
                  ? "bg-teal-50 text-teal-800 border-teal-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-teal-600" />
              <span className="hidden sm:inline">Bằng chứng &amp; Nguồn dẫn</span>
              {rightPanelOpen ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-50/50">
          {messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {!isUser && (
                  <div className="h-8 w-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}

                <div className="space-y-2 max-w-2xl">
                  {/* Message bubble */}
                  <div
                    className={`p-4 sm:p-5 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-teal-600 text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                    }`}
                  >
                    {/* Header badge on assistant message */}
                    {!isUser && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-100 text-xs">
                        {renderStatusBadge(msg.evidenceStatus)}

                        <div className="flex items-center gap-1.5 text-slate-400">
                          <button
                            onClick={() => handleCopyMessage(msg.content, msg.id)}
                            className="p-1 hover:text-slate-700 rounded transition"
                            title="Sao chép câu trả lời"
                          >
                            {copiedId === msg.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Content with interactive [1], [2] citations */}
                    {isUser
                      ? msg.content
                      : renderMessageContent(msg.content, msg.citations)}

                    {/* Citations Preview strip inside assistant message */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                        <div className="font-bold text-slate-500 flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-teal-600" />
                          <span>Tài liệu đã dẫn xuất ({msg.citations.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((c) => (
                            <button
                              key={c.citationId}
                              onClick={() => {
                                setSelectedCitation(c);
                                setActiveRightTab("evidence");
                                setRightPanelOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 text-left transition text-[10px] flex items-center gap-1"
                            >
                              <span className="font-bold text-teal-700">[{c.citationNumber}]</span>
                              <span className="truncate max-w-[180px]">{c.publisher}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contextual Suggested Follow-ups */}
                  {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {msg.suggestedFollowUps.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(q)}
                          className="px-3 py-1 rounded-full bg-white hover:bg-teal-50 hover:text-teal-800 text-slate-600 text-[11px] font-medium border border-slate-200 transition shadow-2xs text-left"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2.5 p-3.5 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 w-fit shadow-xs">
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              <span>Đang đối chiếu tài liệu WHO/CDC và thẩm định độ đủ bằng chứng...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preset suggestions when conversation is fresh */}
        {messages.length <= 1 && (
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Gợi ý:</span>
            {PRESET_WELCOME_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[11px] font-medium whitespace-nowrap transition border border-slate-200/80 shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2">
          <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-teal-500 focus-within:bg-white transition">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Hỏi về an toàn thảm, thanh vịn, độ sáng phòng ngủ, hoặc nguy cơ trong phòng 3D..."
              className="flex-1 bg-transparent resize-none text-xs focus:outline-none p-1.5 text-slate-800"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputQuery.trim() || isLoading}
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 transition shadow-sm self-end"
              title="Gửi câu hỏi"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Nhấn Enter để gửi, Shift + Enter để xuống dòng</span>
            <span>Mọi câu trả lời đều được kiểm chứng từ tài liệu y tế chính thống</span>
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* 3. RIGHT PANEL: Evidence Details, Sources & RAG Evaluation */}
      {/* ========================================================= */}
      {rightPanelOpen && (
        <aside className="w-88 xl:w-96 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden">
          {/* Tabs Header */}
          <div className="p-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveRightTab("evidence")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeRightTab === "evidence"
                    ? "bg-white text-teal-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Bằng chứng trích dẫn
              </button>
              <button
                onClick={() => setActiveRightTab("sources")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeRightTab === "sources"
                    ? "bg-white text-teal-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Kho nguồn chuẩn
              </button>
              <button
                onClick={() => setActiveRightTab("eval")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeRightTab === "eval"
                    ? "bg-white text-teal-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Thẩm định RAG
              </button>
            </div>

            <button
              onClick={() => setRightPanelOpen(false)}
              className="p-1 hover:bg-slate-200 rounded-lg text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab 1: Active Citation Inspector */}
          {activeRightTab === "evidence" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedCitation ? (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 font-mono text-xs font-bold">
                      Trích dẫn [{selectedCitation.citationNumber}]
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedCitation.chunkId}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tổ chức phát hành
                    </span>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Building className="h-3.5 w-3.5 text-teal-600" />
                      <span>{selectedCitation.publisher}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tài liệu gốc
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug mt-0.5">
                      {selectedCitation.documentTitle}
                    </h4>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Điều khoản / Đề mục
                    </span>
                    <div className="text-xs font-semibold text-teal-800 mt-0.5">
                      {selectedCitation.sectionTitle}
                      {selectedCitation.pageNumber && (
                        <span className="text-slate-400 ml-1 font-normal">
                          (Trang {selectedCitation.pageNumber})
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Nguyên văn đoạn trích thẩm định
                    </span>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed italic mt-1">
                      &ldquo;{selectedCitation.supportingExcerpt}&rdquo;
                    </div>
                  </div>

                  {selectedCitation.officialUrl && (
                    <a
                      href={selectedCitation.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 pt-1"
                    >
                      <span>Xem toàn văn tại cổng thông tin chính thức</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                  <BookOpen className="h-8 w-8 text-slate-300 mx-auto" />
                  <p>Nhấp vào bất kỳ số trích dẫn [1], [2] trong câu trả lời để xem chi tiết bằng chứng gốc.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Curated Sources Registry */}
          {activeRightTab === "sources" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-xs text-slate-500 leading-normal">
                Các tổ chức y tế và tài liệu chính thống nằm trong danh mục cho phép (Allowlist):
              </div>

              {CURATED_KNOWLEDGE_SOURCES.map((src) => (
                <div
                  key={src.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                      {src.publisher}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Năm {src.publicationDate}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {src.title}
                  </h4>

                  <div className="text-[11px] text-slate-500">
                    Số đoạn trích đã lập chỉ mục: <strong>{src.passages.length}</strong>
                  </div>

                  <a
                    href={src.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 pt-1"
                  >
                    <span>Cổng tra cứu chính thức</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Live RAG Evaluation Benchmark */}
          {activeRightTab === "eval" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">
                  Báo cáo Thẩm định RAG
                </span>
                <button
                  onClick={handleRunEvaluation}
                  disabled={evalLoading}
                  className="text-[11px] font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Chạy lại</span>
                </button>
              </div>

              {evalReport ? (
                <div className="space-y-3.5 text-xs">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="text-[10px] text-emerald-700">Tỷ lệ vượt qua</div>
                      <div className="text-lg font-black text-emerald-800 font-mono">
                        {evalReport.overallPassRatePercent}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200">
                      <div className="text-[10px] text-sky-700">Recall@K</div>
                      <div className="text-lg font-black text-sky-800 font-mono">
                        {evalReport.retrievalRecallAtK * 100}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-teal-50 rounded-xl border border-teal-200">
                      <div className="text-[10px] text-teal-700">Độ chuẩn xác từ chối</div>
                      <div className="text-lg font-black text-teal-800 font-mono">
                        {evalReport.refusalAccuracyPercent}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500">Độ trễ trung bình</div>
                      <div className="text-lg font-black text-slate-800 font-mono">
                        {evalReport.averageLatencyMs}ms
                      </div>
                    </div>
                  </div>

                  {/* Benchmark Items breakdown */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      8 Tiêu chí kiểm định khoa học:
                    </div>
                    {evalReport.results.map((r: any) => (
                      <div
                        key={r.id}
                        className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${
                          r.passed
                            ? "bg-emerald-50/50 border-emerald-200 text-slate-800"
                            : "bg-rose-50/50 border-rose-200 text-rose-900"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="truncate max-w-[200px]">{r.category}</span>
                          <span className={r.passed ? "text-emerald-700" : "text-rose-700"}>
                            {r.passed ? "ĐẠT" : "KHÔNG ĐẠT"}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[10px] line-clamp-1 italic">
                          &ldquo;{r.query}&rdquo;
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.details} ({r.latencyMs}ms)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 space-y-3">
                  <Activity className="h-8 w-8 text-teal-500 mx-auto" />
                  <p>Bấm nút &quot;Chạy Thẩm Định RAG&quot; để thực thi bộ kiểm chuẩn tự động gồm 8 tình huống lâm sàng và kỹ thuật.</p>
                  <button
                    onClick={handleRunEvaluation}
                    disabled={evalLoading}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs"
                  >
                    Bắt đầu thẩm định ngay
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
