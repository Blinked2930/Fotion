"use client"; 

import { useState } from "react";
import { EisenhowerMatrix } from "@/components/views/EisenhowerMatrix";
import { NewTaskForm } from "@/components/views/NewTaskForm";
import { ViewTabs, ViewType } from "@/components/ui/ViewTabs";
import { RawDataView } from "@/components/views/RawDataView";
import { TodayView } from "@/components/views/TodayView";
import { PipelinesView } from "@/components/views/PipelinesView";
import { TaskDetailsPane } from "@/components/views/TaskDetailsPane";
import { ImportProjectModal } from "@/components/views/ImportProjectModal";
import { ProjectManagerModal } from "@/components/views/ProjectManagerModal";
import { Show, SignIn, UserButton } from "@clerk/nextjs";
import { Folder, Zap } from "lucide-react";

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
              <UserButton appearance={{ elements: { avatarBox: "w-7 h-7 rounded-md border border-[var(--border)] shadow-sm" } }} />
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