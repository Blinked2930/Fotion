"use client"; 

import { useState, useRef, useEffect } from "react";
import { EisenhowerMatrix } from "@/components/views/EisenhowerMatrix";
import { NewTaskForm } from "@/components/views/NewTaskForm";
import { ViewTabs, ViewType } from "@/components/ui/ViewTabs";
import { RawDataView } from "@/components/views/RawDataView";
import { TodayView } from "@/components/views/TodayView";
import { PipelinesView } from "@/components/views/PipelinesView";
import { ProjectsView } from "@/components/views/ProjectsView";
import { TaskDetailsPane } from "@/components/views/TaskDetailsPane";
import { ImportProjectModal } from "@/components/views/ImportProjectModal";
import { ProjectManagerModal } from "@/components/views/ProjectManagerModal";
import { Show, SignIn, useClerk } from "@clerk/nextjs";
import { Folder, Zap, Settings, LogOut, Download, Search, X, Loader2, Moon, Sun } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PushToggle } from "@/components/ui/PushToggle";
import { PushPromptModal } from "@/components/ui/PushPromptModal";
import { TaskCard } from "@/components/ui/TaskCard";
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-1.5 text-zinc-400 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
      title="Toggle Dark Mode"
    >
      {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function GlobalSearchModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [query, setQuery] = useState("");
  const tasks = useQuery(api.tasks.getTasks);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const results = tasks?.filter(t => 
    query.length > 1 && (
      t.title.toLowerCase().includes(query.toLowerCase()) || 
      (t.description && t.description.toLowerCase().includes(query.toLowerCase()))
    )
  ) || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex flex-col items-center pt-[10vh] px-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-top-4 duration-200">
        
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
          <Search className="w-5 h-5 text-zinc-400" />
          <input 
            ref={inputRef}
            type="text"
            placeholder="Search all tasks and notes..."
            className="flex-1 bg-transparent text-lg text-[var(--foreground)] outline-none placeholder:text-zinc-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-[var(--foreground)] bg-zinc-100 dark:bg-zinc-800 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-[#151515] flex-1">
          {query.length <= 1 ? (
            <div className="text-center py-10 text-zinc-400 text-sm">Type at least 2 characters to search globally...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 text-sm">No tasks found matching "{query}"</div>
          ) : (
            results.map(task => {
              // NEW: Determine exactly where the match occurred
              const inTitle = task.title.toLowerCase().includes(query.toLowerCase());
              const inBody = !!(task.description && task.description.toLowerCase().includes(query.toLowerCase()));

              return (
                <div key={task._id} className="relative flex flex-col group">
                  <div onClick={onClose}>
                    <TaskCard task={task} searchQuery={query} />
                  </div>
                  
                  {/* NEW: Context Badges on Hover */}
                  <div className="absolute top-0 right-4 -translate-y-1/2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {inTitle && <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/80 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-700 shadow-sm">IN TITLE</span>}
                    {inBody && <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/80 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-700 shadow-sm">IN BODY NOTES</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}

function ExportButton() {
  const tasks = useQuery(api.tasks.getTasks);
  
  const handleExport = () => {
    if (!tasks || tasks.length === 0) return;

    const headers = [
      "Task ID", "Created At", "Title", "Status", "Pipelines", 
      "Project ID", "Is Today", "Is Urgent", "Is Important", 
      "Is For Funsies", "Do On Date", "Due By Date", "Notes (Plain Text)"
    ];

    const stripHtml = (html: string) => {
      if (!html) return "";
      return html
        .replace(/<\/(p|div|h[1-6])>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<li>/gi, '- ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]*>?/gm, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
    };

    const escapeCsvCell = (cell: any) => {
      if (cell === null || cell === undefined) return '""';
      const stringValue = String(cell);
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const csvRows = tasks.map(task => {
      return [
        task._id,
        new Date(task._creationTime).toISOString(),
        task.title,
        task.status,
        task.listCategory || "Current",
        task.projectId || "None",
        !!task.isToday,
        !!task.isUrgent,
        !!task.isImportant,
        !!task.isForFunsies,
        task.doOnDate ? new Date(task.doOnDate).toLocaleDateString() : "",
        task.doByDate ? new Date(task.doByDate).toLocaleDateString() : "",
        stripHtml(task.description || "")
      ].map(escapeCsvCell).join(",");
    });

    const csvString = [headers.map(escapeCsvCell).join(","), ...csvRows].join("\n");

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fotion-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleExport} className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-[var(--foreground)] transition-colors px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
      <Download className="w-4 h-4" /> Export
    </button>
  );
}

function CustomUserMenu() {
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-1.5 text-zinc-400 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
      >
        <Settings className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-xl rounded-lg py-1 z-50 flex flex-col">
          <div className="px-1 py-1">
            <PushToggle />
          </div>
          <div className="w-full h-px bg-[var(--border)] my-1"></div>
          <button 
            onClick={() => signOut()} 
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewType>("Matrix");
  const [isMounted, setIsMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("fotion-active-view") as ViewType;
    if (saved) setActiveView(saved);
    setIsMounted(true);
  }, []);

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    localStorage.setItem("fotion-active-view", view);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden flex flex-col">
      <Show when="signed-in">
        <header className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-sm pt-2">
          <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 h-12 flex items-center justify-between">
            <div className="flex items-center text-[15px]">
              <span className="font-semibold text-[var(--foreground)] tracking-tight">Fotion</span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={() => setIsSearchOpen(true)} className="flex items-center justify-center p-1.5 text-zinc-500 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors mr-1">
                <Search className="w-4 h-4" />
              </button>

              <ExportButton />
              
              <button onClick={() => setIsProjectModalOpen(true)} className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-[var(--foreground)] transition-colors px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Folder className="w-4 h-4" /> Projects
              </button>
              
              <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors px-2 py-1 rounded-md">
                <Zap className="w-4 h-4" /> Import
              </button>
              
              <div className="w-px h-5 bg-[var(--border)] mx-1"></div>
              
              <ThemeToggle />
              <CustomUserMenu />
            </div>
          </div>
        </header>

        <main className="pt-4 pb-12 relative flex-1 flex flex-col">
          <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 flex-1">
            <ViewTabs activeView={activeView} onViewChange={handleViewChange} />
            <div className="mb-4">
              <NewTaskForm />
            </div>
            
            <div className="mt-4 flex-1">
              {!isMounted ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-300 dark:text-zinc-700" />
                </div>
              ) : (
                <>
                  {activeView === "Matrix" && <EisenhowerMatrix />}
                  {activeView === "Today" && <TodayView />}
                  {activeView === "Pipelines" && <PipelinesView />}
                  {activeView === "Projects" && <ProjectsView />}
                  {activeView === "Raw Data" && <RawDataView />}
                </>
              )}
            </div>
          </div>
          
          <TaskDetailsPane />
          <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
          <ImportProjectModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
          <ProjectManagerModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} />
          <PushPromptModal />
        </main>
      </Show>

      <Show when="signed-out">
        <main className="flex flex-col items-center justify-center min-h-screen px-4 pb-12">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] mb-2">Fotion</h1>
            <p className="text-zinc-500">Your lightning-fast task triage engine.</p>
          </div>
          <SignIn routing="hash" /> 
        </main>
      </Show>
    </div>
  );
}