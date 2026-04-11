"use client";

import { LayoutGrid, ListTodo, Calendar, Database } from "lucide-react";

export type ViewType = "Matrix" | "Pipelines" | "Today" | "Raw Data";

export function ViewTabs({ activeView, onViewChange }: { activeView: ViewType; onViewChange: (view: ViewType) => void }) {
  const tabs: { id: ViewType; icon: any; label: string }[] = [
    { id: "Matrix", icon: LayoutGrid, label: "Matrix" },
    { id: "Pipelines", icon: ListTodo, label: "Pipelines" },
    { id: "Today", icon: Calendar, label: "Today" },
    { id: "Raw Data", icon: Database, label: "Raw Data" },
  ];

  return (
    <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)] pb-2 overflow-x-auto hide-scrollbar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              isActive 
                ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" 
                : "text-zinc-500 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}