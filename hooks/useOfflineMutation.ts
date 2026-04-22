"use client";

import { useEffect, useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";

/**
 * OFFLINE WRITES: Queues mutations when offline and flushes when online.
 */
export function useOfflineSyncMutation(mutationFunc: any, mutationName: string) {
  const mutate = useMutation(mutationFunc);

  useEffect(() => {
    const flushQueue = async () => {
      const key = `offline_queue_${mutationName}`;
      const queueRaw = localStorage.getItem(key);
      if (queueRaw) {
        try {
          const queue = JSON.parse(queueRaw);
          for (const args of queue) {
            try {
              await mutate(args);
            } catch (err) {
              console.error(`Failed to flush ${mutationName}:`, err);
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
      flushQueue();
    }
    return () => window.removeEventListener('online', flushQueue);
  }, [mutate, mutationName]);

  const executeWithSync = useCallback(async (args: any) => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      const key = `offline_queue_${mutationName}`;
      const queue = JSON.parse(localStorage.getItem(key) || "[]");
      queue.push(args);
      localStorage.setItem(key, JSON.stringify(queue));
      return `temp_offline_${crypto.randomUUID()}`;
    } else {
      return await mutate(args);
    }
  }, [mutate, mutationName]);

  return executeWithSync;
}

/**
 * OFFLINE READS: Caches Convex queries to localStorage and serves them if offline.
 */
export function useOfflineQuery(queryFunc: any, args: any, queryName: string) {
  // If args is "skip", we pass "skip" to Convex natively
  const data = useQuery(queryFunc, args === "skip" ? "skip" : args);
  const [cachedData, setCachedData] = useState<any>(undefined);

  useEffect(() => {
    const key = `offline_cache_${queryName}`;
    
    if (data !== undefined && data !== null) {
      // If we got fresh data from the server, save it to the local vault
      setCachedData(data);
      localStorage.setItem(key, JSON.stringify(data));
    } else if (typeof window !== "undefined") {
      // If we are waiting or offline, check the local vault
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setCachedData(JSON.parse(saved));
        } catch (e) {
          console.error(`Failed to parse offline cache for ${queryName}`);
        }
      }
    }
  }, [data, queryName]);

  // Return fresh data if we have it, otherwise fallback to the cache
  return data !== undefined ? data : cachedData;
}