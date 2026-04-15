"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, X, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

export function DailyReminderToast() {
  const router = useRouter();
  const tasks = useQuery(api.tasks.getTasks);
  const [isVisible, setIsVisible] = useState(false);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    // Wait until tasks are loaded
    if (tasks === undefined) return;

    const todayStr = new Date().toDateString();
    
    // Check if we've already notified the user today
    const lastNotified = localStorage.getItem("fotion-last-notified");
    if (lastNotified === todayStr) return;

    const isDateToday = (timestamp?: number | null) => {
      if (!timestamp) return false;
      return new Date(timestamp).toDateString() === todayStr;
    };

    // Find incomplete tasks that demand attention today
    const urgentTodayTasks = tasks.filter(t => 
      t.status !== "done" &&
      (t.isToday || isDateToday(t.doOnDate) || isDateToday(t.doByDate))
    );

    if (urgentTodayTasks.length > 0) {
      setDueCount(urgentTodayTasks.length);
      // Slight delay so it slides in naturally after the app loads
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [tasks]);

  const dismiss = () => {
    setIsVisible(false);
    // Stamp today's date so it doesn't show again until tomorrow
    localStorage.setItem("fotion-last-notified", new Date().toDateString());
  };

  const goToTodayView = () => {
    dismiss();
    // Assuming you have a way to switch tabs globally, 
    // but for now, we'll just let them dismiss it and click the tab themselves.
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="bg-white dark:bg-[#252525] border border-[var(--border)] shadow-2xl rounded-2xl p-4 w-80 flex items-start gap-4">
        
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-1">
          <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[var(--foreground)] text-sm">Daily Briefing</h3>
            <button onClick={dismiss} className="text-zinc-400 hover:text-[var(--foreground)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
            You have <strong className="text-[var(--foreground)]">{dueCount} task{dueCount === 1 ? '' : 's'}</strong> waiting for your attention today.
          </p>

          <div className="mt-3 flex gap-2">
            <button 
              onClick={dismiss}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" /> Let's Go
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}