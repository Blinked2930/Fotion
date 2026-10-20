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

  // Convex's useMutation returns a new function identity on every render.
  // Store it in a ref so the flush effect doesn't re-register on every render
  // and doesn't capture a stale `mutate`.
  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  useEffect(() => {
    const key = `offline_queue_${mutationName}`;

    const flushQueue = async () => {
      // Serialize flushes per mutation name.
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
    // 1. Optimistic UI: update the local task cache so the app feels instant.
    //    Only task mutations touch `offline_cache_getTasks`; other mutation
    //    names (createProject, etc.) skip this block.
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
        // Spread order matters: args (which may contain `null` for recurrence
        // clearing) overrides the existing task fields, but `_id` and
        // `_creationTime` are preserved.
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

      // 2. Network routing
      if (typeof window !== "undefined" && !navigator.onLine) {
        const queueKey = `offline_queue_${mutationName}`;
        const queue = safeParse(localStorage.getItem(queueKey)) || [];
        queue.push(cloneArgs(args));
        localStorage.setItem(queueKey, JSON.stringify(queue));
        return mutationName === "createTask" ? tempId : args.id;
      }
      return mutateRef.current(args);
    }

    // Non-task mutations (createProject, etc.)
    if (typeof window !== "undefined" && !navigator.onLine) {
      const queueKey = `offline_queue_${mutationName}`;
      const queue = safeParse(localStorage.getItem(queueKey)) || [];
      queue.push(cloneArgs(args));
      localStorage.setItem(queueKey, JSON.stringify(queue));
      // Return a temp id so callers like ProjectSelect can chain off it.
      return generateTempId();
    }
    return mutateRef.current(args);
  }, [mutationName]);

  return executeWithSync;
}

export function useOfflineQuery(queryFunc: any, args: any, queryName: string) {
  const data = useQuery(queryFunc, args === "skip" ? "skip" : args);
  const [cachedData, setCachedData] = useState<any>(undefined);
  const [isOffline, setIsOffline] = useState(false);
  const lastSerializedRef = useRef<string | null>(null);

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
    // Only cache non-null results. `null` is a legitimate Convex return for
    // "not found" (e.g. getTask for a deleted task), and caching it would
    // make the task-not-found UI show stale data when offline.
    if (!isOffline && data !== undefined && data !== null) {
      // Skip redundant localStorage writes while online: Convex returns a new
      // object identity on every tick, so a naive write would fire every render.
      let serialized: string | null = null;
      try {
        serialized = JSON.stringify(data);
      } catch {
        serialized = null;
      }
      if (serialized !== null && serialized !== lastSerializedRef.current) {
        lastSerializedRef.current = serialized;
        setCachedData(data);
        localStorage.setItem(key, serialized);
      }
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