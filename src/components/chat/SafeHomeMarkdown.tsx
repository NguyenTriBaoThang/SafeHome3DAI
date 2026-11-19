import React from "react";
import { AlertTriangle, Box, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import type { StructuredCitation } from "@/lib/rag/types";

interface SafeHomeMarkdownProps {
  content: string;
  citations?: StructuredCitation[];
  onCitationClick?: (citation: StructuredCitation) => void;
  isUser?: boolean;
}

/**
 * SafeHomeMarkdown - Professional clinical & engineering markdown renderer for SafeHome Copilot.
 * Gracefully parses headings, bold typography, bullet points, callout warnings,
 * 3D digital twin highlights, and interactive clinical citations [1], [2].
 */
export const SafeHomeMarkdown: React.FC<SafeHomeMarkdownProps> = ({
  content,
  citations = [],
  onCitationClick,
  isUser = false,
}) => {
  if (!content) return null;

  // Render inline formatting: **bold**, *italic*, citations [1], [2], `code`
  const renderInline = (text: string, keyPrefix: string = "inline"): React.ReactNode => {
    // Regex matches:
    // 1. Citations: [1] or [1, 2]
    // 2. Bold: **text**
    // 3. Italic: *text* (when not part of **)
    // 4. Code: `text`
    const regex = /(\[\d+(?:,\s*\d+)*\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;
      const key = `${keyPrefix}-${index}`;

      // Check Citation [1] or [1, 2]
      const citationMatch = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
      if (citationMatch) {
        const numbers = citationMatch[1].split(",").map((s) => parseInt(s.trim(), 10));
        return (
          <span key={key} className="inline-flex gap-0.5 mx-1 align-baseline">
            {numbers.map((num) => {
              const citationObj = citations.find((c) => c.citationNumber === num);
              return (
                <button
                  key={`${key}-cit-${num}`}
                  type="button"
                  onClick={() => {
                    if (citationObj && onCitationClick) {
                      onCitationClick(citationObj);
                    }
                  }}
                  className={`inline-flex items-center px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold transition shadow-2xs border ${
                    isUser
                      ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
                      : "bg-teal-100 hover:bg-teal-200 text-teal-900 border-teal-300 hover:scale-105"
                  }`}
                  title={
                    citationObj
                      ? `${citationObj.publisher}: ${citationObj.sectionTitle}`
                      : `Trích dẫn y tế [${num}]`
                  }
                >
                  [{num}]
                </button>
              );
            })}
          </span>
        );
      }

      // Check Bold **text**
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        const inner = part.slice(2, -2);
        return (
          <strong
            key={key}
            className={`font-bold ${isUser ? "text-white" : "text-slate-900"}`}
          >
            {renderInline(inner, `${key}-b`)}
          </strong>
        );
      }

      // Check Italic *text*
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        const inner = part.slice(1, -1);
        return (
          <em
            key={key}
            className={`italic ${isUser ? "text-teal-100" : "text-slate-700"}`}
          >
            {renderInline(inner, `${key}-i`)}
          </em>
        );
      }

      // Check Code `code`
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        const inner = part.slice(1, -1);
        return (
          <code
            key={key}
            className="px-1.5 py-0.5 rounded bg-slate-100 text-teal-800 text-[11px] font-mono font-semibold border border-slate-200"
          >
            {inner}
          </code>
        );
      }

      return <span key={key}>{part}</span>;
    });
  };

  // If user bubble, render with simpler styling but parsed bold and citations
  if (isUser) {
    return (
      <div className="whitespace-pre-line leading-relaxed text-white">
        {renderInline(content, "usr")}
      </div>
    );
  }

  // Parse assistant response into block structures
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = (blockIdx: number) => {
    if (!currentList) return;
    const { items } = currentList;
    blocks.push(
      <ul key={`ul-${blockIdx}`} className="my-2.5 space-y-1.5 pl-1">
        {items.map((item, idx) => (
          <li
            key={`li-${blockIdx}-${idx}`}
            className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 leading-relaxed"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
            <div className="flex-1">{renderInline(item, `li-${blockIdx}-${idx}`)}</div>
          </li>
        ))}
      </ul>
    );
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty line
    if (!trimmed) {
      flushList(i);
      continue;
    }

    // 2. Horizontal divider `---` or `***`
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList(i);
      blocks.push(
        <hr key={`hr-${i}`} className="my-3.5 border-t border-slate-200" />
      );
      continue;
    }

    // 3. Safety / Medical Disclaimer Box (e.g. "* ⚠️ Tuyên bố an toàn: ... *" or "⚠️ ...")
    if (
      trimmed.startsWith("* ⚠️") ||
      trimmed.startsWith("*⚠️") ||
      trimmed.startsWith("⚠️") ||
      (trimmed.startsWith("*") && trimmed.includes("Tuyên bố an toàn"))
    ) {
      flushList(i);
      const cleanText = trimmed.replace(/^\*+\s*/, "").replace(/\*+$/, "");
      blocks.push(
        <div
          key={`disclaimer-${i}`}
          className="my-3 p-3 sm:p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-amber-950 text-xs leading-relaxed flex items-start gap-2.5 shadow-2xs"
        >
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-amber-900 block mb-0.5">Tuyên bố an toàn y tế:</span>
            <span className="text-amber-800/90 italic">
              {renderInline(cleanText.replace(/^⚠️\s*Tuyên bố an toàn:\s*/, ""), `disc-${i}`)}
            </span>
          </div>
        </div>
      );
      continue;
    }

    // 4. Emergency Escalation Box (e.g. "🚨 **KHẨN CẤP Y TẾ:**")
    if (trimmed.startsWith("🚨") || trimmed.includes("KHẨN CẤP Y TẾ")) {
      flushList(i);
      blocks.push(
        <div
          key={`emergency-${i}`}
          className="my-3 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs leading-relaxed shadow-sm space-y-1.5"
        >
          <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
            <ShieldAlert className="h-5 w-5 text-rose-600 animate-bounce" />
            <span>KHẨN CẤP Y TẾ &amp; AN TOÀN TÉ NGÃ</span>
          </div>
          <div>{renderInline(trimmed.replace(/^🚨\s*/, ""), `emerg-${i}`)}</div>
        </div>
      );
      continue;
    }

    // 5. 3D Digital Twin Context Box (e.g. "📌 **Đối chiếu với không gian 3D đang khảo sát...")
    if (trimmed.startsWith("📌") || trimmed.includes("không gian 3D đang khảo sát")) {
      flushList(i);
      // Collect all following bullet lines that belong to this 3D context
      const contextLines: string[] = [];
      let nextIdx = i + 1;
      while (nextIdx < lines.length && (lines[nextIdx].trim().startsWith("-") || lines[nextIdx].trim().startsWith("*"))) {
        contextLines.push(lines[nextIdx].trim().replace(/^[-*]\s*/, ""));
        nextIdx++;
      }
      i = nextIdx - 1; // advance loop

      blocks.push(
        <div
          key={`twin-context-${i}`}
          className="my-3 p-3.5 rounded-2xl bg-gradient-to-r from-teal-50/90 via-sky-50/70 to-emerald-50/80 border border-teal-200 shadow-2xs space-y-2"
        >
          <div className="flex items-center gap-2 font-bold text-teal-900 text-xs">
            <div className="h-6 w-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-2xs">
              <Box className="h-3.5 w-3.5" />
            </div>
            <span>{renderInline(trimmed.replace(/^📌\s*/, ""), `twin-head-${i}`)}</span>
          </div>

          {contextLines.length > 0 && (
            <div className="space-y-1.5 pl-8 border-l-2 border-teal-200/80 ml-3">
              {contextLines.map((cLine, cIdx) => (
                <div key={`twin-line-${cIdx}`} className="text-xs text-slate-700 leading-snug">
                  {renderInline(cLine, `twin-line-${cIdx}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
      continue;
    }

    // 6. Headings (###, ##, #)
    if (trimmed.startsWith("### ")) {
      flushList(i);
      const title = trimmed.replace(/^###\s+/, "");
      blocks.push(
        <div
          key={`h3-${i}`}
          className="mt-4 mb-2 flex items-center gap-2 pt-1 border-b border-slate-100 pb-1"
        >
          <div className="h-4 w-1 bg-teal-500 rounded-full" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex-1">
            {renderInline(title, `h3-${i}`)}
          </h3>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList(i);
      const title = trimmed.replace(/^##\s+/, "");
      blocks.push(
        <div
          key={`h2-${i}`}
          className="mt-5 mb-2.5 flex items-center gap-2 border-b border-slate-200 pb-1.5"
        >
          <div className="h-5 w-1.5 bg-teal-600 rounded-full" />
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex-1">
            {renderInline(title, `h2-${i}`)}
          </h2>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList(i);
      const title = trimmed.replace(/^#\s+/, "");
      blocks.push(
        <div key={`h1-${i}`} className="mt-6 mb-3 border-b-2 border-teal-600 pb-2">
          <h1 className="text-base sm:text-lg font-black text-slate-900">
            {renderInline(title, `h1-${i}`)}
          </h1>
        </div>
      );
      continue;
    }

    // 7. Bullet items (- or *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const itemText = trimmed.replace(/^[-*]\s+/, "");
      if (!currentList) {
        currentList = { type: "ul", items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // 8. Normal paragraph text
    flushList(i);
    blocks.push(
      <p
        key={`p-${i}`}
        className="text-xs sm:text-sm text-slate-700 leading-relaxed my-2"
      >
        {renderInline(trimmed, `p-${i}`)}
      </p>
    );
  }

  flushList(lines.length);

  return <div className="space-y-1">{blocks}</div>;
};

