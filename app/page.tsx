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
import { Folder, Zap, Settings, LogOut, Download, Search, X, Loader2, Moon, Sun, ArrowRight, CheckCircle2, Activity } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PushToggle } from "@/components/ui/PushToggle";
import { PushPromptModal } from "@/components/ui/PushPromptModal";
import { TaskCard } from "@/components/ui/TaskCard";
import { useTheme } from "next-themes";
import { useGuestSession } from "@/hooks/useGuestSession"; 

// --- DIAGNOSTIC HUD ---
function DebugPanel({ sessionType, guestSessionId, tasksForVip }: any) {
  const [isOpen, setIsOpen] = useState(false);
  
  const tokenMatch = guestSessionId?.match(/\|\|vip_(.+)$/);
  const activeVipToken = tokenMatch ? tokenMatch[1] : "None";

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="fixed bottom-4 left-4 z-[999] bg-black/90 backdrop-blur text-xs text-green-400 font-mono p-2.5 rounded-lg shadow-lg border border-green-900/50 flex items-center gap-2 hover:bg-black transition-colors">
      <Activity className="w-4 h-4" /> System Diagnostics
    </button>
  );

  return (
    <div className="fixed bottom-4 left-4 z-[999] bg-black/95 backdrop-blur-md text-xs text-green-400 font-mono p-4 rounded-xl shadow-2xl border border-green-900/50 w-[350px] overflow-auto max-h-[60vh]">
      <div className="flex justify-between items-center mb-3 border-b border-green-900/50 pb-2">
        <span className="font-bold text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Fotion Diagnostics</span>
        <button onClick={() => setIsOpen(false)} className="text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-900/20">Close</button>
      </div>
      
      <div className="space-y-1.5 mb-4 bg-green-900/10 p-2 rounded">
        <div><span className="text-zinc-500">Mode:</span> <span className="text-white">{sessionType.toUpperCase()}</span></div>
        <div className="truncate"><span className="text-zinc-500">Session Hook:</span> <span className="text-white">{guestSessionId || "null"}</span></div>
        <div><span className="text-zinc-500">Extracted Token:</span> <span className="text-white">{activeVipToken}</span></div>
      </div>

      <div className="border-t border-green-900/50 pt-3 mb-2">
        <span className="text-zinc-500">Convex DB Result Count:</span> <span className="text-white font-bold">{tasksForVip === undefined ? "Loading..." : tasksForVip?.length}</span>
      </div>

      <div className="space-y-2 mt-2">
        {tasksForVip?.map((t: any) => (
           <div key={t._id} className="pl-2 border-l-2 border-green-700 bg-green-900/20 p-2 rounded-r">
             <div className="truncate"><span className="text-zinc-500">Title:</span> <span className="text-white">{t.title}</span></div>
             <div><span className="text-zinc-500">isPublic:</span> <span className={t.isPublic ? "text-green-400" : "text-red-400"}>{String(t.isPublic)}</span></div>
             <div className="truncate"><span className="text-zinc-500">shareToken:</span> <span className="text-white">{t.shareToken || "none"}</span></div>
           </div>
        ))}
        {tasksForVip?.length === 0 && (
          <div className="text-red-400 mt-3 p-2 bg-red-900/20 border border-red-900/50 rounded leading-relaxed">
            <strong>ERROR: Zero tasks returned.</strong><br/>
            Convex refused to hand over the task. Check that the task is marked "Shared?" in the owner dashboard.
          </div>
        )}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;
  return (
    <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="p-1.5 text-zinc-400 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
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
    if (isOpen) { setTimeout(() => inputRef.current?.focus(), 50); } else { setQuery(""); }
  }, [isOpen]);

  if (!isOpen) return null;
  const results = tasks?.filter(t => query.length > 1 && (t.title.toLowerCase().includes(query.toLowerCase()) || (t.description && t.description.toLowerCase().includes(query.toLowerCase())))) || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex flex-col items-center pt-[10vh] px-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
          <Search className="w-5 h-5 text-zinc-400" />
          <input ref={inputRef} type="text" placeholder="Search all tasks..." className="flex-1 bg-transparent text-lg outline-none placeholder:text-zinc-500" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-[var(--foreground)] bg-zinc-100 dark:bg-zinc-800 rounded-md"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-[#151515] flex-1">
          {query.length <= 1 ? <div className="text-center py-10 text-zinc-400 text-sm">Type at least 2 characters...</div> : results.length === 0 ? <div className="text-center py-10 text-zinc-400 text-sm">No tasks found</div> : results.map(task => <div key={task._id} onClick={onClose}><TaskCard task={task} searchQuery={query} /></div>)}
        </div>
      </div>
    </div>
  );
}

