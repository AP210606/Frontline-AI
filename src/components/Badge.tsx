import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "info" | "warning" | "danger" | "success" | "neutral" | "primary";
  className?: string;
}

export default function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold";
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold";
      case "warning":
        return "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
      case "danger":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      case "info":
        return "bg-sky-50 text-sky-700 border-sky-200 font-semibold";
      case "neutral":
      default:
        return "bg-slate-50 text-slate-600 border-slate-200 font-medium";
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border leading-none tracking-wide transition-all ${getVariantClasses()} ${className}`}>
      {children}
    </span>
  );
}
