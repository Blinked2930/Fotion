"use client";

import { useEffect, useCallback } from "react";
import { useMutation } from "convex/react";

/**
 * A wrapper around Convex's useMutation that queues requests in localStorage
 * when the user is offline, and flushes them when they come back online.
 */
export function useOfflineSyncMutation(mutationFunc: any, mutationName: string) {
  const mutate = useMutation(mutationFunc);

  // 1. Flush queue when coming back online
  useEffect(() => {
    const flushQueue = async () => {
      const key = `offline_queue_${mutationName}`;
      const queueRaw = localStorage.getItem(key);
      if (queueRaw) {
        try {
          const queue = JSON.parse(queueRaw);
          for (const args of queue) {
            try {
              // Fire off the cached mutation
              await mutate(args);
            } catch (err) {
              console.error(`Failed to flush ${mutationName}:`, err);
            }
          }
          // Clear the queue after successful flush
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`Failed to parse offline queue for ${mutationName}`);
        }
      }
    };

    window.addEventListener('online', flushQueue);
    
    // Also try to flush on mount just in case they were offline, closed the app, 
    // and reopened it while online.
    if (typeof window !== "undefined" && navigator.onLine) {
      flushQueue();
    }

    return () => window.removeEventListener('online', flushQueue);
  }, [mutate, mutationName]);

  // 2. Intercept mutation calls
  const executeWithSync = useCallback(async (args: any) => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      // Offline: Add to local storage queue
      const key = `offline_queue_${mutationName}`;
      const queue = JSON.parse(localStorage.getItem(key) || "[]");
      queue.push(args);
      localStorage.setItem(key, JSON.stringify(queue));
      
      // Return a fake, temporary ID so the UI can proceed optimistically
      return `temp_offline_${crypto.randomUUID()}`;
    } else {
      // Online: Execute normally
      return await mutate(args);
    }
  }, [mutate, mutationName]);

  return executeWithSync;
}