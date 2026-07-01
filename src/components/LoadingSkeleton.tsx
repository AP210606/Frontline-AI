import React from "react";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse w-full">
      <div className="h-6 bg-slate-200/80 rounded-lg w-1/3" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200/80 rounded w-1/4" />
          <div className="h-10 bg-slate-100 rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-200/80 rounded w-1/4" />
          <div className="h-10 bg-slate-100 rounded-xl" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-4 bg-slate-200/80 rounded w-1/5" />
        <div className="h-20 bg-slate-100 rounded-xl" />
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <div className="h-4 bg-slate-200/80 rounded w-1/6" />
        <div className="flex gap-2">
          <div className="h-8 bg-slate-100 rounded-lg w-20" />
          <div className="h-8 bg-slate-100 rounded-lg w-24" />
          <div className="h-8 bg-slate-100 rounded-lg w-16" />
        </div>
      </div>
    </div>
  );
}
