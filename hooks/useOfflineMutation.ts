"use client";

import { useEffect, useCallback, useState } from "react";
import { useMutation, useQuery } from "convex/react";

// Safe ID generator that never crashes on desktop or HTTP
const generateTempId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `temp_${crypto.randomUUID()}`;
  }
  return `temp_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
};

const safeParse = (str: string | null) => {
  if (!str || str === "undefined" || str === "null") return null;
  try { return JSON.parse(str); } catch (e) { return null; }
};

export function useOfflineSyncMutation(mutationFunc: any, mutationName: string) {
  const mutate = useMutation(mutationFunc);

  useEffect(() => {
    const flushQueue = async () => {
      const key = `offline_queue_${mutationName}`;
      const queue = safeParse(localStorage.getItem(key));
      
      if (queue && Array.isArray(queue) && queue.length > 0) {
        const failedQueue = [];
        
        for (const args of queue) {
          try {
            await mutate(args);
          } catch (err) {
            failedQueue.push(args); 
          }
        }
        
        if (failedQueue.length === 0) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(failedQueue));
        }
      }
    };

    window.addEventListener('online', flushQueue);
    if (typeof window !== "undefined" && navigator.onLine) {
      setTimeout(flushQueue, 1500); 
    }
    return () => window.removeEventListener('online', flushQueue);
  }, [mutate, mutationName]);

  const executeWithSync = useCallback(async (args: any) => {
    // 1. ALWAYS trigger Optimistic UI so the app feels instant
    const tempId = generateTempId();
    const cacheKey = "offline_cache_getTasks";
    let existingCache = safeParse(localStorage.getItem(cacheKey)) || [];

    if (mutationName === "createTask") {
      const optimisticTask = { _id: tempId, _creationTime: Date.now(), status: "todo", ...args };
      localStorage.setItem(cacheKey, JSON.stringify([optimisticTask, ...existingCache]));
      window.dispatchEvent(new Event("offline_cache_updated"));
    } else if (mutationName === "updateTask") {
      existingCache = existingCache.map((task: any) => task._id === args.id ? { ...task, ...args } : task);
      localStorage.setItem(cacheKey, JSON.stringify(existingCache));
      window.dispatchEvent(new Event("offline_cache_updated"));
    } else if (mutationName === "deleteTask") {
      existingCache = existingCache.filter((task: any) => task._id !== args.id);
      localStorage.setItem(cacheKey, JSON.stringify(existingCache));
      window.dispatchEvent(new Event("offline_cache_updated"));
    }

    // 2. Network Routing
    if (typeof window !== "undefined" && !navigator.onLine) {
      // True Offline: Save to local queue for later
      const key = `offline_queue_${mutationName}`;
      const queue = safeParse(localStorage.getItem(key)) || [];
      queue.push(args);
      localStorage.setItem(key, JSON.stringify(queue));
      return tempId;
    } else {
      // Online (or Lie-Fi): Let Convex handle the background sync
      return mutate(args);
    }
  }, [mutate, mutationName]);

  return executeWithSync;
}

export function useOfflineQuery(queryFunc: any, args: any, queryName: string) {
  const data = useQuery(queryFunc, args === "skip" ? "skip" : args);
  const [cachedData, setCachedData] = useState<any>(undefined);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const key = `offline_cache_${queryName}`;
    if (!isOffline && data !== undefined && data !== null) {
      setCachedData(data);
      localStorage.setItem(key, JSON.stringify(data));
    }
  }, [data, isOffline, queryName]);

  useEffect(() => {
    const loadCache = () => {
      const key = `offline_cache_${queryName}`;
      const saved = safeParse(localStorage.getItem(key));
      if (saved) setCachedData(saved);
    };
    
    loadCache(); 
    window.addEventListener('offline_cache_updated', loadCache); 
    return () => window.removeEventListener('offline_cache_updated', loadCache);
  }, [queryName]);

  return isOffline ? cachedData : (data !== undefined ? data : cachedData);
}