"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useGuestSession } from "@/hooks/useGuestSession";
import {
    loadFocusSettings,
    saveFocusSettings,
    FocusSettings,
    DEFAULT_FOCUS_SETTINGS,
} from "@/lib/focusSettings";

export type FocusMode = "work" | "short-break" | "long-break";

const SESSION_STATE_KEY = "fotion-focus-session-state";
const DAILY_STATS_KEY = "fotion-focus-daily-stats";

const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export function useFocusSession(focusedTasks: any[]) {
    const updateTask = useMutation(api.tasks.updateTask);
    const createTask = useMutation(api.tasks.createTask);
    const reorderTasksMutation = useMutation(api.tasks.reorderTasks);
    const logFocusSegment = useMutation(api.goalDetails.logFocusSegment);

    const guestSessionId = useGuestSession();

    const [focusSettings, setFocusSettings] = useState<FocusSettings>(DEFAULT_FOCUS_SETTINGS);
    const [overlayVisible, setOverlayVisible] = useState(false);

    const [isBreathingOpen, setIsBreathingOpen] = useState(false);
    const [isVisualFocusOpen, setIsVisualFocusOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isQueueMinimized, setIsQueueMinimized] = useState(focusedTasks.length === 0);
    const prevQueueLengthRef = useRef(focusedTasks.length);

    const [localQueue, setLocalQueue] = useState<any[]>([]);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [mode, setMode] = useState<FocusMode>("work");

    const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [completedToday, setCompletedToday] = useState<number>(0);

    const [isMicrobreakActive, setIsMicrobreakActive] = useState(false);
    const [microbreakTimeLeft, setMicrobreakTimeLeft] = useState(DEFAULT_FOCUS_SETTINGS.microbreakDurationSec || 5);
    const nextMicrobreakTimeRef = useRef<number | null>(null);

    const expectedEndTimeRef = useRef<number | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const hasRestoredRef = useRef(false);
    const completedTodayRef = useRef<number>(0);

    // Refs to provide latest values for the interval closure without needing them as dependencies
    const queueRef = useRef(localQueue);
    const activeTaskIdRef = useRef(activeTaskId);
    useEffect(() => { queueRef.current = localQueue; }, [localQueue]);
    useEffect(() => { activeTaskIdRef.current = activeTaskId; }, [activeTaskId]);

    // Load persisted settings once on mount.
    useEffect(() => {
        const loaded = loadFocusSettings();
        setFocusSettings(loaded);
        setMicrobreakTimeLeft(loaded.microbreakDurationSec || 5);
    }, []);

    const getModeDuration = useCallback(
        (targetMode: FocusMode, settings = focusSettings) => {
            switch (targetMode) {
                case "work":
                    return settings.workDurationMin * 60;
                case "short-break":
                    return settings.shortBreakDurationMin * 60;
                case "long-break":
                    return settings.longBreakDurationMin * 60;
            }
        },
        [focusSettings]
    );

    // Sync local queue from the `focusedTasks` prop.
    useEffect(() => {
        const sorted = [...focusedTasks].sort(
            (a, b) => (a.order ?? 999999) - (b.order ?? 999999)
        );
        setLocalQueue(sorted);
        if (prevQueueLengthRef.current > 0 && sorted.length === 0) {
            setIsQueueMinimized(true);
        }
        prevQueueLengthRef.current = sorted.length;
    }, [focusedTasks]);

    const updateCompletedToday = useCallback((newCount: number) => {
        const todayStr = getTodayDateString();
        setCompletedToday(newCount);
        completedTodayRef.current = newCount;
        try {
            localStorage.setItem(
                DAILY_STATS_KEY,
                JSON.stringify({ date: todayStr, count: newCount })
            );
        } catch (e) { }
    }, []);

    // Restore persisted state on first mount.
    useEffect(() => {
        if (typeof window === "undefined" || hasRestoredRef.current) return;
        hasRestoredRef.current = true;
        try {
            const todayStr = getTodayDateString();
            const savedDaily = localStorage.getItem(DAILY_STATS_KEY);
            if (savedDaily) {
                const parsedDaily = JSON.parse(savedDaily);
                if (parsedDaily.date === todayStr && typeof parsedDaily.count === "number") {
                    setCompletedToday(parsedDaily.count);
                    completedTodayRef.current = parsedDaily.count;
                } else {
                    localStorage.setItem(
                        DAILY_STATS_KEY,
                        JSON.stringify({ date: todayStr, count: 0 })
                    );
                }
            }

            const saved = localStorage.getItem(SESSION_STATE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (
                    parsed.mode &&
                    (parsed.mode === "work" ||
                        parsed.mode === "short-break" ||
                        parsed.mode === "long-break")
                ) {
                    setMode(parsed.mode as FocusMode);
                }
                if (parsed.activeTaskId) {
                    setActiveTaskId(parsed.activeTaskId);
                }
                if (typeof parsed.nextMicrobreakTime === "number") {
                    nextMicrobreakTimeRef.current = parsed.nextMicrobreakTime;
                }
                if (typeof parsed.isMicrobreakActive === "boolean") {
                    setIsMicrobreakActive(parsed.isMicrobreakActive);
                }
                if (typeof parsed.microbreakTimeLeft === "number") {
                    setMicrobreakTimeLeft(parsed.microbreakTimeLeft);
                }
                if (typeof parsed.isOpen === "boolean") {
                    setOverlayVisible(parsed.isOpen);
                }

                if (parsed.isRunning && parsed.expectedEndTime) {
                    const now = Date.now();
                    const remaining = Math.round((parsed.expectedEndTime - now) / 1000);
                    if (remaining > 0) {
                        setTimeLeft(remaining);
                        setIsRunning(true);
                        expectedEndTimeRef.current = parsed.expectedEndTime;
                    } else {
                        setTimeLeft(0);
                        setIsRunning(false);
                        expectedEndTimeRef.current = null;
                    }
                } else if (typeof parsed.timeLeft === "number") {
                    setTimeLeft(parsed.timeLeft);
                    setIsRunning(false);
                }
            } else {
                setTimeLeft(getModeDuration("work", loadFocusSettings()));
            }
        } catch (e) { }
    }, [getModeDuration]);

    // Persist session state on every meaningful change.
    useEffect(() => {
        if (typeof window === "undefined" || !hasRestoredRef.current) return;
        try {
            const stateToSave = {
                isOpen: overlayVisible,
                mode,
                timeLeft,
                isRunning,
                expectedEndTime: expectedEndTimeRef.current,
                nextMicrobreakTime: nextMicrobreakTimeRef.current,
                isMicrobreakActive,
                microbreakTimeLeft,
                activeTaskId,
                updatedAt: Date.now(),
            };
            localStorage.setItem(SESSION_STATE_KEY, JSON.stringify(stateToSave));
        } catch (e) { }
    }, [
        overlayVisible,
        mode,
        timeLeft,
        isRunning,
        isMicrobreakActive,
        microbreakTimeLeft,
        activeTaskId,
    ]);

    // Auto-select first queued task when overlay becomes visible.
    useEffect(() => {
        if (overlayVisible && localQueue.length > 0 && !activeTaskId) {
            setActiveTaskId(localQueue[0]._id);
        }
    }, [overlayVisible, localQueue, activeTaskId]);

    // ---- Audio ----
    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioContextCtor =
                window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioContextCtor();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") ctx.resume();

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        gainNode.gain.value = 0;
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.01);
    }, []);

    const playNote = useCallback(
        (
            ctx: AudioContext,
            freq: number,
            startTimeOffset: number,
            duration: number,
            maxVolume: number
        ) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = freq;
            const startTime = ctx.currentTime + startTimeOffset;
            gainNode.gain.setValueAtTime(0.001, startTime);
            gainNode.gain.linearRampToValueAtTime(maxVolume, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        },
        []
    );

    const playStartChime = useCallback(() => {
        try {
            if (!audioCtxRef.current) initAudio();
            const ctx = audioCtxRef.current!;
            if (ctx.state === "suspended") ctx.resume();
            playNote(ctx, 523.25, 0.0, 1.5, 0.2);
            playNote(ctx, 698.46, 0.15, 1.5, 0.2);
        } catch (error) { }
    }, [initAudio, playNote]);

    const playFinishChime = useCallback(() => {
        try {
            if (!audioCtxRef.current) initAudio();
            const ctx = audioCtxRef.current!;
            if (ctx.state === "suspended") ctx.resume();
            playNote(ctx, 523.25, 0.0, 3.0, 0.3);
            playNote(ctx, 659.25, 0.15, 3.0, 0.3);
            playNote(ctx, 783.99, 0.3, 3.0, 0.3);
            playNote(ctx, 987.77, 0.45, 4.0, 0.4);
        } catch (error) { }
    }, [initAudio, playNote]);

    const playMicrobreakSound = useCallback(
        (type: "start" | "pulse" | "end") => {
            try {
                if (!audioCtxRef.current) initAudio();
                const ctx = audioCtxRef.current!;
                if (ctx.state === "suspended") ctx.resume();
                const soundType = focusSettings.microbreakSound || "chime";

                if (soundType === "chime") {
                    if (type === "start") {
                        playNote(ctx, 659.25, 0.0, 1.2, 0.2);
                        playNote(ctx, 880.0, 0.1, 1.5, 0.25);
                    } else if (type === "pulse") {
                        playNote(ctx, 432.0, 0.0, 0.4, 0.06);
                    } else if (type === "end") {
                        playNote(ctx, 523.25, 0.0, 1.5, 0.2);
                        playNote(ctx, 659.25, 0.12, 1.5, 0.2);
                        playNote(ctx, 783.99, 0.24, 2.5, 0.25);
                    }
                } else if (soundType === "bell") {
                    if (type === "start") {
                        playNote(ctx, 216.0, 0.0, 2.5, 0.3);
                        playNote(ctx, 432.0, 0.05, 2.5, 0.15);
                    } else if (type === "pulse") {
                        playNote(ctx, 216.0, 0.0, 0.5, 0.04);
                    } else if (type === "end") {
                        playNote(ctx, 324.0, 0.0, 3.0, 0.3);
                    }
                } else if (soundType === "beep") {
                    if (type === "start") {
                        playNote(ctx, 1046.5, 0.0, 0.15, 0.15);
                        playNote(ctx, 1318.5, 0.15, 0.25, 0.15);
                    } else if (type === "pulse") {
                        playNote(ctx, 880.0, 0.0, 0.08, 0.04);
                    } else if (type === "end") {
                        playNote(ctx, 1318.5, 0.0, 0.15, 0.15);
                        playNote(ctx, 1567.98, 0.15, 0.3, 0.2);
                    }
                }
            } catch (e) { }
        },
        [focusSettings.microbreakSound, initAudio, playNote]
    );

    const scheduleNextMicrobreak = useCallback(
        (currentRemainingSeconds: number) => {
            if (!focusSettings.microbreaksEnabled || mode !== "work") {
                nextMicrobreakTimeRef.current = null;
                return;
            }
            const maxSec = focusSettings.microbreakMaxIntervalMin * 60;
            const minSec = 60;
            if (currentRemainingSeconds <= minSec + 15) return;
            const randomOffset = Math.floor(Math.random() * (maxSec - minSec)) + minSec;
            nextMicrobreakTimeRef.current = currentRemainingSeconds - randomOffset;
        },
        [focusSettings.microbreaksEnabled, focusSettings.microbreakMaxIntervalMin, mode]
    );

    const switchMode = useCallback(
        (newMode: FocusMode) => {
            setMode(newMode);
            setIsRunning(false);
            expectedEndTimeRef.current = null;
            setIsMicrobreakActive(false);
            setTimeLeft(getModeDuration(newMode));
        },
        [getModeDuration]
    );

    // Main tick interval.
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRunning) {
            if (
                mode === "work" &&
                focusSettings.microbreaksEnabled &&
                nextMicrobreakTimeRef.current === null
            ) {
                scheduleNextMicrobreak(timeLeft);
            }

            interval = setInterval(() => {
                if (expectedEndTimeRef.current) {
                    const now = Date.now();
                    const remainingSeconds = Math.round(
                        (expectedEndTimeRef.current - now) / 1000
                    );

                    if (remainingSeconds <= 0) {
                        setTimeLeft(0);
                        setIsRunning(false);
                        expectedEndTimeRef.current = null;
                        setIsMicrobreakActive(false);
                        playFinishChime();

                        if (mode === "work") {
                            // --- STAGE 2: LOG FOCUS SEGMENT ---
                            const durationSec = getModeDuration("work");
                            const currentActiveTask = queueRef.current.find(t => t._id === activeTaskIdRef.current);
                            logFocusSegment({
                                taskId: (activeTaskIdRef.current as Id<"tasks">) || undefined,
                                goalId: (currentActiveTask?.goalId as Id<"goals">) || undefined,
                                durationSec,
                                sessionId: guestSessionId ?? undefined,
                            }).catch(() => {});
                            // ----------------------------------

                            const newCount = completedTodayRef.current + 1;
                            updateCompletedToday(newCount);
                            if (newCount % focusSettings.longBreakInterval === 0) {
                                switchMode("long-break");
                            } else {
                                switchMode("short-break");
                            }
                        } else {
                            switchMode("work");
                        }
                    } else {
                        setTimeLeft(remainingSeconds);

                        if (
                            mode === "work" &&
                            focusSettings.microbreaksEnabled &&
                            !isMicrobreakActive &&
                            nextMicrobreakTimeRef.current !== null &&
                            remainingSeconds <= nextMicrobreakTimeRef.current
                        ) {
                            setIsMicrobreakActive(true);
                            setMicrobreakTimeLeft(focusSettings.microbreakDurationSec);
                            playMicrobreakSound("start");
                        }
                    }
                }
            }, 500);
        }

        return () => clearInterval(interval);
    }, [
        isRunning,
        mode,
        focusSettings,
        isMicrobreakActive,
        scheduleNextMicrobreak,
        playFinishChime,
        playMicrobreakSound,
        switchMode,
        timeLeft,
        updateCompletedToday,
        logFocusSegment,
        getModeDuration,
        guestSessionId,
    ]);

    // Microbreak countdown.
    useEffect(() => {
        if (!isMicrobreakActive) return;

        const interval = setInterval(() => {
            setMicrobreakTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setIsMicrobreakActive(false);
                    playMicrobreakSound("end");
                    scheduleNextMicrobreak(timeLeft);
                    return 0;
                }
                playMicrobreakSound("pulse");
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isMicrobreakActive, playMicrobreakSound, scheduleNextMicrobreak, timeLeft]);

    // ---- Public handlers ----
    const toggleTimer = useCallback(() => {
        initAudio();
        if (!isRunning) {
            playStartChime();
            expectedEndTimeRef.current = Date.now() + timeLeft * 1000;
            setIsRunning(true);
            if (mode === "work" && focusSettings.microbreaksEnabled) {
                scheduleNextMicrobreak(timeLeft);
            }
        } else {
            if (expectedEndTimeRef.current) {
                const now = Date.now();
                const remaining = Math.max(
                    0,
                    Math.round((expectedEndTimeRef.current - now) / 1000)
                );
                setTimeLeft(remaining);
            }
            setIsRunning(false);
            expectedEndTimeRef.current = null;
            setIsMicrobreakActive(false);
        }
    }, [
        initAudio,
        isRunning,
        timeLeft,
        mode,
        focusSettings.microbreaksEnabled,
        playStartChime,
        scheduleNextMicrobreak,
    ]);

    const resetTimer = useCallback(() => {
        setIsRunning(false);
        expectedEndTimeRef.current = null;
        setIsMicrobreakActive(false);
        setTimeLeft(getModeDuration(mode));
    }, [getModeDuration, mode]);

    const handleMarkDone = useCallback(
        (task: any) => {
            updateTask({ id: task._id, status: "done", completedAt: Date.now() });
            if (activeTaskId === task._id) setActiveTaskId(null);
        },
        [activeTaskId, updateTask]
    );

    const handleDragEnd = useCallback(
        (event: any) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
                setLocalQueue((items) => {
                    const oldIndex = items.findIndex((i) => i._id === active.id);
                    const newIndex = items.findIndex((i) => i._id === over.id);
                    const newQueue = [...items];
                    const [moved] = newQueue.splice(oldIndex, 1);
                    newQueue.splice(newIndex, 0, moved);
                    try {
                        reorderTasksMutation({
                            tasks: newQueue.map((t, idx) => ({ id: t._id, order: idx })),
                        });
                    } catch (e) { }
                    return newQueue;
                });
            }
        },
        [reorderTasksMutation]
    );

    const handleQuickAdd = useCallback(
        async (e: React.FormEvent, title: string, clearTitle: () => void) => {
            e.preventDefault();
            if (!title.trim()) return;
            try {
                await createTask({
                    title: title.trim(),
                    isUrgent: false,
                    isImportant: false,
                    isForFunsies: false,
                    isFocused: true,
                    sessionId: guestSessionId ?? undefined,
                    order: localQueue.length,
                });
                clearTitle();
            } catch (err) { }
        },
        [createTask, guestSessionId, localQueue.length]
    );

    const handleSaveSettings = useCallback(
        (newSettings: FocusSettings) => {
            // Only reset timeLeft if the CURRENT mode's duration actually changed.
            // Toggling microbreaks, changing sound, breathing color, etc. should
            // never touch the running timer.
            const prevDuration = getModeDuration(mode, focusSettings);
            const nextDuration = getModeDuration(mode, newSettings);

            setFocusSettings(newSettings);
            saveFocusSettings(newSettings);

            if (!isRunning && prevDuration !== nextDuration) {
                setTimeLeft(nextDuration);
            }
        },
        [focusSettings, getModeDuration, isRunning, mode]
    );

    const expand = useCallback(() => setOverlayVisible(true), []);
    const minimize = useCallback(() => setOverlayVisible(false), []);

    const endSession = useCallback(() => {
        setIsRunning(false);
        expectedEndTimeRef.current = null;
        setIsMicrobreakActive(false);
        setTimeLeft(getModeDuration(mode));
        setOverlayVisible(false);
        try {
            localStorage.removeItem(SESSION_STATE_KEY);
        } catch (e) { }
    }, [getModeDuration, mode]);

    const activeTask = localQueue.find((t) => t._id === activeTaskId);

    const shouldShowFloatingWidget =
        !overlayVisible && (isRunning || timeLeft !== getModeDuration(mode));

    return {
        // State
        focusSettings,
        overlayVisible,
        mode,
        timeLeft,
        isRunning,
        activeTaskId,
        activeTask,
        localQueue,
        completedToday,
        isMicrobreakActive,
        microbreakTimeLeft,
        isQueueMinimized,
        isBreathingOpen,
        isVisualFocusOpen,
        isSettingsOpen,
        shouldShowFloatingWidget,

        // Setters for UI-only toggles
        setIsQueueMinimized,
        setIsBreathingOpen,
        setIsVisualFocusOpen,
        setIsSettingsOpen,
        setActiveTaskId,
        setIsMicrobreakActive,

        // Handlers
        toggleTimer,
        resetTimer,
        switchMode,
        handleMarkDone,
        handleDragEnd,
        handleQuickAdd,
        handleSaveSettings,
        expand,
        minimize,
        endSession,
        getModeDuration,
    };
}

export type FocusSessionApi = ReturnType<typeof useFocusSession>;