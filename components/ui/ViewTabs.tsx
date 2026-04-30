"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, ListTodo, Calendar, Database, FolderGit2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export type ViewType = "Matrix" | "Pipelines" | "Today" | "Projects" | "Raw Data";

const defaultTabs: { id: ViewType; icon: any; label: string }[] = [
  { id: "Today", icon: Calendar, label: "Today" },
  { id: "Pipelines", icon: ListTodo, label: "Pipelines" },
  { id: "Projects", icon: FolderGit2, label: "Projects" },
  { id: "Matrix", icon: LayoutGrid, label: "Matrix" },
  { id: "Raw Data", icon: Database, label: "Raw Data" },
];

export function ViewTabs({ 
  activeView, 
  onViewChange
}: { 
  activeView: ViewType; 
  onViewChange: (view: ViewType) => void;
}) {
  const preferences = useQuery(api.preferences.get);
  const updateTabOrder = useMutation(api.preferences.updateTabOrder);

  const [tabs, setTabs] = useState(defaultTabs);
  const [draggedTab, setDraggedTab] = useState<ViewType | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // FIX: Hydrate from localStorage for INSTANT rendering, bypassing the database load delay
  useEffect(() => {
    const cached = localStorage.getItem("fotion-tab-order");
    if (cached) {
      try {
        const order = JSON.parse(cached) as ViewType[];
        const reordered = order.map(id => defaultTabs.find(t => t.id === id)).filter(Boolean) as typeof defaultTabs;
        const missing = defaultTabs.filter(t => !order.includes(t.id));
        setTabs([...reordered, ...missing]);
      } catch (e) {
        console.error("Failed to parse cached tabs");
      }
    }
    setIsMounted(true);
  }, []);

  // When Convex Cloud finally loads, ensure we are perfectly synced and update the cache
  useEffect(() => {
    if (preferences?.tabOrder) {
      const order = preferences.tabOrder as ViewType[];
      const reordered = order.map(id => defaultTabs.find(t => t.id === id)).filter(Boolean) as typeof defaultTabs;
      const missing = defaultTabs.filter(t => !order.includes(t.id));
      const finalTabs = [...reordered, ...missing];
      
      setTabs(finalTabs);
      localStorage.setItem("fotion-tab-order", JSON.stringify(preferences.tabOrder));
    }
  }, [preferences?.tabOrder]);

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
    
    // Update both local cache AND the cloud instantly
    localStorage.setItem("fotion-tab-order", JSON.stringify(newTabs.map(t => t.id)));
    updateTabOrder({ tabOrder: newTabs.map(t => t.id) });
  };

  // Prevent ANY shuffling by keeping the container invisible until the layout is calculated
  if (!isMounted) {
    return <div className="h-[37px] mb-6 border-b border-[var(--border)] opacity-0"></div>;
  }

  return (
    <div className="flex items-center gap-1 mb-6 border-b border-[var(--border)] pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none animate-in fade-in duration-200">
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
  );
}