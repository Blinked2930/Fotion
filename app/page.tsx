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
import { useAuth, useClerk, SignInButton } from "@clerk/nextjs"; 
import { useRouter } from "next/navigation";
import { Folder, Zap, Settings, LogOut, Download, Search, X, Loader2, Moon, Sun, ArrowRight, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PushToggle } from "@/components/ui/PushToggle";
import { PushPromptModal } from "@/components/ui/PushPromptModal";
import { TaskCard } from "@/components/ui/TaskCard";
import { useTheme } from "next-themes";
import { useGuestSession } from "@/hooks/useGuestSession"; 

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
  const sessionId = useGuestSession();
  const tasks = useQuery(api.tasks.getTasks, { sessionId: sessionId ?? undefined });
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
              const inTitle = task.title.toLowerCase().includes(query.toLowerCase());
              const inBody = !!(task.description && task.description.toLowerCase().includes(query.toLowerCase()));

              return (
                <div key={task._id} className="relative flex flex-col group">
                  <div onClick={onClose}>
                    <TaskCard task={task} searchQuery={query} />
                  </div>
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
  const sessionId = useGuestSession();
  const tasks = useQuery(api.tasks.getTasks, { sessionId: sessionId ?? undefined });
  
  const handleExport = () => {
    if (!tasks || tasks.length === 0) return;

    const headers = [
      "Task ID", "Created At", "Title", "Status", "Pipelines", 
      "Project ID", "Is Today", "Is Urgent", "Is Important", 
      "Is For Funsies", "Do On Date", "Due By Date", "Notes (Plain Text)"
    ];

    const stripHtml = (html: string) => {
      if (!html) return "";
      return html.replace(/<\/(p|div|h[1-6])>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<li>/gi, '- ').replace(/<\/li>/gi, '\n').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    };

    const escapeCsvCell = (cell: any) => {
      if (cell === null || cell === undefined) return '""';
      const stringValue = String(cell);
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const csvRows = tasks.map(task => {
      return [
        task._id, new Date(task._creationTime).toISOString(), task.title, task.status, task.listCategory || "Current", task.projectId || "None",
        !!task.isToday, !!task.isUrgent, !!task.isImportant, !!task.isForFunsies,
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

function CustomUserMenu({ sessionType }: { sessionType: "none" | "demo" | "vip" }) {
  const { signOut } = useClerk();
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExitGuest = () => {
    localStorage.removeItem("fotion-session-id");
    localStorage.removeItem("fotion-vip-token");
    window.location.href = "/"; 
  };

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
          {isSignedIn ? (
            <>
              <div className="px-1 py-1"><PushToggle /></div>
              <div className="w-full h-px bg-[var(--border)] my-1"></div>
              <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </>
          ) : (
            <>
              {sessionType !== "none" && (
                <button onClick={handleExitGuest} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <X className="w-4 h-4" /> Exit {sessionType === "vip" ? "VIP Access" : "Sandbox"}
                </button>
              )}
              <div className="w-full h-px bg-[var(--border)] my-1"></div>
              <SignInButton mode="modal">
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors">
                  <LogOut className="w-4 h-4 rotate-180" /> Owner Sign In
                </button>
              </SignInButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewType>("Matrix");
  const [isMounted, setIsMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  const [sessionType, setSessionType] = useState<"none" | "demo" | "vip">("none");
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const seedDemoData = useMutation(api.demo.seedDemoData);

  const { isLoaded, isSignedIn } = useAuth();
  const guestSessionId = useGuestSession();

  const tasksForVip = useQuery(api.tasks.getTasks, sessionType === "vip" ? { sessionId: guestSessionId ?? undefined } : "skip");

  useEffect(() => {
    const tokenMatch = guestSessionId?.match(/\|\|vip_(.+)$/);
    const activeVipToken = tokenMatch ? tokenMatch[1] : null;

    if (sessionType === "vip" && tasksForVip && activeVipToken) {
      const targetTask = tasksForVip.find(t => t.shareToken === activeVipToken);
      if (targetTask) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("taskId") !== targetTask._id) {
          router.replace(`/?taskId=${targetTask._id}`);
        }
      }
    }
  }, [tasksForVip, sessionType, guestSessionId, router]);

  useEffect(() => {
    const saved = localStorage.getItem("fotion-active-view") as ViewType;
    if (saved) setActiveView(saved);
    
    const urlParams = new URLSearchParams(window.location.search);
    const vipParam = urlParams.get("vip");

    if (vipParam) {
      localStorage.setItem("fotion-vip-token", vipParam);
      window.location.href = "/"; 
      return;
    } 
    
    // FIX: Look at the local storage directly to determine the state. 
    // If there is NO ID, or if we need to show the landing page, keep sessionType as "none".
    const hasVipToken = !!localStorage.getItem("fotion-vip-token");
    const rawBaseId = localStorage.getItem("fotion-session-id");
    const hasSeenLandingPage = !!localStorage.getItem("fotion-seen-landing");
    
    if (hasVipToken) {
      setSessionType("vip");
    } else if (rawBaseId?.startsWith("demo_user_") && hasSeenLandingPage) {
      setSessionType("demo");
    } else {
      setSessionType("none");
    }
    
    setIsMounted(true);
  }, []);

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    localStorage.setItem("fotion-active-view", view);
  };

  const handleStartDemo = async () => {
    setIsGeneratingDemo(true);
    try {
      // The useGuestSession hook already created a demo_user_ ID.
      // We just need to grab it and seed it.
      let demoId = localStorage.getItem("fotion-session-id");
      if (!demoId || !demoId.startsWith("demo_user_")) {
        demoId = `demo_user_${Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
        localStorage.setItem("fotion-session-id", demoId);
      }
      
      await seedDemoData({ sessionId: demoId });
      
      // Mark that they have clicked the button so they bypass this screen next time
      localStorage.setItem("fotion-seen-landing", "true");
      
      setSessionType("demo");
      setIsGeneratingDemo(false);
    } catch (error) {
      console.error(error);
      setIsGeneratingDemo(false);
    } 
  };

  if (!isLoaded || (!isSignedIn && guestSessionId === null && !isMounted)) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300 dark:text-zinc-700" />
      </div>
    );
  }

  // PORTFOLIO INTERCEPT 
  if (!isSignedIn && sessionType === "none") {
    return (
      <div className="min-h-[100dvh] bg-zinc-50 dark:bg-[#121212] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 relative overflow-hidden">
        
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none">
          <svg className="absolute top-[15%] left-[10%] w-64 h-64 text-zinc-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="0.5">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <svg className="absolute bottom-[20%] right-[10%] w-96 h-96 text-zinc-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg className="absolute top-[40%] right-[25%] w-32 h-32 text-zinc-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="0.5">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          </svg>
        </div>

        <div className="max-w-sm w-full space-y-10 relative z-10">
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
                <Sun className="w-10 h-10 text-emerald-600 dark:text-emerald-400 absolute opacity-50 rotate-45 scale-110" strokeWidth={1.5} />
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 relative z-10 bg-emerald-100 dark:bg-[#1a251f] rounded-full" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-[var(--foreground)]">Fotion</h1>
            <p className="text-[17px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              A minimalist, serverless task matrix built for deep focus.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-5">
            <button 
              onClick={handleStartDemo}
              disabled={isGeneratingDemo}
              className="w-full flex items-center justify-center gap-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border dark:border-emerald-800/50 py-3.5 px-4 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingDemo ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generating Sandbox...</>
              ) : (
                <>Try the Live Demo <ArrowRight className="w-5 h-5" /></>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
              <span>Are you the owner?</span>
              <SignInButton mode="modal">
                <button className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline outline-none">
                  Sign In
                </button>
              </SignInButton>
            </div>
          </div>

          <p className="text-xs text-zinc-400 font-medium pt-2">
            Sandbox sessions are isolated to your browser and automatically clear after 48 hours.
          </p>

        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden flex flex-col relative">
      <header className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-sm pt-2">
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[15px]">
            <span className="font-semibold text-[var(--foreground)] tracking-tight">Fotion</span>
            {!isSignedIn && sessionType === "demo" && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold tracking-wider uppercase border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
                Demo Sandbox
              </span>
            )}
            {!isSignedIn && sessionType === "vip" && (
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] font-bold tracking-wider uppercase border border-purple-200 dark:border-purple-900/50 shadow-sm">
                VIP Access
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setIsSearchOpen(true)} className="flex items-center justify-center p-1.5 text-zinc-500 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors mr-1">
              <Search className="w-4 h-4" />
            </button>

            <ExportButton />
            
            <button onClick={() => setIsProjectModalOpen(true)} className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-[var(--foreground)] transition-colors px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <Folder className="w-4 h-4" /> Projects
            </button>
            
            {isSignedIn && (
              <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors px-2 py-1 rounded-md">
                <Zap className="w-4 h-4" /> Import
              </button>
            )}
            
            <div className="w-px h-5 bg-[var(--border)] mx-1"></div>
            
            <ThemeToggle />
            <CustomUserMenu sessionType={sessionType} />
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
    </div>
  );
}