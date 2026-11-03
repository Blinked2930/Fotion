"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";

export function SanctuaryExport({ sessionId }: { sessionId?: string }) {
  const goals = useQuery(api.goals.getGoals, { sessionId });
  const [isOpen, setIsOpen] = useState(false);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!goals) return;
    const dataStr = JSON.stringify(goals, null, 2);
    const dateStr = new Date().toISOString().split("T")[0];
    downloadFile(dataStr, `sanctuary-export-${dateStr}.json`, "application/json");
    setIsOpen(false);
  };

  const exportCSV = () => {
    if (!goals || goals.length === 0) return;

    const headers = ["ID", "Title", "Category", "Status", "Target Date", "Progress (%)", "Created At"];
    const rows = goals.map((g: any) => [
      `"${g._id}"`,
      `"${(g.title || "").replace(/"/g, '""')}"`,
      `"${(g.category || "General").replace(/"/g, '""')}"`,
      `"${g.status || "active"}"`,
      `"${g.targetDate || ""}"`,
      g.progress || 0,
      `"${new Date(g._creationTime).toISOString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const dateStr = new Date().toISOString().split("T")[0];
    downloadFile(csvContent, `sanctuary-goals-${dateStr}.csv`, "text/csv;charset=utf-8;");
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-4 py-2 text-xs font-semibold text-zinc-700 outline-none transition-all hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.1] active:scale-95"
      >
        <Download className="h-3.5 w-3.5" /> Export Data
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 z-40 w-48 rounded-2xl border border-black/10 bg-white/95 p-1.5 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95">
            <button
              type="button"
              onClick={exportCSV}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={exportJSON}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-black/5 dark:text-zinc-200 dark:hover:bg-white/10"
            >
              <FileJson className="h-4 w-4 text-cyan-500" />
              <span>Export Full JSON</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}