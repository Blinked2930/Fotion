"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Target, CheckCircle2, AlertCircle, Plus, Calendar, ArrowLeft, MoreVertical, Trash2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useOfflineSyncMutation, useOfflineQuery } from "@/hooks/useOfflineMutation";
import { TaskCard } from "@/components/ui/TaskCard";

function calculateNeedsReview(goal: any) {
    if (!goal.reviewCycle || goal.reviewCycle === "none") return false;
    if (!goal.lastReviewedAt) return true;

    const daysSince = (Date.now() - goal.lastReviewedAt) / (1000 * 60 * 60 * 24);
    switch (goal.reviewCycle) {
        case "weekly": return daysSince >= 7;
        case "monthly": return daysSince >= 30;
        case "quarterly": return daysSince >= 90;
        case "annual": return daysSince >= 365;
        default: return false;
    }
}

export function GoalSanctuaryOverlay({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const sessionId = useGuestSession();
    const goals = useQuery(api.goals.getGoals, { sessionId: sessionId ?? undefined }) || [];
    const tasks = useOfflineQuery(api.tasks.getTasks, { sessionId: sessionId ?? undefined }, "getTasks") || [];

    const createGoal = useOfflineSyncMutation(api.goals.createGoal, "createGoal");
    const updateGoal = useOfflineSyncMutation(api.goals.updateGoal, "updateGoal");
    const deleteGoal = useOfflineSyncMutation(api.goals.deleteGoal, "deleteGoal");

    const [activeReviewGoalId, setActiveReviewGoalId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newCycle, setNewCycle] = useState<"weekly" | "monthly" | "quarterly" | "annual" | "none">("quarterly");

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (activeReviewGoalId) setActiveReviewGoalId(null);
                else if (isCreating) setIsCreating(false);
                else onClose();
            }
        };
        if (isOpen) document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, activeReviewGoalId, isCreating, onClose]);

    if (!isOpen) return null;

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        await createGoal({
            title: newTitle.trim(),
            status: "active",
            reviewCycle: newCycle,
            sessionId: sessionId ?? undefined,
        });
        setNewTitle("");
        setIsCreating(false);
    };

    const handleCompleteReview = async (goalId: string) => {
        await updateGoal({ id: goalId as any, lastReviewedAt: Date.now() });
        setActiveReviewGoalId(null);
    };

    const activeGoal = activeReviewGoalId ? goals.find((g: any) => g._id === activeReviewGoalId) : null;
    const linkedTasks = activeGoal ? tasks.filter((t: any) => t.goalId === activeGoal._id) : [];

    const incompleteTasks = linkedTasks.filter((t: any) => t.status !== "done");
    const completedTasks = linkedTasks.filter((t: any) => t.status === "done");

    return createPortal(
        <div className="fixed inset-0 z-[300] flex animate-in fade-in duration-300">
            {/* Frosted Glass Background */}
            <div
                className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-2xl"
                onClick={onClose}
            />

            {/* Main Container */}
            <div className="relative w-full max-w-[1600px] mx-auto h-[100dvh] flex flex-col pointer-events-none">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 sm:p-10 pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">The Sanctuary</h2>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">High-level reflection & alignment</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-full bg-white dark:bg-[#1c1c1c] border border-[var(--border)] text-zinc-500 hover:text-[var(--foreground)] shadow-sm transition-all active:scale-95"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-10 pb-24 pointer-events-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    
                    {activeGoal ? (
                        /* REFLECTION FLOW (SPLIT SCREEN) */
                        <div className="flex flex-col lg:flex-row gap-8 h-full animate-in slide-in-from-bottom-8 duration-300">
                            
                            {/* Left Side: Goal Intent */}
                            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                                <button
                                    onClick={() => setActiveReviewGoalId(null)}
                                    className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-[var(--foreground)] transition-colors w-fit"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back to Map
                                </button>
                                
                                <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] border border-[var(--border)] p-8 shadow-xl">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-100 dark:border-indigo-900/50">
                                        <AlertCircle className="w-3.5 h-3.5" /> Alignment Review
                                    </div>
                                    <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight mb-4 leading-tight">{activeGoal.title}</h1>
                                    {activeGoal.description && (
                                        <p className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed mb-8">{activeGoal.description}</p>
                                    )}
                                    
                                    <div className="bg-zinc-50 dark:bg-[#222] rounded-xl p-5 mb-8 border border-[var(--border)]">
                                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Review Cycle</h4>
                                        <div className="text-[15px] font-medium text-[var(--foreground)] capitalize">{activeGoal.reviewCycle} Check-up</div>
                                    </div>

                                    <button
                                        onClick={() => handleCompleteReview(activeGoal._id)}
                                        className="w-full py-4 bg-[var(--foreground)] hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-black text-lg rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-6 h-6" /> Approve Alignment
                                    </button>
                                </div>
                            </div>

                            {/* Right Side: Execution Audit */}
                            <div className="w-full lg:w-2/3 flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-[var(--foreground)]">Execution Audit</h3>
                                    <span className="text-sm font-medium text-zinc-500">
                                        {incompleteTasks.length} Active Tasks
                                    </span>
                                </div>
                                
                                <div className="flex-1 bg-zinc-50/50 dark:bg-black/20 rounded-[32px] border border-[var(--border)] p-6 overflow-y-auto">
                                    {incompleteTasks.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                                            <Target className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
                                            <h4 className="text-lg font-bold text-[var(--foreground)] mb-2">No Active Tasks</h4>
                                            <p className="text-sm text-zinc-500">Your schedule is empty for this goal. Add tasks from your Fotion workspace to drive this forward.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {incompleteTasks.map((task: any) => (
                                                <TaskCard key={task._id} task={task} />
                                            ))}
                                        </div>
                                    )}

                                    {completedTasks.length > 0 && (
                                        <div className="mt-12">
                                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Recently Completed</h4>
                                            <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                                                {completedTasks.slice(0, 5).map((task: any) => (
                                                    <TaskCard key={task._id} task={task} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    ) : (
                        /* MASONRY DASHBOARD */
                        <div className="animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                
                                {/* Create New Card */}
                                {isCreating ? (
                                    <div className="bg-white dark:bg-[#1a1a1a] rounded-[24px] border border-blue-500/50 shadow-xl p-6 flex flex-col animate-in zoom-in-95 duration-200">
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="What is your new goal?"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                            className="w-full bg-transparent text-xl font-bold text-[var(--foreground)] outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 mb-6"
                                        />
                                        <div className="space-y-3 mb-6">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Review Frequency</span>
                                            <div className="flex flex-wrap gap-2">
                                                {(["weekly", "monthly", "quarterly", "annual", "none"] as const).map(cycle => (
                                                    <button
                                                        key={cycle}
                                                        onClick={() => setNewCycle(cycle)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${newCycle === cycle ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                                    >
                                                        {cycle}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-auto flex justify-end gap-2">
                                            <button onClick={() => setIsCreating(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">Cancel</button>
                                            <button onClick={handleCreate} className="px-5 py-2 rounded-xl text-sm font-bold bg-blue-500 text-white shadow-md active:scale-95 transition-all">Save Goal</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="h-full min-h-[250px] bg-zinc-50/50 dark:bg-zinc-900/20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[24px] flex flex-col items-center justify-center gap-3 text-zinc-400 hover:text-[var(--foreground)] hover:border-zinc-300 dark:hover:border-zinc-700 transition-all hover:bg-white dark:hover:bg-[#1a1a1a] group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <span className="font-bold">Define a New Goal</span>
                                    </button>
                                )}

                                {/* Goal Cards */}
                                {goals.filter((g: any) => g.status !== "archived").map((goal: any) => {
                                    const needsReview = calculateNeedsReview(goal);
                                    const goalTasks = tasks.filter((t: any) => t.goalId === goal._id);
                                    const activeCount = goalTasks.filter((t: any) => t.status !== "done").length;
                                    
                                    return (
                                        <div key={goal._id} className="group bg-white dark:bg-[#1a1a1a] rounded-[24px] border border-[var(--border)] p-6 shadow-sm hover:shadow-xl transition-all flex flex-col h-full min-h-[250px] relative overflow-hidden">
                                            
                                            {/* Decorative Background Blur */}
                                            {needsReview && (
                                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 dark:bg-amber-500/20 blur-2xl rounded-full pointer-events-none" />
                                            )}

                                            <div className="flex items-start justify-between mb-4 relative z-10">
                                                {needsReview ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-800/50">
                                                        <AlertCircle className="w-3 h-3" /> Needs Alignment
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider border border-transparent">
                                                        {goal.reviewCycle !== "none" ? `${goal.reviewCycle} review` : "No cycle"}
                                                    </span>
                                                )}
                                                
                                                <button onClick={() => deleteGoal({ id: goal._id })} className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <h3 className="text-xl font-bold text-[var(--foreground)] leading-tight mb-2 relative z-10">{goal.title}</h3>
                                            <p className="text-sm text-zinc-500 line-clamp-3 mb-6 relative z-10 flex-1">{goal.description || "No description provided."}</p>

                                            <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                                                    <Target className="w-4 h-4" /> {activeCount} Active Tasks
                                                </div>
                                                
                                                {needsReview ? (
                                                    <button
                                                        onClick={() => setActiveReviewGoalId(goal._id)}
                                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
                                                    >
                                                        Review Now
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setActiveReviewGoalId(goal._id)}
                                                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[var(--foreground)] text-xs font-bold rounded-xl transition-all active:scale-95"
                                                    >
                                                        View Map
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}