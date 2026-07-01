import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Globe,
  Scissors,
  Target,
  Search,
  Tag,
  Siren,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Code2,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { TriageItem } from "../types";
import { extractEntities } from "../utils/entityExtractor";
import { evaluateRules } from "../utils/ruleEngine";

interface PipelineVisualizerProps {
  item: TriageItem | null;
}

export default function PipelineVisualizer({ item }: PipelineVisualizerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getSteps = () => {
    if (!item) return [];

    const entities = extractEntities(item.originalMessage);
    const rules = evaluateRules(item);

    return [
      {
        id: "raw",
        label: "Raw Message Ingestion",
        desc: "Ingests raw string payload from customer endpoint.",
        icon: FileText,
        color: "bg-indigo-50 border-indigo-200 text-indigo-700",
        value: `Length: ${item.originalMessage.length} chars`
      },
      {
        id: "lang",
        label: "Language Detection",
        desc: "Analyzes lexical distribution to detect message locale.",
        icon: Globe,
        color: "bg-teal-50 border-teal-200 text-teal-700",
        value: item.language || "English"
      },
      {
        id: "clean",
        label: "Input Content Cleaning",
        desc: "Trims whitespace, sanitizes characters, and normalizes breaks.",
        icon: Scissors,
        color: "bg-slate-100 border-slate-300 text-slate-700",
        value: "Completed"
      },
      {
        id: "intent",
        label: "Intent Core Recognition",
        desc: "Matches semantic vectors to find customer's primary objective.",
        icon: Target,
        color: "bg-sky-50 border-sky-200 text-sky-700",
        value: item.intent || "Unknown"
      },
      {
        id: "entities",
        label: "Structured Entity Extraction",
        desc: "Extracts key tokens: Order IDs, currency values, emails, etc.",
        icon: Search,
        color: "bg-violet-50 border-violet-200 text-violet-700",
        value: `${entities.length} entities found`
      },
      {
        id: "category",
        label: "Category Classification",
        desc: "Resolves classification matching for department assignment.",
        icon: Tag,
        color: "bg-purple-50 border-purple-200 text-purple-700",
        value: item.category
      },
      {
        id: "priority",
        label: "Priority & Urgency Engine",
        desc: "Calculates SLA urgency matrices to assign ticket weight.",
        icon: Siren,
        color: "bg-orange-50 border-orange-200 text-orange-700",
        value: `${item.priority} (${item.urgency || "Medium"})`
      },
      {
        id: "confidence",
        label: "Confidence Score Estimation",
        desc: "Measures model consensus & data sufficiency ratio.",
        icon: Sparkles,
        color: "bg-emerald-50 border-emerald-200 text-emerald-700",
        value: `${Math.round(item.confidence * 100)}%`
      },
      {
        id: "policy",
        label: "Policy Rule Validation",
        desc: "Runs safety, fraud, spam, and compliance business rules.",
        icon: ShieldCheck,
        color: "bg-rose-50 border-rose-200 text-rose-700",
        value: `${rules.length} policies triggered`
      },
      {
        id: "human",
        label: "Human Review Decision Gate",
        desc: "Asserts fail-safes to delegate ambiguous tickets to agents.",
        icon: UserCheck,
        color: "bg-amber-50 border-amber-200 text-amber-700",
        value: item.needs_human ? "Escalate to Human" : "Fully Automated"
      },
      {
        id: "json",
        label: "Structured JSON Export",
        desc: "Outputs rigid compliant JSON payload for system integrations.",
        icon: Code2,
        color: "bg-slate-900 border-slate-800 text-slate-100",
        value: "Valid Schema"
      }
    ];
  };

  const steps = getSteps();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        id="toggle-pipeline-btn"
        className="w-full px-5 py-4 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
      >
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4.5 h-4.5 text-indigo-600" />
          <h3 className="text-xs font-display font-bold text-slate-800 uppercase tracking-wider">
            11-Step Real-time Decision Pipeline
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          <span>{isExpanded ? "Collapse" : "Expand"} Pipeline</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-5">
              {!item ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 italic text-xs gap-1.5">
                  <HelpCircle className="w-8 h-8 opacity-40 text-indigo-500" />
                  <span>Analyze a message to visualize the live 11-step pipeline.</span>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical Connector Line */}
                  <div className="absolute left-[21px] top-4 bottom-4 w-0.5 bg-slate-100 hidden sm:block" />

                  <div className="space-y-4">
                    {steps.map((step, idx) => {
                      const Icon = step.icon;
                      return (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.03 }}
                          className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 group"
                        >
                          {/* Left icon node */}
                          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 shadow-sm relative z-10 transition-all ${step.color} group-hover:scale-105`}>
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Text info block */}
                          <div className="flex-1 bg-slate-50/50 border border-slate-100 rounded-xl p-3 sm:py-2.5 sm:px-4 hover:border-slate-200 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                                  Step {idx + 1}
                                </span>
                                <h4 className="font-bold text-xs text-slate-800 leading-none">
                                  {step.label}
                                </h4>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1.5 font-normal leading-relaxed max-w-[550px]">
                                {step.desc}
                              </p>
                            </div>

                            {/* Node value output */}
                            <div className="text-right shrink-0">
                              <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-white border border-slate-200 text-indigo-700 shadow-2xs">
                                {step.value}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
