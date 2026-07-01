import React from "react";
import { Mail, Phone, Hash, CreditCard, Calendar, AlertTriangle, FileText, User } from "lucide-react";
import { ExtractedEntity } from "../utils/entityExtractor";

interface EntityCardProps {
  entity: ExtractedEntity;
  key?: React.Key | string;
}

export default function EntityCard({ entity }: EntityCardProps) {
  const getIcon = () => {
    switch (entity.type) {
      case "Email":
        return Mail;
      case "Phone Number":
        return Phone;
      case "Invoice ID":
        return FileText;
      case "Order ID":
        return Hash;
      case "Account ID":
        return User;
      case "Tracking Number":
        return Hash;
      case "Currency":
        return CreditCard;
      case "Date":
        return Calendar;
      case "Urgency Word":
        return AlertTriangle;
      default:
        return Hash;
    }
  };

  const getStyles = () => {
    switch (entity.type) {
      case "Email":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Phone Number":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "Invoice ID":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "Order ID":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Account ID":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Tracking Number":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Currency":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Date":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "Urgency Word":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const Icon = getIcon();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border shadow-sm transition-all hover:scale-102 ${getStyles()}`}>
      <Icon className="w-3.5 h-3.5 opacity-85 shrink-0" />
      <span className="font-bold text-[10px] uppercase opacity-75 mr-0.5">{entity.type}:</span>
      <span className="font-semibold tracking-tight">{entity.value}</span>
    </div>
  );
}
