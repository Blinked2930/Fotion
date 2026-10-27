"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useOfflineSyncMutation, useOfflineQuery } from "@/hooks/useOfflineMutation";
import { getBrowserTimeZone } from "@/convex/recurrence";

import { GoalCard } from "@/components/views/sanctuary/GoalCard";
import { GoalChapter } from "@/components/views/sanctuary/GoalChapter";
import { GoalEditorModal, type GoalFormValues } from "@/components/views/sanctuary/GoalEditorModal";
import { SanctuaryConfirmModal } from "@/components/views/sanctuary/SanctuaryConfirmModal";
import { SERIF, SOFT_GOAL_CAP, needsReview } from "@/components/views/sanctuary/theme";

import { AlignScreen } from "@/components/views/sanctuary/AlignScreen";
import { CheckInWizard } from "@/components/views/sanctuary/CheckInWizard";

type SanctuaryTab = "goals" | "align" | "checkin";

export function GoalSanctuaryOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const sessionId = useGuestSession();
  const goals: any[] =
    useOfflineQuery(api.goals.getGoals, { sessionId: sessionId ?? undefined }, "getGoals") || [];

  const createGoal = useOfflineSyncMutation(api.goals.createGoal, "createGoal");
  const updateGoal = useOfflineSyncMutation(api.goals.updateGoal, "updateGoal");
  const deleteGoal = useOfflineSyncMutation(api.goals.deleteGoal, "deleteGoal");
  const createPlanAndTask = useOfflineSyncMutation(
    api.goalDetails.createPlanAndTask,
    "createPlanAndTask"
  );

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SanctuaryTab>("goals");
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; goal: any | null }>({
    open: false,
    goal: null,
  });
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setOpenGoalId(null);
      setEditor({ open: false, goal: null });
      setPendingDelete(null);
      setActiveTab("goals");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pendingDelete) setPendingDelete(null);
      else if (editor.open) setEditor({ open: false, goal: null });
      else if (openGoalId) setOpenGoalId(null);
      else if (activeTab !== "goals") setActiveTab("goals");
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, editor.open, openGoalId, pendingDelete, activeTab, onClose]);

  if (!isOpen || !mounted) return null;

  const activeGoals = goals.filter((g) => !g.status || g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const dueCount = activeGoals.filter(needsReview).length;
  const openGoal = openGoalId ? goals.find((g) => g._id === openGoalId) : null;

  const handleSave = async (v: GoalFormValues) => {
    if (editor.goal) {
      await updateGoal({
        id: editor.goal._id as Id<"goals">,
        title: v.title,
        description: v.description,
        targetDate: v.targetDate,
        category: v.category,
        color: v.color,
        reviewCycle: v.reviewCycle,
      });
      setEditor({ open: false, goal: null });
      return;
    }

    const newGoalId = await createGoal({
      title: v.title,
      description: v.description || undefined,
      targetDate: v.targetDate,
      category: v.category,
      color: v.color,
      reviewCycle: v.reviewCycle,
      kind: v.kind,
      sessionId: sessionId ?? undefined,
    });

    if (v.initialPlan && newGoalId) {
      try {
        await createPlanAndTask({
          goalId: newGoalId as Id<"goals">,
          trigger: v.initialPlan.trigger,
          action: v.initialPlan.action,
          makeRepeat: v.initialPlan.makeRepeat,
          tz: getBrowserTimeZone(),
          sessionId: sessionId ?? undefined,
        });
      } catch (err) {
        console.error("Could not save initial plan:", err);
      }
    }

    setEditor({ open: false, goal: null });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteGoal({ id: pendingDelete._id as Id<"goals"> });
    } catch (err) {
      console.error("Could not delete goal:", err);
    } finally {
      setPendingDelete(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[240] animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-[#f6f2ea] dark:bg-[#0c0c12]" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_0%,rgba(99,102,241,0.16),transparent),radial-gradient(45%_40%_at_95%_8%,rgba(236,72,153,0.11),transparent)]" />

      <div className="relative mx-auto flex h-[100dvh] w-full max-w-6xl flex-col">
        {/* Top bar with quiet text tabs */}
        <div className="flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-9">
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-500 dark:text-zinc-400">
              The Sanctuary
            </span>
            
            {!openGoal && (
              <div className="flex items-center gap-4 text-[13px] font-medium">
                <button
                  onClick={() => setActiveTab("goals")}
                  className={`transition-colors ${activeTab === "goals" ? "text-[var(--foreground)]" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
                >
                  Goals
                </button>
                <button
                  onClick={() => setActiveTab("align")}
                  className={`transition-colors ${activeTab === "align" ? "text-[var(--foreground)]" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
                >
                  Align
                </button>
                <button
                  onClick={() => setActiveTab("checkin")}
                  className={`transition-colors ${activeTab === "checkin" ? "text-[var(--foreground)]" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
                >
                  Check-in
                </button>
              </div>
            )}
          </div>
          
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Sanctuary"
            className="rounded-full p-3 text-zinc-500 transition-all hover:bg-black/5 hover:text-[var(--foreground)] active:scale-95 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-28 pt-8 sm:px-10">
          {openGoal ? (
            <GoalChapter
              goal={openGoal}
              tasks={[]}
              onBack={() => setOpenGoalId(null)}
              onEdit={() => setEditor({ open: true, goal: openGoal })}
              onMarkReviewed={() =>
                updateGoal({
                  id: openGoal._id as Id<"goals">,
                  lastReviewedAt: Date.now(),
                })
              }
              sessionId={sessionId ?? undefined}
            />
          ) : activeTab === "goals" ? (
            <div className="animate-in fade-in duration-500">
              <header className="max-w-3xl">
                <h1
                  className={`${SERIF} text-5xl font-medium leading-[1.04] tracking-tight text-[var(--foreground)] sm:text-7xl`}
                >
                  Where you&rsquo;re headed.
                </h1>
                <p className="mt-5 text-[15px] text-zinc-500 dark:text-zinc-400">
                  {activeGoals.length === 0
                    ? "Nothing here yet. Start with the one that matters most."
                    : `${activeGoals.length} active ${activeGoals.length === 1 ? "goal" : "goals"}`}
                  {dueCount > 0 && (
                    <span className="ml-3 inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                      {dueCount} due for review
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setEditor({ open: true, goal: null })}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-[var(--background)] shadow-lg transition-all hover:opacity-90 active:scale-95"
                >
                  <Plus className="h-4 w-4" /> New goal
                </button>
                {activeGoals.length > SOFT_GOAL_CAP && (
                  <p className={`${SERIF} mt-5 text-[15px] italic text-zinc-500`}>
                    You&rsquo;re holding {activeGoals.length} goals. A shorter list leaves each one more room.
                  </p>
                )}
              </header>

              {activeGoals.length === 0 ? (
                <div className="mx-auto mt-20 flex max-w-md flex-col items-center text-center">
                  <Sparkles className="h-8 w-8 text-zinc-400" />
                  <p className={`${SERIF} mt-5 text-2xl italic text-zinc-600 dark:text-zinc-300`}>
                    What would make this year count?
                  </p>
                </div>
              ) : (
                <div className="mt-14 grid gap-6 lg:grid-cols-2">
                  {activeGoals.map((goal, i) => (
                    <GoalCard
                      key={goal._id}
                      goal={goal}
                      index={i}
                      onOpen={() => setOpenGoalId(goal._id)}
                      onEdit={() => setEditor({ open: true, goal })}
                      onDelete={() => setPendingDelete(goal)}
                    />
                  ))}
                </div>
              )}

              {completedGoals.length > 0 && (
                <section className="mt-16 border-t border-black/[0.07] pt-8 dark:border-white/10">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    Completed
                  </h3>
                  <ul className="mt-4 space-y-2">
                    {completedGoals.map((g) => (
                      <li
                        key={g._id}
                        className={`${SERIF} text-lg text-zinc-500 line-through decoration-zinc-400/50`}
                      >
                        {g.title}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : activeTab === "align" ? (
            <AlignScreen sessionId={sessionId ?? undefined} />
          ) : (
            <CheckInWizard 
              sessionId={sessionId ?? undefined} 
              goals={activeGoals} 
              onFinish={() => setActiveTab("goals")} 
            />
          )}
        </div>
      </div>

      {editor.open && (
        <GoalEditorModal
          initial={editor.goal}
          onClose={() => setEditor({ open: false, goal: null })}
          onSave={handleSave}
        />
      )}

      {pendingDelete && (
        <SanctuaryConfirmModal
          title="Delete this goal?"
          body={
            <span>
              <em>{pendingDelete.title}</em> and its milestones, plans, and check-ins will be
              removed. Linked tasks and projects stay, but lose their tie to this goal.
            </span>
          }
          confirmLabel="Delete goal"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>,
    document.body
  );
}