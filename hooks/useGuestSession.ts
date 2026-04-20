"use client";

import { useState, useEffect } from "react";

export function useGuestSession() {
  const [sessionString, setSessionString] = useState<string | null>(null);

  useEffect(() => {
    const updateSession = () => {
      // 1. Get or create the base guest ID
      let baseId = localStorage.getItem("fotion-session-id");
      
      // Clean up any corrupted IDs from our previous buggy tunneling logic
      if (!baseId || baseId.includes("||vip_")) {
        baseId = `guest_${Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')}`;
        localStorage.setItem("fotion-session-id", baseId);
      }

      // 2. Check for an active VIP token
      const vipToken = localStorage.getItem("fotion-vip-token");
      
      // 3. Safely combine them for the Convex backend
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