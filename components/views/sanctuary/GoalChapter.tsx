"use client";

import { ArrowLeft, Check, Plus, GripVertical, Trash2, Calendar } from "lucide-react";
import { TaskCard } from "@/components/ui/TaskCard";
import { SERIF, describeHorizon, describeReview, goalHex, needsReview } from "./theme";
import { useState } from "react";
import { useOfflineQuery, useOfflineSyncMutation } from "@/hooks/useOfflineMutation";
import { api } from "@/convex/_generated/api";
import { useGuestSession } from "@/hooks/useGuestSession";
import { getBrowserTimeZone, buildPreset } from "@/convex/recurrence";

export function GoalChapter({
    goal, tasks, onBack, onEdit, onMarkReviewed
}: {
    goal: any; tasks: any[]; onBack: () => void; onEdit: () => void; onMarkReviewed: () => void;
}) {
    const sessionId = useGuestSession();
    const details = useOfflineQuery(api.goalDetails.getGoalDetails, { goalId: goal._id, sessionId: sessionId ?? undefined }, `goalDetails_${goal._id}`);
    const updateGoal = useOfflineSyncMutation(api.goals.updateGoal, "updateGoal");
    
    // Plan Mutations
    const createPlan = useOfflineSyncMutation(api.goalDetails.createPlan, "createPlan");
    const deletePlan = useOfflineSyncMutation(api.goalDetails.deletePlan, "deletePlan");
    const createTask = useOfflineSyncMutation(api.tasks.createTask, "createTask");

    // Milestone Mutations
    const createMilestone = useOfflineSyncMutation(api.goalDetails.createMilestone, "createMilestone");
    const updateMilestone = useOfflineSyncMutation(api.goalDetails.updateMilestone, "updateMilestone");
    const deleteMilestone = useOfflineSyncMutation(api.goalDetails.deleteMilestone, "deleteMilestone");

    const [scale, setScale] = useState<string[]>(goal.scale || ["", "", "", "", ""]);
    const [newPlan, setNewPlan] = useState({ trigger: "", action: "", open: false });
    const [newMilestone, setNewMilestone] = useState("");

    const hex = goalHex(goal.color);
    const horizon = describeHorizon(goal.targetDate);
    const due = needsReview(goal);
    const active = tasks.filter((t) => t.status !== "done");
    const completed = tasks.filter((t) => t.status === "done");
    const progress = Math.min(100, Math.max(0, goal.progress ?? 0));

    const handleSaveScale = (index: number, val: string) => {
        const newScale = [...scale];
        newScale[index] = val;
        setScale(newScale);
        updateGoal({ id: goal._id, scale: newScale });
    };

    const handleAddPlan = async () => {
        if (!newPlan.trigger || !newPlan.action) return;
        const groupId = crypto.randomUUID();
        const rec = buildPreset("weekly", Date.now(), getBrowserTimeZone());
        
        await createTask({
            title: newPlan.action,
            goalId: goal._id,
            recurrence: rec,
            recurrenceRule: "weekly",
            recurringGroupId: groupId,
            isImportant: true,
            isUrgent: false,
            isForFunsies: false,
            sessionId: sessionId ?? undefined
        });

        await createPlan({
            goalId: goal._id,
            trigger: newPlan.trigger,
            action: newPlan.action,
            taskGroupId: groupId,
            sessionId: sessionId ?? undefined
        });
        setNewPlan({ trigger: "", action: "", open: false });
    };

    const handleAddMilestone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMilestone.trim()) return;
        await createMilestone({
            goalId: goal._id,
            title: newMilestone.trim(),
            order: (details?.milestones?.length || 0),
            sessionId: sessionId ?? undefined
        });
        setNewMilestone("");
    };

    const scaleLabels = ["Much worse than expected", "Worse than expected", "Expected outcome", "Better than expected", "Much better than expected"];

    return (
        <div className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-6 duration-500">
            <button type="button" onClick={onBack} className="mb-8 flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-[var(--foreground)]"><ArrowLeft className="h-4 w-4" /> All goals</button>

            <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
                {/* LEFT COLUMN: Intent, Success Scale, Milestones */}
                <section className="space-y-12">
                    <div>
                        <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                            <span className="h-2 w-2 rounded-full" style={{ background: hex }} />
                            {goal.category || "General"}
                        </div>
                        <h2 className={`${SERIF} mt-5 text-4xl font-medium leading-[1.08] tracking-tight text-[var(--foreground)] sm:text-5xl`}>{goal.title}</h2>
                        {goal.description && <p className={`${SERIF} mt-6 text-xl italic leading-relaxed text-zinc-600 dark:text-zinc-300`}>{goal.description}</p>}

                        <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-black/[0.07] pt-6 dark:border-white/10">
                            <div><dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Horizon</dt><dd className="mt-1.5 text-[17px] font-medium text-[var(--foreground)]">{horizon.primary}</dd>{horizon.secondary && <dd className="text-[13px] text-zinc-500">{horizon.secondary}</dd>}</div>
                            <div><dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Progress</dt><dd className="mt-1.5 text-[17px] font-medium tabular-nums text-[var(--foreground)]">{progress}%</dd><dd className="text-[13px] text-zinc-500">of linked tasks done</dd></div>
                        </dl>
                        <div className="mt-8 h-[3px] w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/10"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, background: hex }} /></div>
                        
                        <div className="mt-10 flex flex-wrap items-center gap-3">
                            <button type="button" onClick={onMarkReviewed} className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all active:scale-95 ${due ? "bg-amber-500 text-amber-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400" : "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"}`}><Check className="h-4 w-4" /> Mark reviewed</button>
                            <button type="button" onClick={onEdit} className="rounded-full px-5 py-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-black/5 hover:text-[var(--foreground)] dark:hover:bg-white/10">Edit goal</button>
                        </div>
                        <p className={`mt-3 text-[13px] ${due ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"}`}>{describeReview(goal)}</p>
                    </div>

                    <div>
                        <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)] mb-5`}>Success Scale</h3>
                        <div className="space-y-3">
                            {scale.map((s, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-6 text-right text-xs font-bold text-zinc-400 shrink-0">{i - 2 > 0 ? `+${i - 2}` : i - 2}</div>
                                    <input 
                                        type="text" 
                                        value={s} 
                                        onChange={(e) => { const n = [...scale]; n[i] = e.target.value; setScale(n); }}
                                        onBlur={(e) => handleSaveScale(i, e.target.value)}
                                        placeholder={scaleLabels[i]} 
                                        className="flex-1 bg-white/50 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-zinc-400 transition-colors"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)] mb-5`}>Milestones</h3>
                        <div className="space-y-2 mb-4">
                            {details?.milestones?.map((m: any) => (
                                <div key={m._id} className={`flex items-center gap-3 p-3 rounded-xl border ${m.doneAt ? 'bg-zinc-50 dark:bg-[#151515] border-transparent' : 'bg-white dark:bg-[#1c1c1c] border-black/10 dark:border-white/10'}`}>
                                    <button onClick={() => updateMilestone({ id: m._id, doneAt: m.doneAt ? null : Date.now() })} className={`w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors ${m.doneAt ? 'bg-green-500 border-green-500' : 'border-zinc-300 dark:border-zinc-600'}`}>{m.doneAt && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}</button>
                                    <span className={`text-sm flex-1 ${m.doneAt ? 'line-through text-zinc-400' : 'text-[var(--foreground)]'}`}>{m.title}</span>
                                    <button onClick={() => deleteMilestone({ id: m._id })} className="text-zinc-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleAddMilestone} className="flex items-center gap-2">
                            <input type="text" value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} placeholder="New milestone..." className="flex-1 bg-white/50 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-zinc-400" />
                            <button type="submit" disabled={!newMilestone.trim()} className="bg-[var(--foreground)] text-[var(--background)] p-2 rounded-lg disabled:opacity-50"><Plus className="w-4 h-4" /></button>
                        </form>
                    </div>
                </section>

                {/* RIGHT COLUMN: Plans, Work, Time */}
                <section className="space-y-12">
                    <div>
                        <div className="mb-5 flex items-baseline justify-between">
                            <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>If-Then Plans</h3>
                            <button onClick={() => setNewPlan({ ...newPlan, open: !newPlan.open })} className="text-[13px] font-medium text-blue-500 hover:text-blue-600">+ Add plan</button>
                        </div>
                        
                        {newPlan.open && (
                            <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 space-y-3 animate-in fade-in">
                                <input type="text" value={newPlan.trigger} onChange={e => setNewPlan({...newPlan, trigger: e.target.value})} placeholder="If (obstacle / situation)..." className="w-full bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" />
                                <input type="text" value={newPlan.action} onChange={e => setNewPlan({...newPlan, action: e.target.value})} placeholder="Then I will (action)..." className="w-full bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] outline-none" />
                                <div className="flex justify-end gap-2 pt-1">
                                    <button onClick={() => setNewPlan({ trigger: "", action: "", open: false })} className="text-xs font-medium text-zinc-500 px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">Cancel</button>
                                    <button onClick={handleAddPlan} disabled={!newPlan.trigger || !newPlan.action} className="text-xs font-bold text-white bg-blue-500 px-4 py-1.5 rounded-lg disabled:opacity-50 shadow-sm">Save & Make Repeating Task</button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {details?.plans?.length === 0 && !newPlan.open && (
                                <p className="text-sm italic text-zinc-500">No plans yet. Prepare for obstacles in advance.</p>
                            )}
                            {details?.plans?.map((p: any) => (
                                <div key={p._id} className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] relative group">
                                    <button onClick={() => deletePlan({ id: p._id })} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                    <p className="text-sm text-zinc-500 mb-1 font-semibold uppercase tracking-wider text-[10px]">If</p>
                                    <p className="text-[15px] font-medium text-[var(--foreground)] mb-3">{p.trigger}</p>
                                    <p className="text-sm text-zinc-500 mb-1 font-semibold uppercase tracking-wider text-[10px]">Then</p>
                                    <p className="text-[15px] font-medium text-[var(--foreground)] flex items-center gap-2">{p.action}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="mb-5 flex items-baseline justify-between">
                            <h3 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>Linked work</h3>
                            <span className="text-[13px] text-zinc-500">{active.length} active</span>
                        </div>
                        {active.length === 0 ? (
                            <div className="rounded-[24px] border border-dashed border-black/15 p-10 text-center dark:border-white/15">
                                <p className={`${SERIF} text-lg italic text-zinc-600 dark:text-zinc-400`}>Nothing is moving this forward yet.</p>
                                <p className="mt-2 text-[13px] text-zinc-500">Open any task and set its Goal to link it here.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">{active.map((task) => <TaskCard key={task._id} task={task} />)}</div>
                        )}
                        {completed.length > 0 && (
                            <details className="group mt-8">
                                <summary className="cursor-pointer list-none text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-[var(--foreground)]">Completed ({completed.length})</summary>
                                <div className="mt-4 space-y-2 opacity-70">{completed.slice(0, 8).map((task) => <TaskCard key={task._id} task={task} />)}</div>
                            </details>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}