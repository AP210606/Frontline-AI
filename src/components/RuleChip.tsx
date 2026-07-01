import React from "react";
import { ShieldCheck, ShieldAlert, AlertCircle, Info } from "lucide-react";
import { TriggeredRule } from "../utils/ruleEngine";

interface RuleChipProps {
  rule: TriggeredRule;
  key?: React.Key | string;
}

export default function RuleChip({ rule }: RuleChipProps) {
  const getStyles = () => {
    switch (rule.severity) {
      case "danger":
        return {
          bg: "bg-rose-50 border-rose-200 text-rose-800",
          icon: ShieldAlert,
          iconColor: "text-rose-500",
        };
      case "warning":
        return {
          bg: "bg-amber-50 border-amber-200 text-amber-800",
          icon: AlertCircle,
          iconColor: "text-amber-500",
        };
      case "success":
        return {
          bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
          icon: ShieldCheck,
          iconColor: "text-emerald-500",
        };
      case "info":
      default:
        return {
          bg: "bg-indigo-50 border-indigo-200 text-indigo-800",
          icon: Info,
          iconColor: "text-indigo-500",
        };
    }
  };

  const style = getStyles();
  const Icon = style.icon;

  return (
    <div className={`p-3 rounded-xl border flex gap-3 transition-all ${style.bg} hover:shadow-sm`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
      <div>
        <h5 className="font-bold text-xs leading-none tracking-tight">{rule.name}</h5>
        <p className="text-[11px] opacity-85 mt-1 leading-relaxed font-normal">{rule.description}</p>
      </div>
    </div>
  );
}
