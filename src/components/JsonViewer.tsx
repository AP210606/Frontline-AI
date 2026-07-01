import React, { useState } from "react";
import { Check, Copy, ChevronDown, ChevronRight, CheckCircle2, Braces } from "lucide-react";

interface JsonViewerProps {
  data: any;
  title?: string;
}

export default function JsonViewer({ data, title = "Structured JSON Output" }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy JSON: ", err);
    }
  };

  // Helper to render HTML with color-coding
  const renderHighlightedJson = (rawJson: string) => {
    if (!rawJson) return null;

    // Tokenize and wrap with color styles
    const lines = rawJson.split("\n");
    return lines.map((line, idx) => {
      // Find keys, strings, numbers, booleans, and nulls
      const keyRegex = /^(\s*)"([^"]+)":/g;
      const valStringRegex = /: "([^"]+)"(,)?$/g;
      const valNumberRegex = /: (-?\d+(?:\.\d+)?)(,)?$/g;
      const valBooleanRegex = /: (true|false|null)(,)?$/g;

      let renderedLine = line;
      let isKeyMatch = line.match(keyRegex);

      if (isKeyMatch) {
        renderedLine = line.replace(
          keyRegex,
          `$1"<span class="text-indigo-600 font-bold">$2</span>":`
        );
      }

      if (line.match(valStringRegex)) {
        renderedLine = renderedLine.replace(
          valStringRegex,
          `: "<span class="text-emerald-600 font-medium">$1</span>"$2`
        );
      } else if (line.match(valNumberRegex)) {
        renderedLine = renderedLine.replace(
          valNumberRegex,
          `: <span class="text-amber-600 font-mono font-bold">$1</span>$2`
        );
      } else if (line.match(valBooleanRegex)) {
        renderedLine = renderedLine.replace(
          valBooleanRegex,
          `: <span class="text-purple-600 font-bold">$1</span>$2`
        );
      }

      return (
        <div
          key={idx}
          className="font-mono text-xs leading-5"
          dangerouslySetInnerHTML={{ __html: renderedLine }}
        />
      );
    });
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md overflow-hidden text-slate-100 flex flex-col h-full">
      {/* Header bar */}
      <div className="px-4 py-3 bg-slate-950 flex items-center justify-between border-b border-slate-800">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 hover:text-indigo-400 transition-colors text-slate-300 cursor-pointer text-xs font-bold uppercase tracking-wider"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          <Braces className="w-4 h-4 text-indigo-400" />
          <span>{title}</span>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Validation Badge */}
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {title.includes("VALID") ? "Syntactically Perfect" : "Valid JSON"}
          </span>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all cursor-pointer border border-slate-800 bg-slate-900 flex items-center gap-1 text-[10px]"
            title="Copy structured JSON payload"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-semibold">Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      {!isCollapsed && (
        <div className="p-4 overflow-auto max-h-[350px] bg-slate-950/40 select-text scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <pre className="text-slate-300 antialiased font-mono">
            {renderHighlightedJson(jsonString)}
          </pre>
        </div>
      )}
    </div>
  );
}
