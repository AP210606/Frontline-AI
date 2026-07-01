import React from "react";
import { motion } from "motion/react";
import { ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

interface RiskMeterProps {
  score: number; // 0 to 100
}

export default function RiskMeter({ score }: RiskMeterProps) {
  const getRiskDetails = (val: number) => {
    if (val <= 30) {
      return {
        label: "Low Risk",
        colorClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
        barColor: "bg-emerald-500",
        icon: CheckCircle,
        desc: "Safe for full automation."
      };
    }
    if (val <= 70) {
      return {
        label: "Medium Risk",
        colorClass: "text-amber-700 bg-amber-50 border-amber-200",
        barColor: "bg-amber-500",
        icon: AlertTriangle,
        desc: "Secondary checks recommended."
      };
    }
    return {
      label: "High Risk",
      colorClass: "text-rose-700 bg-rose-50 border-rose-200",
      barColor: "bg-rose-500",
      icon: ShieldAlert,
      desc: "Requires immediate human triage."
    };
  };

  const details = getRiskDetails(score);
  const Icon = details.icon;

  return (
    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            System Risk Assessment
          </span>
          <p className="text-xs text-slate-500 mt-0.5">{details.desc}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${details.colorClass}`}>
          <Icon className="w-3.5 h-3.5" />
          {details.label} ({score}/100)
        </span>
      </div>

      <div className="space-y-1">
        <div className="relative w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
          {/* Risk Zones indicators */}
          <div className="absolute top-0 bottom-0 left-[30%] w-[1px] bg-slate-300 z-10" />
          <div className="absolute top-0 bottom-0 left-[70%] w-[1px] bg-slate-300 z-10" />
          
          {/* Animated score pointer */}
          <motion.div
            className={`h-full rounded-full ${details.barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
          <span>0 (Low)</span>
          <span>30</span>
          <span>70</span>
          <span>100 (High)</span>
        </div>
      </div>
    </div>
  );
}
