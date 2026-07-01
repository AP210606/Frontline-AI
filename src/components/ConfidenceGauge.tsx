import React from "react";
import { motion } from "motion/react";
import { Percent } from "lucide-react";

interface ConfidenceGaugeProps {
  confidence: number; // 0.0 to 1.0
  size?: number;
}

export default function ConfidenceGauge({ confidence, size = 120 }: ConfidenceGaugeProps) {
  const percentage = Math.round(confidence * 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence * circumference);

  const getGaugeColor = (score: number) => {
    if (score >= 85) return { stroke: "stroke-emerald-500", bg: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Excellent" };
    if (score >= 70) return { stroke: "stroke-amber-500", bg: "bg-amber-50 text-amber-700 border-amber-100", label: "Good" };
    return { stroke: "stroke-rose-500", bg: "bg-rose-50 text-rose-700 border-rose-100", label: "Needs Review" };
  };

  const color = getGaugeColor(percentage);

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Track Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-slate-200 fill-none"
            strokeWidth="8"
          />
          {/* Animated Progress Circle */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            className={`fill-none ${color.stroke}`}
            strokeWidth="8"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-display font-black tracking-tight text-slate-800">
            {percentage}%
          </span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            Confidence
          </span>
        </div>
      </div>
      <div className="mt-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${color.bg}`}>
          {color.label}
        </span>
      </div>
    </div>
  );
}
