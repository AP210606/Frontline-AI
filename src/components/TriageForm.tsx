import React, { useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Trash2, ArrowRight } from "lucide-react";
import { sampleMessages } from "../utils/sampleMessages";

interface TriageFormProps {
  onAnalyze: (text: string) => Promise<void>;
  isLoading: boolean;
}

export default function TriageForm({ onAnalyze, isLoading }: TriageFormProps) {
  const [messageText, setMessageText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || isLoading) return;
    onAnalyze(messageText);
  };

  const handleSelectTemplate = (text: string) => {
    setMessageText(text);
  };

  const handleClear = () => {
    setMessageText("");
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-display font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Analyze Message
          </h2>
          {messageText && (
            <button
              type="button"
              id="clear-btn"
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Input
            </button>
          )}
        </div>

        {/* Preset list */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-500 block mb-2">
            Load Support Templates
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
            {sampleMessages.map((msg, index) => (
              <button
                key={index}
                type="button"
                id={`preset-${index}`}
                onClick={() => handleSelectTemplate(msg.text)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                  messageText === msg.text
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="font-medium text-[11px] opacity-90">{msg.label}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="raw_message_input" className="text-xs font-semibold text-slate-500 block mb-1">
              Raw Customer Message
            </label>
            <textarea
              id="raw_message_input"
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Paste or type a messy customer message here..."
              className="w-full text-sm p-3.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 resize-none font-sans"
            />
          </div>

          <button
            type="submit"
            id="analyze-submit-btn"
            disabled={!messageText.trim() || isLoading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white text-sm font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing Triage...
              </div>
            ) : (
              <>
                Process with AI
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Model: gemini-3.5-flash</span>
        <span>Low Latency • High Accuracy</span>
      </div>
    </div>
  );
}
