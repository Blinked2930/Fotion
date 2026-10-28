"use client";

import { useState } from "react";
import {
  Check,
  Plus,
  Trash2,
  Folder,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { TaskCard } from "@/components/ui/TaskCard";
import { useOfflineSyncMutation } from "@/hooks/useOfflineMutation";
import { getBrowserTimeZone } from "@/convex/recurrence";
import {
  SERIF,
  describeHorizon,
  describeReview,
  goalHex,
  needsReview,
  SCALE_PROMPTS,
  formatMinutes,
} from "./theme";
import { CheckInSection } from "./CheckInSection";

export function GoalChapter({
  goal,
  tasks,
  onBack,
  onEdit,
  onMarkReviewed,
  sessionId,
}: {
  goal: any;
  tasks: any[];
  onBack: () => void;
  onEdit: () => void;
  onMarkReviewed: () => void;
  sessionId?: string;
}) {
  const details = useQuery(api.goalDetails.getGoalDetails, {
    goalId: goal._id,
    sessionId: sessionId,
  });

  const updateGoal = useOfflineSyncMutation(api.goals.updateGoal, "updateGoal");
  const createPlanAndTask = useOfflineSyncMutation(
    api.goalDetails.createPlanAndTask,
    "createPlanAndTask"
  );
  const deletePlan = useOfflineSyncMutation(api.goalDetails.deletePlan, "deletePlan");
  const createMilestone = useOfflineSyncMutation(
    api.goalDetails.createMilestone,
    "createMilestone"
  );
  const updateMilestone = useOfflineSyncMutation(
    api.goalDetails.updateMilestone,
    "updateMilestone"
  );
  const deleteMilestone = useOfflineSyncMutation(
    api.goalDetails.deleteMilestone,
    "deleteMilestone"
  );
  const updateProject = useOfflineSyncMutation(api.projects.updateProject, "updateProject");

  const [scale, setScale] = useState<string[]>(
    goal.scale && goal.scale.length === 5 ? goal.scale : ["", "", "", "", ""]
  );
  const [newPlan, setNewPlan] = useState({
    trigger: "",
    action: "",
    makeRepeat: true,
    open: false,
  });
  const [newMilestone, setNewMilestone] = useState("");
  const [savingScale, setSavingScale] = useState(false);

  const hex = goalHex(goal.color);
  const horizon = describeHorizon(goal.targetDate);
  const due = needsReview(goal);
  const progress = Math.min(100, Math.max(0, goal.progress ?? 0));
  const currentStatus: string = goal.status ?? "active";
  const isInactive = currentStatus !== "active";

  const linkedTasks: any[] = details?.tasks ?? tasks;
  const activeTasks = linkedTasks.filter((t) => t.status !== "done");
  const completedTasks = linkedTasks.filter((t) => t.status === "done");
  const milestones = details?.milestones ?? [];
  const milestonesDone = milestones.filter((m: any) => m.doneAt).length;
  const plans = details?.plans ?? [];
  const projects = details?.projects ?? [];
  const checkIns = details?.checkIns ?? [];
  const currentWeek = details?.currentWeek ?? "";
  const focusWeeks = details?.focusWeeks ?? [];
  const focusSeconds30d = details?.focusSeconds30d ?? 0;
  const daysSinceLastCompleted = details?.daysSinceLastCompleted;

  const saveScale = async () => {
    setSavingScale(true);
    try {
      await updateGoal({ id: goal._id as Id<"goals">, scale });
    } finally {
      setSavingScale(false);
    }
  };

  const handleAddPlan = async () => {
    if (!newPlan.trigger.trim() || !newPlan.action.trim()) return;
    await createPlanAndTask({
      goalId: goal._id as Id<"goals">,
      trigger: newPlan.trigger.trim(),
      action: newPlan.action.trim(),
      makeRepeat: newPlan.makeRepeat,
      tz: getBrowserTimeZone(),
      sessionId,
    });
    setNewPlan({ trigger: "", action: "", makeRepeat: true, open: false });
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.trim()) return;
    await createMilestone({
      goalId: goal._id as Id<"goals">,
      title: newMilestone.trim(),
      order: milestones.length,
      sessionId,
    });
    setNewMilestone("");
  };

  const handleUnlinkProject = async (projectId: Id<"projects">) => {
    await updateProject({ id: projectId, goalId: null, sessionId });
  };

  // Reactivating a paused/retired/completed goal is a single update. The
  // row-level menus in the Sanctuary call this same mutation, but exposing
  // it here means you can flip a goal back to active while you're already
  // inside it, without leaving the chapter.
  const handleReactivate = async () => {
    await updateGoal({ id: goal._id as Id<"goals">, status: "active" });
  };

  // Compact focus bar data: only the last 4 weeks, for the mini strip.
  const focusWeeks4 = focusWeeks.slice(-4);
  const maxFocus4 = Math.max(60, ...focusWeeks4.map((w) => w.seconds));

  return (
    <div className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-6 duration-500">
      {/*
        The duplicate "All goals" back link that used to sit here has been
        removed — the Sanctuary header already renders a single Back /
        "All goals" arrow when a goal is open, so showing a second identical
        affordance right underneath it created the visual duplication you
        flagged. If a standalone back button is ever needed inside this
        chapter (e.g. if the component is reused outside the overlay), it
        should be gated by a prop, not always rendered.
      */}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-16">
        {/* LEFT */}
        <section className="space-y-10 sm:space-y-12">
          <div>
            <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full" style={{ background: hex }} />
              {goal.category || "General"}
            </div>
            <h2
              className={`${SERIF} mt-4 text-3xl font-medium leading-[1.1] tracking-tight text-[var(--foreground)] sm:mt-5 sm:text-5xl sm:leading-[1.08]`}
            >
              {goal.title}
            </h2>
            {goal.description && (
              <p
                className={`${SERIF} mt-4 text-base italic leading-relaxed text-zinc-600 dark:text-zinc-300 sm:mt-6 sm:text-xl`}
              >
                {goal.description}
              </p>
            )}

            {/*
              Status row for inactive goals. When the goal is paused, retired,
              or completed, this surfaces a one-tap "Reactivate" affordance so
              you don't have to hunt through menus to move a goal back to
              active. When active, it's not rendered, keeping the page quiet.
            */}
            {isInactive && (
              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-black/[0.07] bg-white/40 p-3 dark:border-white/10 dark:bg-white/[0.02] sm:p-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {currentStatus === "paused"
                    ? "Paused"
                    : currentStatus === "completed"
                    ? "Completed"
                    : currentStatus === "retired"
                    ? "Retired"
                    : currentStatus}
                </span>
                <button
                  type="button"
                  onClick={handleReactivate}
                  className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--foreground)] px-4 py-1.5 text-[12px] font-semibold text-[var(--background)] transition-all hover:opacity-90 active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reactivate
                </button>
              </div>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-black/[0.07] pt-5 dark:border-white/10 sm:mt-10 sm:gap-6 sm:pt-6">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Horizon
                </dt>
                <dd className="mt-1 text-[15px] font-medium text-[var(--foreground)] sm:mt-1.5 sm:text-[17px]">
                  {horizon.primary}
                </dd>
                {horizon.secondary && (
                  <dd className="text-[12px] text-zinc-500 sm:text-[13px]">{horizon.secondary}</dd>
                )}
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Progress
                </dt>
                <dd className="mt-1 text-[15px] font-medium tabular-nums text-[var(--foreground)] sm:mt-1.5 sm:text-[17px]">
                  {progress}%
                </dd>
                <dd className="text-[12px] text-zinc-500 sm:text-[13px]">of linked tasks done</dd>
              </div>
            </dl>
            <div className="mt-6 h-[3px] w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10 sm:mt-8">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress}%`, background: hex }}
              />
            </div>

            {/*
              Action row: "Mark reviewed" is the primary button; "Edit goal"
              is a quiet secondary. Previously these sat in a flex-wrap with
              a third "reviewed X days ago" line right underneath, all packed
              together. On mobile they looked cramped. Now the primary sits
              on its own row, the review status is inline beneath it, and
              Edit goal trails to the right of the primary button at sm+.
            */}
            <div className="mt-8 sm:mt-10">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onMarkReviewed}
                  className={`flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 sm:px-6 sm:py-3 ${
                    due
                      ? "bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
                      : "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
                  }`}
                >
                  <Check className="h-4 w-4" /> Mark reviewed
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-full px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-black/5 hover:text-[var(--foreground)] active:bg-black/5 dark:hover:bg-white/10 dark:active:bg-white/10 sm:px-5 sm:py-3"
                >
                  Edit goal
                </button>
              </div>
              <p
                className={`mt-2 text-[12px] sm:text-[13px] ${
                  due ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"
                }`}
              >
                {describeReview(goal)}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-baseline justify-between sm:mb-5">
              <h3 className={`${SERIF} text-xl font-medium text-[var(--foreground)] sm:text-2xl`}>
                Milestones
              </h3>
              <span className="text-[12px] text-zinc-500">
                {milestonesDone} / {milestones.length}
              </span>
            </div>
            <div className="mb-4 space-y-2">
              {milestones.map((m: any) => (
                <div
                  key={m._id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    m.doneAt
                      ? "border-transparent bg-zinc-50 dark:bg-[#151515]"
                      : "border-black/10 bg-white dark:border-white/10 dark:bg-[#1c1c1c]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      updateMilestone({
                        id: m._id,
                        doneAt: m.doneAt ? null : Date.now(),
                        sessionId,
                      })
                    }
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      m.doneAt
                        ? "border-green-500 bg-green-500"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {m.doneAt && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      m.doneAt ? "text-zinc-400 line-through" : "text-[var(--foreground)]"
                    }`}
                  >
                    {m.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteMilestone({ id: m._id, sessionId })}
                    className="p-1 text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {milestones.length === 0 && (
                <p className={`${SERIF} text-[14px] italic text-zinc-500`}>
                  Break this goal into a few checkpoints.
                </p>
              )}
            </div>
            <form onSubmit={handleAddMilestone} className="flex items-center gap-2">
              <input
                type="text"
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                placeholder="New milestone…"
                className="flex-1 min-h-11 rounded-lg border border-black/10 bg-white/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.03]"
              />
              <button
                type="submit"
                disabled={!newMilestone.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--foreground)] text-[var(--background)] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Success Scale */}
          <div>
            <div className="mb-4 flex items-baseline justify-between sm:mb-5">
              <h3 className={`${SERIF} text-xl font-medium text-[var(--foreground)] sm:text-2xl`}>
                Success Scale
              </h3>
              <button
                type="button"
                onClick={saveScale}
                disabled={savingScale}
                className="text-[12px] font-medium text-zinc-500 hover:text-[var(--foreground)] disabled:opacity-50"
              >
                {savingScale ? "Saving…" : "Save"}
              </button>
            </div>
            <p className={`${SERIF} mb-4 text-[13px] italic text-zinc-500 sm:text-[14px]`}>
              What would each outcome feel like? Write your own, or leave blank for the defaults.
            </p>
            <div className="space-y-2.5 sm:space-y-3">
              {scale.map((s, i) => {
                const rating = i - 2;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 shrink-0 text-right text-xs font-bold text-zinc-400">
                      {rating > 0 ? `+${rating}` : rating}
                    </div>
                    <input
                      type="text"
                      value={s}
                      onChange={(e) => {
                        const n = [...scale];
                        n[i] = e.target.value;
                        setScale(n);
                      }}
                      placeholder={SCALE_PROMPTS[i]}
                      className="flex-1 min-h-11 rounded-lg border border-black/10 bg-white/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.03]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="space-y-10 sm:space-y-12 lg:border-l lg:border-black/[0.06] lg:pl-16 dark:lg:border-white/[0.08]">
          {details ? (
            <CheckInSection
              goal={goal}
              checkIns={checkIns}
              currentWeek={currentWeek}
              sessionId={sessionId}
            />
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
            </div>
          )}

          {/* If-Then Plans */}
          <div>
            <div className="mb-4 flex items-baseline justify-between sm:mb-5">
              <div>
                <h3 className={`${SERIF} text-xl font-medium text-[var(--foreground)] sm:text-2xl`}>
                  Implementation intentions
                </h3>
                <p className={`${SERIF} mt-1 text-[12px] italic text-zinc-500 sm:text-[13px]`}>
                  When X happens, I will Y. Each can generate a task.
                </p>
              </div>
              <button
                onClick={() => setNewPlan({ ...newPlan, open: !newPlan.open })}
                className="shrink-0 text-[13px] font-medium text-blue-500 hover:text-blue-600"
              >
                + Add plan
              </button>
            </div>

            {newPlan.open && (
              <div className="mb-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-4 animate-in fade-in dark:border-blue-900/50 dark:bg-blue-900/20">
                <input
                  type="text"
                  value={newPlan.trigger}
                  onChange={(e) => setNewPlan({ ...newPlan, trigger: e.target.value })}
                  placeholder="If (obstacle / situation)…"
                  className="w-full min-h-11 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none dark:border-white/10 dark:bg-[#1a1a1a]"
                />
                <input
                  type="text"
                  value={newPlan.action}
                  onChange={(e) => setNewPlan({ ...newPlan, action: e.target.value })}
                  placeholder="Then I will (action)…"
                  className="w-full min-h-11 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none dark:border-white/10 dark:bg-[#1a1a1a]"
                />
                <label className="flex items-center gap-2 text-[12px] text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={newPlan.makeRepeat}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, makeRepeat: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Make the linked task repeating (weekly)
                </label>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() =>
                      setNewPlan({ trigger: "", action: "", makeRepeat: true, open: false })
                    }
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPlan}
                    disabled={!newPlan.trigger.trim() || !newPlan.action.trim()}
                    className="rounded-lg bg-blue-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                  >
                    Save & {newPlan.makeRepeat ? "make repeating" : "create one-off task"}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {plans.length === 0 && !newPlan.open && (
                <p className={`${SERIF} text-[14px] italic text-zinc-500`}>
                  No plans yet. Prepare for obstacles in advance.
                </p>
              )}
              {plans.map((p: any) => (
                <div
                  key={p._id}
                  className="relative rounded-xl border border-black/10 bg-white/40 p-4 group dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <button
                    onClick={() => deletePlan({ id: p._id, sessionId })}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-zinc-400 opacity-100 transition-opacity hover:text-red-500 sm:h-auto sm:w-auto sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Delete plan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    If
                  </p>
                  <p className="mb-3 text-[15px] font-medium text-[var(--foreground)]">
                    {p.trigger}
                  </p>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Then
                  </p>
                  <p className="text-[15px] font-medium text-[var(--foreground)]">{p.action}</p>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    {p.taskGroupId ? "Repeating task · weekly" : "One-off task created"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Linked work */}
          <div>
            <div className="mb-4 flex items-baseline justify-between sm:mb-5">
              <h3 className={`${SERIF} text-xl font-medium text-[var(--foreground)] sm:text-2xl`}>
                Linked work
              </h3>
              <span className="text-[12px] text-zinc-500">
                {activeTasks.length} active
                {typeof daysSinceLastCompleted === "number" && (
                  <>
                    {" · "}
                    <span className={daysSinceLastCompleted > 14 ? "text-amber-600" : ""}>
                      last done {daysSinceLastCompleted}d ago
                    </span>
                  </>
                )}
              </span>
            </div>

            {(projects.length > 0 || focusSeconds30d > 0) && (
              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-black/[0.06] bg-white/40 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.02] sm:px-4 sm:py-3">
                {projects.length > 0 && (
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    {projects.map((proj: any) => (
                      <span
                        key={proj._id}
                        className="group/chip inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-300"
                      >
                        <span className="truncate max-w-[120px]">{proj.name}</span>
                        <button
                          type="button"
                          onClick={() => handleUnlinkProject(proj._id)}
                          aria-label={`Unlink ${proj.name}`}
                          className="text-zinc-400 opacity-100 transition-opacity hover:text-red-500 sm:opacity-0 sm:group-hover/chip:opacity-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {focusSeconds30d > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-end gap-0.5" title="Focus time, last 4 weeks">
                      {focusWeeks4.map((w) => {
                        const h = maxFocus4 > 0 ? Math.max(2, (w.seconds / maxFocus4) * 16) : 2;
                        return (
                          <div
                            key={w.key}
                            className="w-1.5 rounded-sm"
                            style={{
                              height: `${h}px`,
                              background: w.seconds > 0 ? hex : "transparent",
                              opacity: w.seconds > 0 ? 0.8 : 0,
                            }}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {formatMinutes(focusSeconds30d)} in 30d
                    </span>
                  </div>
                )}
              </div>
            )}

            {activeTasks.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-black/15 p-6 text-center dark:border-white/15 sm:p-8">
                <p className={`${SERIF} text-lg italic text-zinc-600 dark:text-zinc-400`}>
                  Nothing is moving this forward yet.
                </p>
                <p className="mt-2 text-[13px] text-zinc-500">
                  Add a task or plan to give this goal a next action.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTasks.map((task: any) => (
                  <TaskCard key={task._id} task={task} />
                ))}
              </div>
            )}
            {completedTasks.length > 0 && (
              <details className="group mt-6">
                <summary className="cursor-pointer list-none text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-[var(--foreground)]">
                  Completed ({completedTasks.length})
                </summary>
                <div className="mt-4 space-y-2 opacity-70">
                  {completedTasks.slice(0, 8).map((task: any) => (
                    <TaskCard key={task._id} task={task} />
                  ))}
                </div>
              </details>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}