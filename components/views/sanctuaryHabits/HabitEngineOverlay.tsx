"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Check, ArrowUp, ArrowDown, ShieldAlert, Award } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useOfflineSyncMutation, useOfflineQuery } from "@/hooks/useOfflineMutation";

import { SERIF } from "@/components/views/sanctuary/theme";
import { HabitEditorModal } from "@/components/views/sanctuaryHabits/HabitEditorModal";
import { WeeklySRBAIWizard } from "@/components/views/sanctuaryHabits/WeeklySRBAIWizard";

type HabitTab = "active" | "maintenance" | "queue" | "checkin";

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
  const [editor, setEditor] = useState<{ open: boolean; habit: any | null }>({
    open: false,
    habit: null,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("active");
      setEditor({ open: false, habit: null });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editor.open) setEditor({ open: false, habit: null });
        else if (activeTab !== "active") setActiveTab("active");
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, editor.open, activeTab, onClose]);

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
        status: values.status,
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

  const handleLog = async (habitId: Id<"habits">, threshold: "floor" | "target" | "grace_token_used", value: number) => {
    await logDailyHabit({
      habitId,
      dateStr: todayStr,
      value,
      threshold,
      sessionId: sessionId ?? undefined,
    });
  };

  const handleMoveQueue = async (index: number, direction: "up" | "down") => {
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
    `rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 ${
      activeTab === t ? "text-emerald-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"
    }`;

  const renderActiveRampUpView = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            System Ramp-Up Capacity
          </span>
          <h2 className={`${SERIF} text-2xl font-medium text-white`}>
            {rampUpHabits.length} / 2 Active Slot Limit
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Ego depletion protection limits concurrent habit installation to guarantee focus.
          </p>
        </div>

        {rampUpHabits.length >= 2 ? (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Capacity Reached. Graduate or Pause to add more.</span>
          </div>
        ) : (
          <button
            onClick={() => setEditor({ open: true, habit: null })}
            className="flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2.5 text-xs font-bold text-black shadow-lg hover:bg-emerald-300"
          >
            <Plus className="h-4 w-4" /> Install Habit
          </button>
        )}
      </div>

      {(["morning_grounding", "afternoon_focus", "night_wind_down", "standalone"] as const).map((anchor) => {
        const anchorHabits = rampUpHabits.filter((h) => h.contextAnchor === anchor);
        if (anchorHabits.length === 0) return null;

        const anchorLabels = {
          morning_grounding: "🌅 Morning Grounding",
          afternoon_focus: "⚡ Afternoon Focus",
          night_wind_down: "🌙 Night Wind Down",
          standalone: "⚓ Standalone Anchors",
        };

        return (
          <section key={anchor} className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {anchorLabels[anchor]}
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              {anchorHabits.map((habit) => {
                const todayLog = habit.todayLog;

                return (
                  <div
                    key={habit._id}
                    className="relative flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-white/20"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-zinc-300">
                          {habit.category}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-emerald-400">
                          <Award className="h-4 w-4" />
                          <span>{habit.consecutiveMaintenanceWeeks ?? 0}/5 Wks</span>
                        </div>
                      </div>

                      <h4 className={`${SERIF} mt-4 text-2xl font-medium text-white`}>{habit.title}</h4>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-black/40 p-3 text-xs">
                        <div className="border-r border-white/10 pr-2">
                          <span className="text-[10px] uppercase text-amber-400">Floor Tier</span>
                          <p className="font-semibold text-zinc-200">{habit.floorMetric?.description}</p>
                        </div>
                        <div className="pl-2">
                          <span className="text-[10px] uppercase text-emerald-400">Target Tier</span>
                          <p className="font-semibold text-zinc-200">{habit.targetMetric?.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            handleLog(habit._id, "floor", habit.floorMetric?.value ?? 1)
                          }
                          className={`rounded-2xl border py-2.5 text-xs font-semibold transition-all ${
                            todayLog?.threshold === "floor"
                              ? "border-amber-400 bg-amber-400/20 text-amber-300"
                              : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          ✓ Log Floor
                        </button>
                        <button
                          onClick={() =>
                            handleLog(habit._id, "target", habit.targetMetric?.value ?? 1)
                          }
                          className={`rounded-2xl border py-2.5 text-xs font-semibold transition-all ${
                            todayLog?.threshold === "target"
                              ? "border-emerald-400 bg-emerald-400/20 text-emerald-300"
                              : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          ★ Log Target
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                        <button
                          onClick={() => handleLog(habit._id, "grace_token_used", 0)}
                          disabled={habit.graceTokensRemaining <= 0}
                          className="hover:text-amber-400 disabled:opacity-30"
                        >
                          Use Grace Token ({habit.graceTokensRemaining} left)
                        </button>
                        <button
                          onClick={() => deleteHabit({ id: habit._id })}
                          className="hover:text-rose-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );

  const renderQueueView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`${SERIF} text-3xl font-medium text-white`}>Ranked Backlog Queue</h2>
          <p className="text-xs text-zinc-400">
            Prioritized pipeline waiting for open Ramp-Up capacity.
          </p>
        </div>
        <button
          onClick={() => setEditor({ open: true, habit: null })}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" /> Queue Habit
        </button>
      </div>

      {queuedHabits.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center text-zinc-500">
          No habits currently in queue backlog.
        </div>
      ) : (
        <div className="space-y-3">
          {queuedHabits.map((habit, idx) => (
            <div
              key={habit._id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-emerald-400">
                  #{idx + 1}
                </span>
                <div>
                  <h4 className="text-base font-semibold text-white">{habit.title}</h4>
                  <p className="text-xs text-zinc-400">{habit.category} • {habit.contextAnchor.replace("_", " ")}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMoveQueue(idx, "up")}
                  disabled={idx === 0}
                  className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/10 disabled:opacity-20"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleMoveQueue(idx, "down")}
                  disabled={idx === queuedHabits.length - 1}
                  className="rounded-lg border border-white/10 p-2 text-zinc-400 hover:bg-white/10 disabled:opacity-20"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                {rampUpHabits.length < 2 && (
                  <button
                    onClick={() => promoteQueuedHabit({ habitId: habit._id, sessionId: sessionId ?? undefined })}
                    className="ml-2 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-300"
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
      <h2 className={`${SERIF} text-3xl font-medium text-white`}>Graduated Baseline Systems</h2>
      <p className="text-xs text-zinc-400">
        Habits that have reached full automaticity (5+ consecutive qualifying weeks).
      </p>

      {maintenanceHabits.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center text-zinc-500">
          No graduated maintenance habits yet. Complete 5 consecutive weekly check-in evaluations to graduate.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {maintenanceHabits.map((habit) => (
            <div
              key={habit._id}
              className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-zinc-100"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[10px] font-bold text-emerald-300">
                  Graduated Baseline
                </span>
                <Check className="h-5 w-5 text-emerald-400" />
              </div>
              <h4 className={`${SERIF} mt-3 text-2xl font-medium text-white`}>{habit.title}</h4>
              <p className="mt-2 text-xs text-zinc-400">
                Target Maintenance: {habit.targetMetric?.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[240] animate-in fade-in duration-300">
      <div className="pointer-events-none absolute inset-0 bg-[#0a0b10]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_0%,rgba(16,185,129,0.15),transparent),radial-gradient(45%_40%_at_95%_8%,rgba(99,102,241,0.1),transparent)]" />

      <div className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-6xl flex-col">
        <div
          className="flex flex-wrap items-center justify-between gap-y-3 px-6 sm:px-10"
          style={{ paddingTop: "calc(var(--sat, 0px) + 1.5rem)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-400">
              Habit Engine
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <nav className="order-3 flex w-full items-center gap-6 text-xs font-medium sm:order-2 sm:w-auto">
            <button onClick={() => setActiveTab("active")} className={tabClass("active")}>
              Ramp-Up ({rampUpHabits.length}/2)
            </button>
            <button onClick={() => setActiveTab("queue")} className={tabClass("queue")}>
              Backlog Queue ({queuedHabits.length})
            </button>
            <button onClick={() => setActiveTab("maintenance")} className={tabClass("maintenance")}>
              Maintenance ({maintenanceHabits.length})
            </button>
            <button onClick={() => setActiveTab("checkin")} className={tabClass("checkin")}>
              Weekly Check-In
            </button>
          </nav>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-28 pt-8 sm:px-10">
          {activeTab === "active" && renderActiveRampUpView()}
          {activeTab === "queue" && renderQueueView()}
          {activeTab === "maintenance" && renderMaintenanceView()}
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

      {editor.open && (
        <HabitEditorModal
          initial={editor.habit}
          activeRampUpCount={rampUpHabits.length}
          onClose={() => setEditor({ open: false, habit: null })}
          onSave={handleSaveHabit}
        />
      )}
    </div>,
    document.body
  );
}