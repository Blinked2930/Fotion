"use client"; 

import { useState } from "react";
import { EisenhowerMatrix } from "@/components/views/EisenhowerMatrix";
import { NewTaskForm } from "@/components/views/NewTaskForm";
import { ViewTabs, ViewType } from "@/components/ui/ViewTabs";
import { RawDataView } from "@/components/views/RawDataView";
import { TodayView } from "@/components/views/TodayView";
import { ListView } from "@/components/views/ListView";
import { TaskDetailsPane } from "@/components/views/TaskDetailsPane";
import { Show, SignIn, UserButton } from "@clerk/nextjs";

export default function Home() {
  const [activeView, setActiveView] = useState<ViewType>("Matrix");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      
      {/* THE WORKSPACE */}
      <Show when="signed-in">
        <header className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-sm pt-2">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between text-[14px]">
            <div className="flex items-center">
              <span className="font-medium text-[var(--foreground)]">Fotion</span>
              <span className="mx-2 text-zinc-300">/</span>
              <span className="text-zinc-500">Tasks</span>
            </div>
            
            {/* UPGRADED PROFILE ICON */}
            <UserButton 
              appearance={{ 
                elements: { 
                  avatarBox: "w-7 h-7 rounded-md border border-[var(--border)] shadow-sm",
                  userButtonPopoverCard: "shadow-xl border border-[var(--border)]"
                } 
              }} 
            />
          </div>
        </header>

        <main className="pt-2 pb-12 relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <ViewTabs activeView={activeView} onViewChange={setActiveView} />
            
            <div className="mb-4">
              <NewTaskForm />
            </div>

            <div className="mt-4">
              {activeView === "Matrix" && <EisenhowerMatrix />}
              {activeView === "Raw Data" && <RawDataView />}
              {activeView === "Today" && <TodayView />}
              {activeView === "List" && <ListView />}
            </div>
          </div>
          
          <TaskDetailsPane />
        </main>
      </Show>

      {/* THE LANDING PAGE */}
      <Show when="signed-out">
        <main className="flex flex-col items-center justify-center min-h-screen px-4 pb-12 animate-in fade-in duration-700">
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