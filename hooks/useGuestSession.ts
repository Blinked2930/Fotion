"use client";

import { useState, useEffect } from "react";

export function useGuestSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check if they already have an ID in their browser
    let storedId = localStorage.getItem("fotion_guest_id");
    
    if (!storedId) {
      // 2. If not, generate a secure, random 24-character ID
      const newId = "guest_" + Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
        
      localStorage.setItem("fotion_guest_id", newId);
      storedId = newId;
    }
    
    setSessionId(storedId);
  }, []);

  return sessionId;
}