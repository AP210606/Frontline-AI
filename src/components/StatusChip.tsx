import React from "react";

interface StatusChipProps {
  status: "Automated" | "Escalated" | "Needs Review" | "In Queue" | "Processed";
}

export default function StatusChip({ status }: StatusChipProps) {
  const getStyles = () => {
    switch (status) {
      case "Automated":
        return {
          bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
          dot: "bg-emerald-500",
        };
      case "Escalated":
        return {
          bg: "bg-rose-50 border-rose-200 text-rose-700 font-bold",
          dot: "bg-rose-500",
        };
      case "Needs Review":
      case "In Queue":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-700",
          dot: "bg-amber-500 animate-pulse",
        };
      case "Processed":
      default:
        return {
          bg: "bg-indigo-50 border-indigo-200 text-indigo-700",
          dot: "bg-indigo-500",
        };
    }
  };

  const style = getStyles();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${style.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
