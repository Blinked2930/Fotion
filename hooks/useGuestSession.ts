"use client";

import { useState, useEffect } from "react";

export function useGuestSession() {
  const [sessionString, setSessionString] = useState<string | null>(null);

  useEffect(() => {
    const updateSession = () => {
      // 1. Immediately intercept VIP tokens from the URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlVip = urlParams.get("vip");
      if (urlVip) {
        localStorage.setItem("fotion-vip-token", urlVip);
      }

      const vipToken = localStorage.getItem("fotion-vip-token");
      let baseId = localStorage.getItem("fotion-session-id");
      
      // 2. Strict 3-Tier Routing: VIPs get 'vip_guest_', Demos get 'demo_user_'
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
    
    // Listen for storage changes in case the page updates the token dynamically
    window.addEventListener("storage", updateSession);
    return () => window.removeEventListener("storage", updateSession);
  }, []);

  return sessionString;
}