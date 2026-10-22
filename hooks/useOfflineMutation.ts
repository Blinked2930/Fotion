"use client";

import { useEffect, useCallback, useState, useRef } from "react";
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

// Shallow clone so the queued args are insulated from caller-side mutation.
// JSON roundtrip preserves `null` (which matters for recurrence clearing) and
// drops `undefined` (same as Convex's own arg handling), so this is safe here.
const cloneArgs = (args: any) => {
  if (args === null || typeof args !== "object") return args;
  try {
    return JSON.parse(JSON.stringify(args));
  } catch {
    return { ...args };
  }
};

// Per-mutation-name flush lock so concurrent online events can't double-flush
// the same queue and duplicate network sends.
const FLUSH_LOCKS: Map<string, Promise<void>> = new Map();

const TASK_CACHE_KEY = "offline_cache_getTasks";

export function useOfflineSyncMutation(mutationFunc: any, mutationName: string) {
  const mutate = useMutation(mutationFunc);

  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  useEffect(() => {
    const key = `offline_queue_${mutationName}`;

    const flushQueue = async () => {
      const existing = FLUSH_LOCKS.get(key);
      if (existing) {
        await existing;
        return;
      }

      const run = (async () => {
        const queue = safeParse(localStorage.getItem(key));
        if (!queue || !Array.isArray(queue) || queue.length === 0) return;

        const failedQueue: any[] = [];
        for (const args of queue) {
          try {
            await mutateRef.current(args);
          } catch (err) {
            failedQueue.push(args);
          }
        }

        if (failedQueue.length === 0) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(failedQueue));
        }
      })();

      FLUSH_LOCKS.set(key, run);
      try {
        await run;
      } finally {
        FLUSH_LOCKS.delete(key);
      }
    };

    window.addEventListener('online', flushQueue);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== "undefined" && navigator.onLine) {
      timeoutId = setTimeout(flushQueue, 1500);
    }
    return () => {
      window.removeEventListener('online', flushQueue);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [mutationName]);

  const executeWithSync = useCallback(async (args: any) => {
    // 1. Optimistic UI: update the local cache so the app feels instant.
    if (
      mutationName === "createTask" ||
      mutationName === "updateTask" ||
      mutationName === "touchBaseTasks" ||
      mutationName === "deleteTask"
    ) {
      const tempId = generateTempId();
      const existingCache = safeParse(localStorage.getItem(TASK_CACHE_KEY)) || [];

      if (mutationName === "createTask") {
        const optimisticTask = {
          _id: tempId,
          _creationTime: Date.now(),
          status: "todo",
          ...args,
        };
        localStorage.setItem(TASK_CACHE_KEY, JSON.stringify([optimisticTask, ...existingCache]));
      } else if (mutationName === "updateTask") {
        const updated = existingCache.map((task: any) =>
          task._id === args.id
            ? { ...task, ...args, _id: task._id, _creationTime: task._creationTime }
            : task
        );
        localStorage.setItem(TASK_CACHE_KEY, JSON.stringify(updated));
      } else if (mutationName === "touchBaseTasks") {
        const idSet = new Set(args.taskIds || []);
        const nowTime = Date.now();
        const updated = existingCache.map((task: any) =>
          idSet.has(task._id) ? { ...task, lastContactedAt: nowTime } : task
        );
        localStorage.setItem(TASK_CACHE_KEY, JSON.stringify(updated));
      } else if (mutationName === "deleteTask") {
        const filtered = existingCache.filter((task: any) => task._id !== args.id);
        localStorage.setItem(TASK_CACHE_KEY, JSON.stringify(filtered));
      }

      window.dispatchEvent(new Event("offline_cache_updated"));

      if (typeof window !== "undefined" && !navigator.onLine) {
        const queueKey = `offline_queue_${mutationName}`;
        const queue = safeParse(localStorage.getItem(queueKey)) || [];
        queue.push(cloneArgs(args));
        localStorage.setItem(queueKey, JSON.stringify(queue));
        return mutationName === "createTask" ? tempId : args.id;
      }
      return mutateRef.current(args);
    }

    if (typeof window !== "undefined" && !navigator.onLine) {
      const queueKey = `offline_queue_${mutationName}`;
      const queue = safeParse(localStorage.getItem(queueKey)) || [];
      queue.push(cloneArgs(args));
      localStorage.setItem(queueKey, JSON.stringify(queue));
      return generateTempId();
    }
    return mutateRef.current(args);
  }, [mutationName]);

  return executeWithSync;
}

export function useOfflineQuery(queryFunc: any, args: any, queryName: string) {
  const cacheKey = `offline_cache_${queryName}`;
  
  // 1. Instantly load from local storage on mount (Zero load time)
  const [cachedData, setCachedData] = useState<any>(() => {
      if (typeof window === "undefined") return undefined;
      const saved = safeParse(localStorage.getItem(cacheKey));
      return saved || undefined;
  });
  
  const [isOffline, setIsOffline] = useState(false);
  const lastSerializedRef = useRef<string | null>(null);

  // 2. Fire the actual Convex server query in the background
  const data = useQuery(queryFunc, args === "skip" ? "skip" : args);

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

  // 3. When server responds with fresh data, update UI and overwrite cache
  useEffect(() => {
    if (data !== undefined && data !== null) {
      let serialized: string | null = null;
      try {
        serialized = JSON.stringify(data);
      } catch {
        serialized = null;
      }
      if (serialized !== null && serialized !== lastSerializedRef.current) {
        lastSerializedRef.current = serialized;
        setCachedData(data);
        localStorage.setItem(cacheKey, serialized);
      }
    }
  }, [data, cacheKey]);

  useEffect(() => {
    const loadCache = () => {
      const saved = safeParse(localStorage.getItem(cacheKey));
      if (saved) setCachedData(saved);
    };
    window.addEventListener('offline_cache_updated', loadCache);
    return () => window.removeEventListener('offline_cache_updated', loadCache);
  }, [cacheKey]);

  // Return server data if we have it, otherwise fallback to the instant local cache
  return data !== undefined ? data : cachedData;
}