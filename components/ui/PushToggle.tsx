"use client";
import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell } from "lucide-react";

export function PushToggle() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const saveSubscription = useMutation(api.push.saveSubscription);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setIsSubscribed(true);
        });
      });
    }
  }, []);

  const subscribe = async () => {
    try {
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
      setIsSubscribed(true);
    } catch (err) {
      console.error("Failed to subscribe to pushes", err);
    }
  };

  return (
    <button 
      onClick={subscribe} 
      disabled={isSubscribed} 
      className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-md transition-colors ${isSubscribed ? 'text-green-500' : 'text-zinc-500 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
    >
      <Bell className="w-4 h-4" /> {isSubscribed ? "Notifications On" : "Enable Push"}
    </button>
  );
}