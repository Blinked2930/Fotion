"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Check, ArrowUp, ArrowDown, ShieldAlert, Award, AlertTriangle, Flame, TrendingUp, Calendar, Zap, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useOfflineSyncMutation, useOfflineQuery } from "@/hooks/useOfflineMutation";

import { SERIF } from "@/components/views/sanctuary/theme";
import { HabitEditorModal } from "@/components/views/sanctuaryHabits/HabitEditorModal";
import { WeeklySRBAIWizard } from "@/components/views/sanctuaryHabits/WeeklySRBAIWizard";

type HabitTab = "active" | "maintenance" | "queue" | "stats" | "checkin";

export function HabitEngineOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const sessionId = useGuestSession();
  const habits: any[] =
    useOfflineQuery(api.habits.getHabits, { sessionId: sessionId ?? undefined }, "getHabits") || [];

  const createHabit = useOfflineSyncMutation(api.habits.createHabit, "createHabit");
  const updateHabitStatus = useOfflineSyncMutation(api.habits.updateHabitStatus, "updateHabitStatus");
  const logDailyHabit = useOfflineSyncMutation(api.habits.logDailyHabit, "logDailyHabit");
  const submitWeeklyCheckIn = useOfflineSyncMutation(api.habits.submitWeeklyCheckIn, "submitWeeklyCheckIn");
  const reorderQueue = useOfflineSyncMutation(api.habits.reorderQueue, "reorderQueue");
  const promoteQueuedHabit = useOfflineSyncMutation(api.habits.promoteQueuedHabit, "promoteQueuedHabit");
  const deleteHabit = useOfflineSyncMutation(api.habits.deleteHabit, "deleteHabit");

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<HabitTab>("active");
  const [editor, setEditor] = useState<{
    open: boolean;
    habit: any | null;
    defaultAnchor?: string;
    defaultStatus?: "queued" | "ramp_up" | "maintenance" | "paused";
  }>({
    open: false,
    habit: null,
  });

  const [deletingHabitId, setDeletingHabitId] = useState<Id<"habits"> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("active");
      setEditor({ open: false, habit: null });
      setDeletingHabitId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editor.open) setEditor({ open: false, habit: null });
        else if (deletingHabitId) setDeletingHabitId(null);
        else if (activeTab !== "active") setActiveTab("active");
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, editor.open, deletingHabitId, activeTab, onClose]);

  if (!isOpen || !mounted) return null;

  const rampUpHabits = habits.filter((h) => h.status === "ramp_up");
  const maintenanceHabits = habits.filter((h) => h.status === "maintenance");
  const queuedHabits = habits
    .filter((h) => h.status === "queued")
    .sort((a, b) => (a.queueRank ?? 99) - (b.queueRank ?? 99));

  const todayStr = new Date().toISOString().split("T")[0];

  const handleSaveHabit = async (values: any) => {
    if (editor.habit) {
      await updateHabitStatus({
        id: editor.habit._id as Id<"habits">,
        title: values.title,
        category: values.category,
        status: values.status,
        contextAnchor: values.contextAnchor,
        customAnchorDetail: values.customAnchorDetail,
        floorMetric: values.floorMetric,
        targetMetric: values.targetMetric,
        weeklyGraceTokens: values.weeklyGraceTokens,
        sessionId: sessionId ?? undefined,
      });
    } else {
      await createHabit({
        ...values,
        sessionId: sessionId ?? undefined,
      });
    }
    setEditor({ open: false, habit: null });
  };

  const handleLogToggle = async (habit: any, threshold: "floor" | "target", e: React.MouseEvent) => {
    e.stopPropagation();
    const isAlreadyLogged = habit.todayLog?.threshold === threshold;
    const metricVal = threshold === "floor" ? habit.floorMetric?.value : habit.targetMetric?.value;

    await logDailyHabit({
      habitId: habit._id,
      dateStr: todayStr,
      value: isAlreadyLogged ? 0 : metricVal ?? 1,
      threshold: isAlreadyLogged ? "missed" : threshold,
      sessionId: sessionId ?? undefined,
    });
  };

  const handleMoveQueue = async (index: number, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const newQueue = [...queuedHabits];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newQueue.length) return;
    const temp = newQueue[index];
    newQueue[index] = newQueue[targetIdx];
    newQueue[targetIdx] = temp;

    await reorderQueue({
      orderedHabitIds: newQueue.map((h) => h._id as Id<"habits">),
    });
  };

  const tabClass = (t: HabitTab) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold outline-none transition-colors ${
      activeTab === t
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        : "text-zinc-500 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-white/5"
    }`;

  const renderActiveRampUpView = () => (
    <div className="space-y-8 animate-in fade-in">
      {/* Capacity Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[var(--border)] bg-zinc-50 dark:bg-white/[0.02] p-6 backdrop-blur-md">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            System Ramp-Up Capacity
          </span>
          <h2 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>
            {rampUpHabits.length} / 2 Active Slot Limit
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Ego depletion protection limits concurrent habit installation to guarantee focus.
          </p>
        </div>

        {rampUpHabits.length >= 2 ? (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-600 dark:text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Capacity Reached. Graduate or Pause to add more.</span>
          </div>
        ) : (
          <button
            onClick={() => setEditor({ open: true, habit: null })}
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-xs font-bold text-white dark:text-black shadow-lg hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" /> Install Habit
          </button>
        )}
      </div>

      {rampUpHabits.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.02] p-12 text-center text-zinc-500">
          No active habits currently installing in Ramp-Up. Click "+ Install Habit" to start.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {rampUpHabits.map((habit) => {
            const todayLog = habit.todayLog;

            return (
              <div
                key={habit._id}
                onClick={() => setEditor({ open: true, habit })}
                className="relative flex flex-col justify-between rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.03] p-6 transition-all hover:border-emerald-500/50 shadow-sm cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-zinc-100 dark:bg-white/10 px-3 py-1 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 border border-[var(--border)]">
                        {habit.category}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-500/20">
                        ⚓ {habit.contextAnchor}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <Award className="h-4 w-4" />
                      <span>{habit.consecutiveMaintenanceWeeks ?? 0}/5 Weeks</span>
                    </div>
                  </div>

                  <h4 className={`${SERIF} mt-4 text-2xl font-medium text-[var(--foreground)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors`}>
                    {habit.title}
                  </h4>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-zinc-50 dark:bg-black/40 p-3 text-xs border border-[var(--border)]">
                    <div className="border-r border-[var(--border)] pr-2">
                      <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Floor Tier</span>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{habit.floorMetric?.description}</p>
                    </div>
                    <div className="pl-2">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Target Tier</span>
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{habit.targetMetric?.description}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => handleLogToggle(habit, "floor", e)}
                      className={`rounded-2xl border py-2.5 text-xs font-semibold transition-all ${
                        todayLog?.threshold === "floor"
                          ? "border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-300"
                          : "border-[var(--border)] bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"
                      }`}
                    >
                      {todayLog?.threshold === "floor" ? "✓ Floor Logged" : "Log Floor"}
                    </button>
                    <button
                      onClick={(e) => handleLogToggle(habit, "target", e)}
                      className={`rounded-2xl border py-2.5 text-xs font-semibold transition-all ${
                        todayLog?.threshold === "target"
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                          : "border-[var(--border)] bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10"
                      }`}
                    >
                      {todayLog?.threshold === "target" ? "★ Target Logged" : "Log Target"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                    <span className="text-zinc-400">Click card to edit</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingHabitId(habit._id);
                      }}
                      className="hover:text-rose-500 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStatsView = () => {
    // Generate past 7 days for the completion heatmaps
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: d.toISOString().split("T")[0],
        dayLabel: d.toLocaleDateString("en-US", { weekday: "short" }),
      };
    });

    return (
      <div className="space-y-8 animate-in fade-in">
        {/* KPI Scorecard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.03] p-5 text-center shadow-sm">
            <Zap className="mx-auto h-5 w-5 text-emerald-500 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Ramp-Up Active</span>
            <div className={`${SERIF} text-3xl font-bold mt-1 text-emerald-500`}>{rampUpHabits.length} / 2</div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.03] p-5 text-center shadow-sm">
            <ShieldCheck className="mx-auto h-5 w-5 text-blue-500 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Graduated Baselines</span>
            <div className={`${SERIF} text-3xl font-bold mt-1 text-blue-500`}>{maintenanceHabits.length}</div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.03] p-5 text-center shadow-sm">
            <TrendingUp className="mx-auto h-5 w-5 text-purple-500 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Queued Backlog</span>
            <div className={`${SERIF} text-3xl font-bold mt-1 text-purple-500`}>{queuedHabits.length}</div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.03] p-5 text-center shadow-sm">
            <Calendar className="mx-auto h-5 w-5 text-amber-500 mb-1" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">System Capacity</span>
            <div className={`${SERIF} text-3xl font-bold mt-1 text-amber-500`}>
              {Math.round(((rampUpHabits.length + maintenanceHabits.length) / Math.max(1, habits.length)) * 100)}%
            </div>
          </div>
        </div>

        {/* Ramp-Up Automaticity Gauges & Visual Progress */}
        <div className="rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.03] p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <h3 className={`${SERIF} text-xl font-medium text-[var(--foreground)]`}>
                Active Ramp-Up Automaticity Trajectory
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Targeting 5 consecutive qualifying weeks (SRBAI &ge; 5.5/7, Effort &le; 3/10) to reach graduation.
              </p>
            </div>
          </div>

          {rampUpHabits.length === 0 ? (
            <div className="text-xs text-zinc-400 py-6 text-center">No active ramp-up habits currently installing.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {rampUpHabits.map((h) => {
                const streak = h.consecutiveMaintenanceWeeks ?? 0;
                const progressPct = Math.min(100, (streak / 5) * 100);

                return (
                  <div key={h._id} className="rounded-2xl border border-[var(--border)] bg-zinc-50 dark:bg-black/30 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-base text-[var(--foreground)]">{h.title}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          ⚓ {h.contextAnchor}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-emerald-500">{progressPct}%</span>
                        <div className="text-[10px] text-zinc-400">Graduation Level</div>
                      </div>
                    </div>

                    {/* 5-Week Streak Block Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                        <span>5-Week Streak Progress</span>
                        <span>{streak} / 5 Weeks</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[1, 2, 3, 4, 5].map((w) => (
                          <div
                            key={w}
                            className={`h-3 rounded-md transition-all ${
                              w <= streak
                                ? "bg-emerald-500 shadow-md shadow-emerald-500/30"
                                : "bg-zinc-200 dark:bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs text-zinc-500">
                      <span>Weekly Grace Tokens:</span>
                      <span className="font-bold text-[var(--foreground)]">{h.graceTokensRemaining ?? 2} / {h.weeklyGraceTokens ?? 2} Left</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 7-Day Completion Heatmap / Activity Grid */}
        <div className="rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.03] p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <h3 className={`${SERIF} text-xl font-medium text-[var(--foreground)]`}>
                7-Day Completion Matrix
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Visual log activity across all habits over the last 7 calendar days.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Target</span>
              <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Floor</span>
              <span className="flex items-center gap-1"><div className="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-white/10" /> Missed</span>
            </div>
          </div>

          <div className="space-y-4">
            {habits.map((h) => (
              <div key={h._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-zinc-50 dark:bg-black/20">
                <div>
                  <h4 className="font-semibold text-sm text-[var(--foreground)]">{h.title}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {h.status.replace("_", " ")} • {h.category}
                  </span>
                </div>

                {/* 7-Day Dots */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {past7Days.map((day) => {
                    const isToday = day.dateStr === todayStr;
                    const log = isToday ? h.todayLog : null; // simplified daily representation

                    return (
                      <div key={day.dateStr} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-semibold text-zinc-400 uppercase">{day.dayLabel}</span>
                        <div
                          className={`h-7 w-7 sm:h-8 sm:w-8 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all ${
                            log?.threshold === "target"
                              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                              : log?.threshold === "floor"
                              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                              : "bg-zinc-200 dark:bg-white/10 text-zinc-400"
                          }`}
                        >
                          {log?.threshold === "target" ? "★" : log?.threshold === "floor" ? "✓" : "•"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderQueueView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`${SERIF} text-3xl font-medium text-[var(--foreground)]`}>Ranked Backlog Queue</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Prioritized pipeline waiting for open Ramp-Up capacity.
          </p>
        </div>
        <button
          onClick={() => setEditor({ open: true, habit: null, defaultStatus: "queued" })}
          className="flex items-center gap-2 rounded-full bg-emerald-500 text-white dark:bg-white dark:text-black px-5 py-2.5 text-xs font-bold hover:bg-emerald-400 dark:hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" /> Queue Habit
        </button>
      </div>

      {queuedHabits.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.02] p-12 text-center text-zinc-500">
          No habits currently in queue backlog.
        </div>
      ) : (
        <div className="space-y-3">
          {queuedHabits.map((habit, idx) => (
            <div
              key={habit._id}
              onClick={() => setEditor({ open: true, habit })}
              className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-white dark:bg-white/[0.03] p-4 shadow-sm cursor-pointer hover:border-emerald-500/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  #{idx + 1}
                </span>
                <div>
                  <h4 className="text-base font-semibold text-[var(--foreground)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {habit.title}
                  </h4>
                  <p className="text-xs text-zinc-500">{habit.category} • {habit.contextAnchor}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleMoveQueue(idx, "up", e)}
                  disabled={idx === 0}
                  className="rounded-lg border border-[var(--border)] p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-20"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => handleMoveQueue(idx, "down", e)}
                  disabled={idx === queuedHabits.length - 1}
                  className="rounded-lg border border-[var(--border)] p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-20"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                {rampUpHabits.length < 2 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      promoteQueuedHabit({ habitId: habit._id, sessionId: sessionId ?? undefined });
                    }}
                    className="ml-2 rounded-xl bg-emerald-500 text-white dark:bg-emerald-400 dark:text-black px-4 py-2 text-xs font-bold hover:bg-emerald-400"
                  >
                    Promote Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderMaintenanceView = () => (
    <div className="space-y-6 animate-in fade-in">
      <h2 className={`${SERIF} text-3xl font-medium text-[var(--foreground)]`}>Graduated Baseline Systems</h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Habits that have reached full automaticity (5+ consecutive qualifying weeks). Click any habit to edit.
      </p>

      {maintenanceHabits.length === 0 ? (
        <div className="rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.02] p-12 text-center text-zinc-500">
          No graduated maintenance habits yet. Complete 5 consecutive weekly check-in evaluations to graduate.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {maintenanceHabits.map((habit) => (
            <div
              key={habit._id}
              onClick={() => setEditor({ open: true, habit })}
              className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-[var(--foreground)] cursor-pointer hover:border-emerald-500/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
                  Graduated Baseline
                </span>
                <Check className="h-5 w-5 text-emerald-500" />
              </div>
              <h4 className={`${SERIF} mt-3 text-2xl font-medium text-[var(--foreground)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors`}>
                {habit.title}
              </h4>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Target Maintenance: {habit.targetMetric?.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[240] animate-in fade-in duration-300 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-6xl h-[90vh] flex flex-col rounded-3xl border border-[var(--border)] bg-white dark:bg-[#0a0b10] text-[var(--foreground)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Header with right-aligned Close X */}
        <div className="flex items-center justify-between px-6 sm:px-10 border-b border-[var(--border)] pb-4 pt-6">
          <div className="flex items-center gap-3">
            <Flame className="h-5 w-5 text-emerald-500" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-600 dark:text-emerald-400">
              Habit Engine
            </span>
          </div>

          <nav className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
            <button onClick={() => setActiveTab("active")} className={tabClass("active")}>
              Ramp-Up ({rampUpHabits.length}/2)
            </button>
            <button onClick={() => setActiveTab("queue")} className={tabClass("queue")}>
              Queue ({queuedHabits.length})
            </button>
            <button onClick={() => setActiveTab("maintenance")} className={tabClass("maintenance")}>
              Maintenance ({maintenanceHabits.length})
            </button>
            <button onClick={() => setActiveTab("stats")} className={tabClass("stats")}>
              Statistics
            </button>
            <button onClick={() => setActiveTab("checkin")} className={tabClass("checkin")}>
              Weekly Check-In
            </button>
          </nav>

          <button
            onClick={onClose}
            type="button"
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-20 pt-6 sm:px-10">
          {activeTab === "active" && renderActiveRampUpView()}
          {activeTab === "queue" && renderQueueView()}
          {activeTab === "maintenance" && renderMaintenanceView()}
          {activeTab === "stats" && renderStatsView()}
          {activeTab === "checkin" && (
            <WeeklySRBAIWizard
              habits={habits}
              onCheckInSubmit={(data) =>
                submitWeeklyCheckIn({
                  ...data,
                  habitId: data.habitId as Id<"habits">,
                  sessionId: sessionId ?? undefined,
                })
              }
              onPromoteQueued={(habitId) =>
                promoteQueuedHabit({
                  habitId: habitId as Id<"habits">,
                  sessionId: sessionId ?? undefined,
                })
              }
              onFinish={() => setActiveTab("active")}
            />
          )}
        </div>
      </div>

      {/* Habit Editor Modal with Delete trigger */}
      {editor.open && (
        <HabitEditorModal
          initial={editor.habit}
          defaultAnchor={editor.defaultAnchor}
          defaultStatus={editor.defaultStatus}
          activeRampUpCount={rampUpHabits.length}
          onClose={() => setEditor({ open: false, habit: null })}
          onSave={handleSaveHabit}
          onDelete={() => {
            const habitId = editor.habit?._id;
            setEditor({ open: false, habit: null });
            if (habitId) setDeletingHabitId(habitId);
          }}
        />
      )}

      {/* Theme-Matched Delete Confirmation Modal */}
      {deletingHabitId && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setDeletingHabitId(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-[var(--border)] bg-white dark:bg-[#181922] p-6 shadow-2xl text-[var(--foreground)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
              <h3 className={`${SERIF} text-lg font-bold`}>Delete Habit System?</h3>
            </div>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to delete this habit? All recorded daily logs and automaticity check-in histories will be permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingHabitId(null);
                }}
                className="rounded-full px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await deleteHabit({ id: deletingHabitId });
                  setDeletingHabitId(null);
                }}
                className="rounded-full bg-rose-500 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-600"
              >
                Delete Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}