"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell } from "lucide-react";
import { useGuestSession } from "@/hooks/useGuestSession";

export function PushPromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const saveSubscription = useMutation(api.push.saveSubscription);
  const sessionId = useGuestSession();

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const promptState = localStorage.getItem("fotion-push-prompt");

    if (!promptState) {
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }

    if (promptState.startsWith("snooze:")) {
      const snoozeUntil = parseInt(promptState.split(":")[1]);
      if (Date.now() > snoozeUntil) {
         const timer = setTimeout(() => setIsOpen(true), 2000);
         return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      // FIX: Explicitly request native permission first (Crucial for iOS Safari)
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          localStorage.setItem("fotion-push-prompt", "declined");
          setIsOpen(false);
          return;
        }
      }

      const reg = await navigator.serviceWorker.ready;
      
      const padding = '='.repeat((4 - process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.length % 4) % 4);
      const base64 = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY! + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const applicationServerKey = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        applicationServerKey[i] = rawData.charCodeAt(i);
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      await saveSubscription({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh') as ArrayBuffer))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth') as ArrayBuffer)))
        }
      });
      
      localStorage.setItem("fotion-push-prompt", "accepted");
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to subscribe to pushes", err);
      localStorage.setItem("fotion-push-prompt", "declined");
      setIsOpen(false);
    }
  };

  const handleDecline = () => {
    localStorage.setItem("fotion-push-prompt", "declined");
    setIsOpen(false);
  };

  const handleLater = () => {
    localStorage.setItem("fotion-push-prompt", `snooze:${Date.now() + 24 * 60 * 60 * 1000}`);
    setIsOpen(false);
  };

  // NEW: Suppress the modal entirely for pure demo users (not VIPs)
  if (sessionId && !sessionId.includes("vip_")) return null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1c1c1c] p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-[var(--border)] text-center">
        
        <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-5">
          <Bell className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h3 className="font-bold text-xl text-[var(--foreground)] mb-2 tracking-tight">Stay on track</h3>
        <p className="text-zinc-500 text-sm mb-8 px-2 leading-relaxed">
          Get a quiet daily morning briefing to help you focus on what actually matters today.
        </p>

        <div className="flex flex-col gap-2.5">
          <button 
            onClick={handleSubscribe} 
            className="w-full py-3 text-[15px] font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors active:scale-[0.98]"
          >
            Yes, enable notifications
          </button>
          
          <button 
            onClick={handleLater} 
            className="w-full py-3 text-[15px] font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors active:scale-[0.98]"
          >
            Maybe later
          </button>
          
          <button 
            onClick={handleDecline} 
            className="w-full py-2 mt-1 text-[13px] font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}