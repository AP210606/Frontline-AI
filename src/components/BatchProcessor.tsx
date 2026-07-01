import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, FileText, CheckCircle2, AlertCircle, Clock, Percent, Activity, FileCheck, CheckCircle, ShieldAlert } from "lucide-react";
import { TriageItem } from "../types";

interface BatchProcessorProps {
  onBatchProcessed: (newItems: TriageItem[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function BatchProcessor({
  onBatchProcessed,
  isLoading,
  setIsLoading,
}: BatchProcessorProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; count: number } | null>(null);
  const [parsedMessages, setParsedMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // New Live Processing Metrics
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentCategory, setCurrentCategory] = useState<string>("");
  const [currentConfidence, setCurrentConfidence] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [avgProcTime, setAvgProcTime] = useState<number>(0);
  const [accumulatedConfidence, setAccumulatedConfidence] = useState<number>(0);
  const [humanReviewCount, setHumanReviewCount] = useState<number>(0);
  const [isCompletedSuccess, setIsCompletedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to split CSV line respecting quotes
  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let curVal = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(curVal.trim());
        curVal = "";
      } else {
        curVal += char;
      }
    }
    result.push(curVal.trim());
    return result;
  };

  const handleFileContent = (text: string, fileName: string, fileSize: number) => {
    setError(null);
    setIsCompletedSuccess(false);
    try {
      let messages: string[] = [];
      if (fileName.endsWith(".csv")) {
        const lines = text.split(/\r?\n/);
        if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
          throw new Error("The uploaded CSV file is empty.");
        }

        const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
        let msgIndex = headers.findIndex(
          (h) => h.includes("message") || h.includes("text") || h.includes("body") || h.includes("desc")
        );

        if (msgIndex === -1) {
          msgIndex = 0; // fallback to first column
        }

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = parseCSVLine(lines[i]);
          if (cols[msgIndex]) {
            let msg = cols[msgIndex].replace(/^"|"$/g, "").trim();
            if (msg) messages.push(msg);
          }
        }
      } else {
        // Parse TXT file
        if (!text.trim()) {
          throw new Error("The uploaded TXT file is empty.");
        }
        if (text.includes("\n\n")) {
          messages = text
            .split("\n\n")
            .map((m) => m.trim())
            .filter((m) => m.length > 0);
        } else {
          messages = text
            .split("\n")
            .map((m) => m.trim())
            .filter((m) => m.length > 0);
        }
      }

      if (messages.length === 0) {
        throw new Error("No valid customer messages could be extracted from this file.");
      }

      // Limit to max 100 for playground stability
      const finalMessages = messages.slice(0, 100);

