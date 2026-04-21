"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export function useGuestSession() {
  const { isSignedIn, isLoaded } = useAuth();
  const [sessionString, setSessionString] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    // FIX: Total Admin Isolation. 
    // If you are signed in, nuke all guest tokens and abort.
    if (isSignedIn) {
      localStorage.removeItem("fotion-session-id");
      localStorage.removeItem("fotion-vip-token");
      setSessionString(null);
      return;
    }

    const updateSession = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlVip = urlParams.get("vip");
      if (urlVip) {
        localStorage.setItem("fotion-vip-token", urlVip);
      }

      const vipToken = localStorage.getItem("fotion-vip-token");
      let baseId = localStorage.getItem("fotion-session-id");
      
      if (vipToken) {
        if (!baseId || !baseId.startsWith("vip_guest_")) {
          baseId = `vip_guest_${Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
          localStorage.setItem("fotion-session-id", baseId);
        }
        setSessionString(`${baseId}||vip_${vipToken}`);
      } else {
        if (!baseId || !baseId.startsWith("demo_user_")) {
          baseId = `demo_user_${Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
          localStorage.setItem("fotion-session-id", baseId);
        }
        setSessionString(baseId);
      }
    };

    updateSession();
    window.addEventListener("storage", updateSession);
    return () => window.removeEventListener("storage", updateSession);
  }, [isSignedIn, isLoaded]);

  return sessionString;
}