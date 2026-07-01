import React from "react";
import { motion } from "motion/react";

interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  className?: string;
  color?: string;
}

export default function ProgressBar({ value, label, className = "", color }: ProgressBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  const getDefaultColor = (val: number) => {
    if (val >= 80) return "bg-emerald-500";
    if (val >= 50) return "bg-amber-500";
    return "bg-indigo-500";
  };

  const activeColor = color || getDefaultColor(normalizedValue);

  return (
    <div className={`space-y-1 w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center text-xs text-slate-500">
          <span>{label}</span>
          <span className="font-semibold text-slate-800 font-mono">{normalizedValue}%</span>
        </div>
      )}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/40 relative">
        <motion.div
          className={`h-full rounded-full ${activeColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${normalizedValue}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
