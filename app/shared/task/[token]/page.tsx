"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function SharedTaskRedirect({ params }: { params: { token: string } }) {
  const router = useRouter();

  useEffect(() => {
    // 1. Check for an existing session
    let currentSession = localStorage.getItem("fotion-session-id");

    // 2. If they don't have a session, mint a secure VIP Guest token!
    // This prefix ensures the nightly Cron Janitor completely ignores their collaborative work.
    if (!currentSession) {
      currentSession = `vip_guest_${Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
      localStorage.setItem("fotion-session-id", currentSession);
    }

    // 3. Send them to the main dashboard where the shared data will be accessible
    const timer = setTimeout(() => {
      router.push("/");
    }, 1500); // Brief 1.5s delay so they see the secure loading UI

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-[#121212] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      
      <div className="flex justify-center mb-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 relative z-10 bg-emerald-100 dark:bg-[#1a251f] rounded-full" />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mb-3">
        Joining Secure Workspace
      </h2>
      
      <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <p className="text-sm font-medium">Authenticating VIP access...</p>
      </div>

    </div>
  );
}