      setParsedMessages(finalMessages);
      setFileInfo({
        name: fileName,
        size: fileSize,
        count: finalMessages.length,
      });
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
      setFileInfo(null);
      setParsedMessages([]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleFileContent(event.target.result as string, file.name, file.size);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleFileContent(event.target.result as string, file.name, file.size);
        }
      };
      reader.readAsText(file);
    }
  };

  // Timer effect for live processing elapsed time
  useEffect(() => {
    if (isLoading) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLoading]);

  const triggerTriageBatch = async () => {
    if (parsedMessages.length === 0 || isLoading) return;
    setIsLoading(true);
    setIsCompletedSuccess(false);
    setCurrentMessageIndex(0);
    setElapsedTime(0);
    setAvgProcTime(0);
    setAccumulatedConfidence(0);
    setHumanReviewCount(0);
    setCurrentCategory("Initializing...");
    setCurrentConfidence(0);

    const newlyTriaged: TriageItem[] = [];
    const batchSize = 1; // Process one by one to show highly active and live state transitions as requested

    const totalCount = parsedMessages.length;
    const startTimeOverall = Date.now();

    for (let i = 0; i < totalCount; i++) {
      setCurrentMessageIndex(i + 1);
      const msg = parsedMessages[i];

      try {
        const response = await fetch("/api/triage-batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: [msg] }),
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received non-JSON response from server during batch processing.");
        }

        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const item = data.results[0];
          newlyTriaged.push(item);
          setCurrentCategory(item.category);
          setCurrentConfidence(item.confidence);
          setAccumulatedConfidence((prev) => prev + item.confidence);
          if (item.needs_human) {
            setHumanReviewCount((prev) => prev + 1);
          }
        }
      } catch (err) {
        console.error("Batch triage single step error:", err);
        const fallbackItem: TriageItem = {
          id: Math.random().toString(36).substring(2, 9),
          originalMessage: msg,
          category: "Unknown",
          intent: "Unknown",
          priority: "P2",
          urgency: "Medium",
          sentiment: "Neutral",
          emotion: "Neutral",
          language: "English",
          summary: "Error triaging this record during bulk processing.",
          suggested_action: "Review manually",
          needs_human: true,
          confidence: 0.0,
          risk_score: 50,
          decision_explanation: ["API request timeout or connection issue encountered."],
          human_review_reasons: ["System analysis failure"],
          timestamp: new Date().toISOString(),
        };
        newlyTriaged.push(fallbackItem);
        setCurrentCategory("Other");
        setCurrentConfidence(0);
        setHumanReviewCount((prev) => prev + 1);
      }

      // Calculate rolling avg process time
      const totalElapsedMs = Date.now() - startTimeOverall;
      setAvgProcTime(totalElapsedMs / (i + 1));
    }

    onBatchProcessed(newlyTriaged);
    setIsLoading(false);
    setIsCompletedSuccess(true);
    // Keep fileInfo so the completed state is fully displayed
  };

  const handleReset = () => {
    setFileInfo(null);
    setParsedMessages([]);
    setIsCompletedSuccess(false);
    setError(null);
  };

  // Estimates: ~0.45 seconds per message
  const estTimeSeconds = fileInfo ? Math.max(1, Math.round(fileInfo.count * 0.45)) : 0;
  const currentProgressPercent = fileInfo && currentMessageIndex > 0 ? Math.round((currentMessageIndex / fileInfo.count) * 100) : 0;
  const averageConfidencePercent = currentMessageIndex > 0 ? Math.round((accumulatedConfidence / currentMessageIndex) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <h2 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-indigo-600" />
          Bulk Dataset Upload
        </h2>

        {/* Drag & drop zone */}
        {!fileInfo && !isLoading && (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-indigo-600 bg-indigo-50/50"
                : "border-slate-200 hover:border-slate-300 bg-slate-50/30 hover:bg-slate-50/70"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Drag & drop dataset file here, or click to browse
              </p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Supports .CSV (with "message" column) and .TXT files (one message per paragraph)
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* File loaded state / Setup for analysis */}
        {fileInfo && !isLoading && !isCompletedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-slate-800 truncate max-w-[200px] md:max-w-xs">
                  {fileInfo.name}
                </p>
                <p className="text-xs text-slate-500">
                  Size: {(fileInfo.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Ready to Process
              </span>
            </div>

            {/* Estimation Statistics Panel */}
            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200/60 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Record Count</span>
                <span className="font-bold text-slate-800 text-sm font-mono">{fileInfo.count} messages</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Est. Duration</span>
                <span className="font-bold text-slate-800 text-sm font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  {estTimeSeconds}s
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200/60">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Preview First Row:
              </label>
              <p className="text-xs text-slate-600 italic truncate">
                "{parsedMessages[0]}"
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleReset}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Choose Different
              </button>
              <button
                onClick={triggerTriageBatch}
                className="flex-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Analyze {fileInfo.count} Messages
              </button>
            </div>
          </motion.div>
        )}

        {/* Live Active Processing Progress Panel */}
        {isLoading && fileInfo && (
          <div className="p-4 border border-indigo-100 bg-indigo-50/20 rounded-xl space-y-4">
            <div className="flex justify-between text-xs text-slate-700 font-semibold items-center">
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing message {currentMessageIndex} of {fileInfo.count}
              </span>
              <span className="font-mono text-indigo-700 text-xs font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {currentProgressPercent}%
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
              <motion.div
                className="bg-indigo-600 h-full rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${currentProgressPercent}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>

            {/* Live Triage Status Indicators */}
            <div className="grid grid-cols-2 gap-3.5 bg-white/70 p-3.5 rounded-lg border border-slate-200/50 text-[11px] leading-relaxed">
              <div>
                <span className="text-slate-400 font-medium block">Current Category Detected</span>
                <span className="font-bold text-slate-800 truncate block mt-0.5 max-w-[120px]">
                  {currentCategory || "Evaluating..."}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Live Confidence</span>
                <span className="font-bold text-slate-800 font-mono mt-0.5 block">
                  {currentConfidence > 0 ? `${Math.round(currentConfidence * 100)}%` : "N/A"}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <span className="text-slate-400 font-medium block">Elapsed Time</span>
                <span className="font-bold text-slate-800 font-mono block mt-0.5">
                  {elapsedTime} seconds
                </span>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <span className="text-slate-400 font-medium block">Avg Processing Time</span>
                <span className="font-bold text-slate-800 font-mono block mt-0.5">
                  {avgProcTime > 0 ? `${(avgProcTime / 1000).toFixed(2)}s` : "Evaluating..."}
                </span>
              </div>
            </div>

            {/* Intermediate batch feedback */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded">
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-bold text-slate-700">{currentMessageIndex}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-bold text-slate-700">{fileInfo.count - currentMessageIndex}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Confidence:</span>
                <span className="font-bold text-indigo-600">{averageConfidencePercent}%</span>
              </div>
              <div className="flex justify-between">
                <span>Human Review:</span>
                <span className="font-bold text-amber-600">{humanReviewCount} items</span>
              </div>
            </div>
          </div>
        )}

        {/* COMPLETED SUCCESS STATE */}
        {isCompletedSuccess && fileInfo && (
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-5 border border-emerald-200 bg-emerald-50/20 rounded-xl space-y-4"
          >
            <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm">
              <CheckCircle className="w-5.5 h-5.5 text-emerald-600" />
              <span>✓ Dataset processed successfully</span>
            </div>

            <p className="text-xs text-slate-600">
              The entire file of <strong>{fileInfo.count} messages</strong> was classified with secure structured decision patterns. Live history logs have been synchronized.
            </p>

            <div className="bg-white rounded-lg border border-slate-200/70 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Total processed messages</span>
                <span className="font-bold text-slate-800 font-mono">{fileInfo.count}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Final avg confidence</span>
                <span className="font-bold text-slate-800 font-mono">{averageConfidencePercent}%</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total human review count</span>
                <span className="font-bold text-slate-800 font-mono text-amber-600">{humanReviewCount}</span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Analyze Another Dataset
            </button>
          </motion.div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Processing limit: 100 entries</span>
        <span>Supports UTF-8 CSV & TXT</span>
      </div>
    </div>
  );
}
