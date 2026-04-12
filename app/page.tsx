"use client"; 

import { useState, useRef, useEffect } from "react";
import { EisenhowerMatrix } from "@/components/views/EisenhowerMatrix";
import { NewTaskForm } from "@/components/views/NewTaskForm";
import { ViewTabs, ViewType } from "@/components/ui/ViewTabs";
import { RawDataView } from "@/components/views/RawDataView";
import { TodayView } from "@/components/views/TodayView";
import { PipelinesView } from "@/components/views/PipelinesView";
import { TaskDetailsPane } from "@/components/views/TaskDetailsPane";
import { ImportProjectModal } from "@/components/views/ImportProjectModal";
import { ProjectManagerModal } from "@/components/views/ProjectManagerModal";
import { Show, SignIn, useClerk } from "@clerk/nextjs";
import { Folder, Zap, Settings, LogOut } from "lucide-react";

// NEW: Minimalist Custom Menu
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
        <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-xl rounded-lg py-1 z-50">
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      
      <Show when="signed-in">
        <header className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-sm pt-2">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
            <div className="flex items-center text-[15px]">
              <span className="font-semibold text-[var(--foreground)] tracking-tight">Fotion</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={() => setIsProjectModalOpen(true)} className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-[var(--foreground)] transition-colors px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Folder className="w-4 h-4" /> Projects
              </button>
              <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors px-2 py-1 rounded-md">
                <Zap className="w-4 h-4" /> Project Import
              </button>
              <div className="w-px h-5 bg-[var(--border)] mx-1"></div>
              
              {/* Replacing standard profile image with our custom gear menu */}
              <CustomUserMenu />
            </div>
          </div>
        </header>

        <main className="pt-4 pb-12 relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <ViewTabs activeView={activeView} onViewChange={setActiveView} />
            <div className="mb-4">
              <NewTaskForm />
            </div>
            <div className="mt-4">
              {activeView === "Matrix" && <EisenhowerMatrix />}
              {activeView === "Raw Data" && <RawDataView />}
              {activeView === "Today" && <TodayView />}
              {activeView === "Pipelines" && <PipelinesView />}
            </div>
          </div>
          <TaskDetailsPane />
          <ImportProjectModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
          <ProjectManagerModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} />
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
