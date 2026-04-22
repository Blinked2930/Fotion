"use client";

import { useEffect, useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";

export function useOfflineSyncMutation(mutationFunc: any, mutationName: string) {
  const mutate = useMutation(mutationFunc);

  useEffect(() => {
    const flushQueue = async () => {
      const key = `offline_queue_${mutationName}`;
      const queueRaw = localStorage.getItem(key);
      if (queueRaw) {
        try {
          const queue = JSON.parse(queueRaw);
          if (queue.length > 0) console.log(`[Sync] Flushing ${queue.length} offline mutations for ${mutationName}`);
          
          for (const args of queue) {
            try {
              await mutate(args);
            } catch (err) {
              console.error(`[Sync] Failed to flush ${mutationName}:`, err);
            }
          }
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`Failed to parse offline queue for ${mutationName}`);
        }
      }
    };

    window.addEventListener('online', flushQueue);
    if (typeof window !== "undefined" && navigator.onLine) {
      // Small delay to ensure Convex WebSocket connects before flushing
      setTimeout(flushQueue, 1500); 
    }
    return () => window.removeEventListener('online', flushQueue);
  }, [mutate, mutationName]);

  const executeWithSync = useCallback(async (args: any) => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      // 1. Add to mutation queue
      const key = `offline_queue_${mutationName}`;
      const queue = JSON.parse(localStorage.getItem(key) || "[]");
      queue.push(args);
      localStorage.setItem(key, JSON.stringify(queue));
      
      const tempId = `temp_offline_${crypto.randomUUID()}`;

      // 2. OPTIMISTIC UI: Inject fake task directly into local read cache
      if (mutationName === "createTask") {
        const cacheKey = "offline_cache_getTasks";
        const existing = JSON.parse(localStorage.getItem(cacheKey) || "[]");
        const optimisticTask = {
          _id: tempId,
          _creationTime: Date.now(),
          status: "todo",
          ...args,
        };
        localStorage.setItem(cacheKey, JSON.stringify([optimisticTask, ...existing]));
        window.dispatchEvent(new Event("offline_cache_updated")); // Tell UI to re-render
      }

      return tempId;
    } else {
      return await mutate(args);
    }
  }, [mutate, mutationName]);

  return executeWithSync;
}

export function useOfflineQuery(queryFunc: any, args: any, queryName: string) {
  const data = useQuery(queryFunc, args === "skip" ? "skip" : args);
  const [cachedData, setCachedData] = useState<any>(undefined);

  useEffect(() => {
    const key = `offline_cache_${queryName}`;
    if (data !== undefined && data !== null) {
      setCachedData(data);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }, [data, queryName]);

  useEffect(() => {
    const loadCache = () => {
      if (typeof window !== "undefined" && !navigator.onLine) {
        const key = `offline_cache_${queryName}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          try { setCachedData(JSON.parse(saved)); } catch (e) {}
        }
      }
    };
    
    loadCache();
    window.addEventListener('offline', loadCache);
    window.addEventListener('offline_cache_updated', loadCache); // Listen for optimistic updates
    
    return () => {
      window.removeEventListener('offline', loadCache);
      window.removeEventListener('offline_cache_updated', loadCache);
    };
  }, [queryName]);

  return data !== undefined ? data : cachedData;
}