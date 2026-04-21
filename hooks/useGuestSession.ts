"use client";

import { useState, useEffect } from "react";

export function useGuestSession() {
  const [sessionString, setSessionString] = useState<string | null>(null);

  useEffect(() => {
    const updateSession = () => {
      // 1. Immediately intercept VIP tokens from the URL before anything else runs
      const urlParams = new URLSearchParams(window.location.search);
      const urlVip = urlParams.get("vip");
      if (urlVip) {
        localStorage.setItem("fotion-vip-token", urlVip);
      }

      // 2. Get or create the base session ID
      let baseId = localStorage.getItem("fotion-session-id");
      
      // FIX: Enforce "demo_user_" prefix so convex/demo.ts passes the security check 
      // and properly attaches project IDs. Clean up any old "guest_" IDs.
      if (!baseId || baseId.includes("||vip_") || baseId.startsWith("guest_")) {
        baseId = `demo_user_${Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
        localStorage.setItem("fotion-session-id", baseId);
      }

      // 3. Check for an active VIP token
      const vipToken = localStorage.getItem("fotion-vip-token");
      
      // 4. Safely combine them for the Convex backend
      if (vipToken) {
        setSessionString(`${baseId}||vip_${vipToken}`);
      } else {
        setSessionString(baseId);
      }
    };

    updateSession();
    
    // Listen for storage changes in case the page updates the token dynamically
    window.addEventListener("storage", updateSession);
    return () => window.removeEventListener("storage", updateSession);
  }, []);

  return sessionString;
}