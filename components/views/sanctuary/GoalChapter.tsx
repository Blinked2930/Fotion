"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Folder,
  Loader2,
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
} from "./theme";
import { CheckInSection } from "./CheckInSection";
import { TimeInvestedSection } from "./TimeInvestedSection";

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

  return (
    <div className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-6 duration-500">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" /> All goals
      </button>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-16">
        {/* LEFT */}
        <section className="space-y-12">
          <div>
            <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full" style={{ background: hex }} />
              {goal.category || "General"}
            </div>
            <h2
              className={`${SERIF} mt-5 text-4xl font-medium leading-[1.08] tracking-tight text-[var(--foreground)] sm:text-5xl`}
            >
              {goal.title}
            </h2>
            {goal.description && (
              <p
                className={`${SERIF} mt-6 text-xl italic leading-relaxed text-zinc-600 dark:text-zinc-300`}
              >
                {goal.description}
              </p>
            )}

            <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-black/[0.07] pt-6 dark:border-white/10">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Horizon
                </dt>
                <dd className="mt-1.5 text-[17px] font-medium text-[var(--foreground)]">
                  {horizon.primary}
                </dd>
                {horizon.secondary && (
                  <dd className="text-[13px] text-zinc-500">{horizon.secondary}</dd>
                )}
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Progress
                </dt>
                <dd className="mt-1.5 text-[17px] font-medium tabular-nums text-[var(--foreground)]">
                  {progress}%
                </dd>
                <dd className="text-[13px] text-zinc-500">of linked tasks done</dd>
              </div>
            </dl>
            <div className="mt-8 h-[3px] w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress}%`, background: hex }}
              />
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onMarkReviewed}
                className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all active:scale-95 ${
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
                className="rounded-full px-5 py-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-black/5 hover:text-[var(--foreground)] dark:hover:bg-white/10"
              >
                Edit goal
              </button>
            </div>
            <p
              className={`mt-3 text-[13px] ${
                due ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"
              }`}
            >
              {describeReview(goal)}
            </p>
          </div>

          <div>
            <div className="mb-5 flex items-baseline justify-between">
              <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>
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
                className="flex-1 rounded-lg border border-black/10 bg-white/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.03]"
              />
              <button
                type="submit"
                disabled={!newMilestone.trim()}
                className="rounded-lg bg-[var(--foreground)] p-2 text-[var(--background)] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>

        {/* RIGHT */}
        <section className="space-y-12 lg:border-l lg:border-black/[0.06] lg:pl-16 dark:lg:border-white/[0.08]">
          {/* Success Scale */}
          <div>
            <div className="mb-5 flex items-baseline justify-between">
              <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>
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
            <p className={`${SERIF} mb-4 text-[14px] italic text-zinc-500`}>
              What would each outcome feel like? Write your own, or leave blank for the defaults.
            </p>
            <div className="space-y-3">
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
                      className="flex-1 rounded-lg border border-black/10 bg-white/50 px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.03]"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Check-ins */}
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
            <div className="mb-5 flex items-baseline justify-between">
              <div>
                <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>
                  Implementation intentions
                </h3>
                <p className={`${SERIF} mt-1 text-[13px] italic text-zinc-500`}>
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
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none dark:border-white/10 dark:bg-[#1a1a1a]"
                />
                <input
                  type="text"
                  value={newPlan.action}
                  onChange={(e) => setNewPlan({ ...newPlan, action: e.target.value })}
                  placeholder="Then I will (action)…"
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none dark:border-white/10 dark:bg-[#1a1a1a]"
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
                    className="absolute right-3 top-3 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
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
                    {p.taskGroupId
                      ? "Repeating task · weekly"
                      : "One-off task created"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Linked projects */}
          <div>
            <div className="mb-5 flex items-baseline justify-between">
              <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>
                Linked projects
              </h3>
              <span className="text-[12px] text-zinc-500">{projects.length}</span>
            </div>
            {projects.length === 0 ? (
              <p className={`${SERIF} text-[14px] italic text-zinc-500`}>
                Link a project from its settings to see it here. (Full linking UI arrives with
                the Align screen.)
              </p>
            ) : (
              <ul className="space-y-2">
                {projects.map((proj: any) => (
                  <li
                    key={proj._id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-white/40 px-3 py-2 dark:border-white/[0.08] dark:bg-white/[0.02]"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[14px] text-[var(--foreground)]">
                      <Folder className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="truncate">{proj.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnlinkProject(proj._id)}
                      className="shrink-0 text-[11px] font-medium text-zinc-500 hover:text-red-500"
                    >
                      Unlink
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Linked work */}
          <div>
            <div className="mb-5 flex items-baseline justify-between">
              <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>
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
            {activeTasks.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-black/15 p-8 text-center dark:border-white/15">
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

          {/* Time invested */}
          {details ? (
            <TimeInvestedSection
              weeks={focusWeeks}
              focusSeconds30d={focusSeconds30d}
              color={hex}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}