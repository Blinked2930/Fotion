"use client";

export type ViewType = "Matrix" | "List" | "Today" | "Raw Data";

interface ViewTabsProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const views: ViewType[] = ["Matrix", "List", "Today", "Raw Data"];

export function ViewTabs({ activeView, onViewChange }: ViewTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] mb-6 hide-scrollbar">
      {views.map((view) => (
        <button
          key={view}
          onClick={() => onViewChange(view)}
          className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
            activeView === view
              ? "border-[var(--foreground)] text-[var(--foreground)]"
              : "border-transparent text-zinc-500 hover:text-[var(--foreground)] hover:bg-[var(--subtle-bg)] rounded-t"
          }`}
        >
          {view}
        </button>
      ))}
    </div>
  );
}