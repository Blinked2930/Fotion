"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, ListTodo, Calendar, Database, FolderGit2 } from "lucide-react";

export type ViewType = "Matrix" | "Pipelines" | "Today" | "Projects" | "Raw Data";

const defaultTabs: { id: ViewType; icon: any; label: string }[] = [
  { id: "Matrix", icon: LayoutGrid, label: "Matrix" },
  { id: "Pipelines", icon: ListTodo, label: "Pipelines" },
  { id: "Today", icon: Calendar, label: "Today" },
  { id: "Projects", icon: FolderGit2, label: "Projects" },
  { id: "Raw Data", icon: Database, label: "Raw Data" },
];

export function ViewTabs({ 
  activeView, 
  onViewChange,
  onOrderChange 
}: { 
  activeView: ViewType; 
  onViewChange: (view: ViewType) => void;
  onOrderChange?: (views: ViewType[]) => void;
}) {
  const [tabs, setTabs] = useState(defaultTabs);
  const [draggedTab, setDraggedTab] = useState<ViewType | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("fotion-tab-order");
    if (saved) {
      try {
        const order = JSON.parse(saved) as ViewType[];
        const reordered = order.map(id => defaultTabs.find(t => t.id === id)).filter(Boolean) as typeof defaultTabs;
        const missing = defaultTabs.filter(t => !order.includes(t.id));
        const finalTabs = [...reordered, ...missing];
        
        setTabs(finalTabs);
        // Instantly notify the parent component of the loaded custom order
        if (onOrderChange) onOrderChange(finalTabs.map(t => t.id));
      } catch (e) {
        console.error("Failed to parse tab order", e);
      }
    } else {
      if (onOrderChange) onOrderChange(defaultTabs.map(t => t.id));
    }
  }, [onOrderChange]);

  const handleDragStart = (e: React.DragEvent, id: ViewType) => {
    setDraggedTab(id);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => (e.target as HTMLElement).style.opacity = "0.4", 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = "1";
    setDraggedTab(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: ViewType) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetId) return;

    const newTabs = [...tabs];
    const draggedIdx = newTabs.findIndex(t => t.id === draggedTab);
    const targetIdx = newTabs.findIndex(t => t.id === targetId);
    
    const [removed] = newTabs.splice(draggedIdx, 1);
    newTabs.splice(targetIdx, 0, removed);
    
    setTabs(newTabs);
    localStorage.setItem("fotion-tab-order", JSON.stringify(newTabs.map(t => t.id)));
    
    // Notify the parent of the new drag-and-dropped order
    if (onOrderChange) onOrderChange(newTabs.map(t => t.id));
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .no-scroll-bar::-webkit-scrollbar { display: none; }
        .no-scroll-bar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)] pb-2 overflow-x-auto no-scroll-bar select-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tab.id)}
              onClick={() => onViewChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-grab active:cursor-grabbing ${
                isActive 
                  ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-sm" 
                  : "text-zinc-500 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </>
  );
}