function ExportButton() {
  const sessionId = useGuestSession();
  const tasks = useQuery(api.tasks.getTasks, { sessionId: sessionId ?? undefined });
  const handleExport = () => { /* Logic hidden for brevity, same as before */ };
  return (
    <button onClick={handleExport} className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-[var(--foreground)] px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
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
    function handleClickOutside(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); }
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
      <button onClick={() => setIsOpen(!isOpen)} className="p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"><Settings className="w-4 h-4" /></button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-xl rounded-lg py-1 z-50 flex flex-col">
          {isSignedIn ? (
            <>
              <div className="px-1 py-1"><PushToggle /></div>
              <div className="w-full h-px bg-[var(--border)] my-1"></div>
              <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><LogOut className="w-4 h-4" /> Sign out</button>
            </>
          ) : (
            <>
              {sessionType !== "none" && <button onClick={handleExitGuest} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><X className="w-4 h-4" /> Exit {sessionType === "vip" ? "VIP Access" : "Sandbox"}</button>}
              <div className="w-full h-px bg-[var(--border)] my-1"></div>
              <SignInButton mode="modal"><button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><LogOut className="w-4 h-4 rotate-180" /> Owner Sign In</button></SignInButton>
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
      // Clean up the URL but save the token locally for the hook to find
      localStorage.setItem("fotion-vip-token", vipParam);
      window.location.href = "/"; 
      return;
    } 
    
    // Determine the active mode based on what the hook generates
    const hasVipToken = !!localStorage.getItem("fotion-vip-token");
    if (hasVipToken) {
      setSessionType("vip");
    } else if (localStorage.getItem("fotion-session-id")?.startsWith("demo_user_")) {
      setSessionType("demo");
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
      const newDemoId = `demo_user_${Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
      localStorage.setItem("fotion-session-id", newDemoId);
      localStorage.removeItem("fotion-vip-token"); // Clear any hanging VIP data
      await seedDemoData({ sessionId: newDemoId });
      window.location.href = "/";
    } catch (error) {
      setIsGeneratingDemo(false);
    } 
  };

  if (!isLoaded || (!isSignedIn && guestSessionId === null && !isMounted)) {
    return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-300" /></div>;
  }

  // PORTFOLIO INTERCEPT 
  if (!isSignedIn && sessionType === "none") {
    return (
      <div className="min-h-[100dvh] bg-zinc-50 dark:bg-[#121212] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 relative overflow-hidden">
        <div className="max-w-sm w-full space-y-10 relative z-10">
          <div className="flex justify-center">
            <div className="relative w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight">Fotion</h1>
            <p className="text-[17px] text-zinc-500">A minimalist, serverless task matrix built for deep focus.</p>
          </div>
          <div className="pt-2 flex flex-col gap-5">
            <button onClick={handleStartDemo} disabled={isGeneratingDemo} className="w-full flex justify-center gap-2 bg-emerald-100 text-emerald-800 py-3.5 px-4 rounded-xl font-bold">
              {isGeneratingDemo ? "Generating Sandbox..." : "Try the Live Demo"}
            </button>
            <div className="flex justify-center gap-2 text-sm text-zinc-500">
              <span>Are you the owner?</span><SignInButton mode="modal"><button className="font-semibold text-emerald-600">Sign In</button></SignInButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden flex flex-col relative">
      
      {!isSignedIn && sessionType === "vip" && (
        <DebugPanel sessionType={sessionType} guestSessionId={guestSessionId} tasksForVip={tasksForVip} />
      )}

      <header className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-sm pt-2">
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[15px]">
            <span className="font-semibold">Fotion</span>
            {!isSignedIn && sessionType === "demo" && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-200">Demo Sandbox</span>}
            {!isSignedIn && sessionType === "vip" && <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold uppercase border border-purple-200">VIP Access</span>}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setIsSearchOpen(true)} className="p-1.5 text-zinc-500"><Search className="w-4 h-4" /></button>
            <ThemeToggle />
            <CustomUserMenu sessionType={sessionType} />
          </div>
        </div>
      </header>

      <main className="pt-4 pb-12 relative flex-1 flex flex-col">
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 flex-1">
          <ViewTabs activeView={activeView} onViewChange={handleViewChange} />
          <div className="mb-4"><NewTaskForm /></div>
          <div className="mt-4 flex-1">
            {!isMounted ? <div className="flex justify-center h-64"><Loader2 className="w-6 h-6 animate-spin" /></div> : (
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
      </main>
    </div>
  );
}