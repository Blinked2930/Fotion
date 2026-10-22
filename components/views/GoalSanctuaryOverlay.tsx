"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Target, CheckCircle2, AlertCircle, Plus, Calendar, ArrowLeft, Trash2, Edit3, Award, Sparkles, Filter, Clock } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useOfflineSyncMutation, useOfflineQuery } from "@/hooks/useOfflineMutation";
import { TaskCard } from "@/components/ui/TaskCard";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; ring: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", ring: "bg-emerald-500" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", ring: "bg-blue-500" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/20", ring: "bg-purple-500" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", ring: "bg-amber-500" },
    pink: { bg: "bg-pink-500/10", text: "text-pink-500", border: "border-pink-500/20", ring: "bg-pink-500" },
};

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
    const goals = useOfflineQuery(api.goals.getGoals, { sessionId: sessionId ?? undefined }, "getGoals") || [];
    const tasks = useOfflineQuery(api.tasks.getTasks, { sessionId: sessionId ?? undefined }, "getTasks") || [];

    const createGoal = useOfflineSyncMutation(api.goals.createGoal, "createGoal");
    const updateGoal = useOfflineSyncMutation(api.goals.updateGoal, "updateGoal");
    const deleteGoal = useOfflineSyncMutation(api.goals.deleteGoal, "deleteGoal");

    const [activeReviewGoalId, setActiveReviewGoalId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form State
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetDate, setTargetDate] = useState<number | null>(null);
    const [category, setCategory] = useState("Personal");
    const [color, setColor] = useState("emerald");
    const [reviewCycle, setReviewCycle] = useState<"weekly" | "monthly" | "quarterly" | "annual" | "none">("quarterly");

    // createPortal needs `document`, which does not exist during server pre-render.
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (isModalOpen) setIsModalOpen(false);
                else if (activeReviewGoalId) setActiveReviewGoalId(null);
                else onClose();
            }
        };
        if (isOpen) document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, activeReviewGoalId, isModalOpen, onClose]);

    if (!isOpen || !mounted) return null;

    const handleOpenCreateModal = () => {
        setEditingGoalId(null);
        setTitle("");
        setDescription("");
        setTargetDate(null);
        setCategory("Personal");
        setColor("emerald");
        setReviewCycle("quarterly");
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (goal: any) => {
        setEditingGoalId(goal._id);
        setTitle(goal.title);
        setDescription(goal.description || "");
        setTargetDate(goal.targetDate || null);
        setCategory(goal.category || "Personal");
        setColor(goal.color || "emerald");
        setReviewCycle(goal.reviewCycle || "quarterly");
        setIsModalOpen(true);
    };

    const handleSaveGoal = async () => {
        if (!title.trim()) return;

        if (editingGoalId) {
            await updateGoal({
                id: editingGoalId as any,
                title: title.trim(),
                description: description.trim() || undefined,
                targetDate: targetDate || null,
                category,
                color,
                reviewCycle,
            });
        } else {
            await createGoal({
                title: title.trim(),
                description: description.trim() || undefined,
                targetDate: targetDate || null,
                category,
                color,
                reviewCycle,
                sessionId: sessionId ?? undefined,
            });
        }

        setIsModalOpen(false);
    };

    const handleCompleteReview = async (goalId: string) => {
        await updateGoal({ id: goalId as any, lastReviewedAt: Date.now() });
        setActiveReviewGoalId(null);
    };

    const activeGoalForReview = activeReviewGoalId ? goals.find((g: any) => g._id === activeReviewGoalId) : null;
    const reviewLinkedTasks = activeGoalForReview ? tasks.filter((t: any) => t.goalId === activeGoalForReview._id) : [];

    const activeGoals = goals.filter((g: any) => g.status !== "completed");
    const completedGoals = goals.filter((g: any) => g.status === "completed");

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
                    
                    {activeGoalForReview ? (
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
                                    <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight mb-4 leading-tight">{activeGoalForReview.title}</h1>
                                    {activeGoalForReview.description && (
                                        <p className="text-zinc-600 dark:text-zinc-400 text-base leading-relaxed mb-8">{activeGoalForReview.description}</p>
                                    )}
                                    
                                    <div className="bg-zinc-50 dark:bg-[#222] rounded-xl p-5 mb-8 border border-[var(--border)]">
                                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Review Cycle</h4>
                                        <div className="text-[15px] font-medium text-[var(--foreground)] capitalize">{activeGoalForReview.reviewCycle} Check-up</div>
                                    </div>

                                    <button
                                        onClick={() => handleCompleteReview(activeGoalForReview._id)}
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
                                        {reviewLinkedTasks.filter((t: any) => t.status !== "done").length} Active Tasks
                                    </span>
                                </div>
                                
                                <div className="flex-1 bg-zinc-50/50 dark:bg-black/20 rounded-[32px] border border-[var(--border)] p-6 overflow-y-auto">
                                    {reviewLinkedTasks.filter((t: any) => t.status !== "done").length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                                            <Target className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" />
                                            <h4 className="text-lg font-bold text-[var(--foreground)] mb-2">No Active Tasks</h4>
                                            <p className="text-sm text-zinc-500">Your schedule is empty for this goal. Add tasks from your Fotion workspace to drive this forward.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {reviewLinkedTasks.filter((t: any) => t.status !== "done").map((task: any) => (
                                                <TaskCard key={task._id} task={task} />
                                            ))}
                                        </div>
                                    )}

                                    {reviewLinkedTasks.filter((t: any) => t.status === "done").length > 0 && (
                                        <div className="mt-12">
                                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Recently Completed</h4>
                                            <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                                                {reviewLinkedTasks.filter((t: any) => t.status === "done").slice(0, 5).map((task: any) => (
                                                    <TaskCard key={task._id} task={task} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* MASONRY DASHBOARD (From GoalsView) */
                        <div className="animate-in fade-in duration-500 pb-20">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                                    Active Goals ({activeGoals.length})
                                </h3>
                                <button
                                    onClick={handleOpenCreateModal}
                                    className="flex items-center justify-center gap-2 bg-[var(--foreground)] hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-[var(--background)] font-bold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" /> Define New Goal
                                </button>
                            </div>

                            {activeGoals.length === 0 ? (
                                <div className="p-12 text-center border-2 border-dashed border-[var(--border)] rounded-3xl space-y-3 max-w-2xl mx-auto mt-10">
                                    <Sparkles className="w-10 h-10 text-zinc-400 mx-auto" />
                                    <p className="text-base text-zinc-500">No active goals set yet.</p>
                                    <button
                                        onClick={handleOpenCreateModal}
                                        className="text-sm font-bold text-[var(--foreground)] hover:underline"
                                    >
                                        Set your first milestone →
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {activeGoals.map((goal: any) => {
                                        const colors = COLOR_MAP[goal.color || "emerald"] || COLOR_MAP.emerald;
                                        const needsReview = calculateNeedsReview(goal);
                                        const goalTasks = tasks.filter((t: any) => t.goalId === goal._id);
                                        const activeCount = goalTasks.filter((t: any) => t.status !== "done").length;
                                        
                                        // Calculate actual progress based on tasks if possible
                                        const totalCount = goalTasks.length;
                                        const completedCount = goalTasks.filter((t: any) => t.status === "done").length;
                                        const progressPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

                                        return (
                                            <div
                                                key={goal._id}
                                                className="group p-6 rounded-[24px] border transition-all relative flex flex-col justify-between min-h-[250px] overflow-hidden bg-white dark:bg-[#1a1a1a] border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-xl"
                                            >
                                                {/* Decorative Background Blur */}
                                                {needsReview && (
                                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 dark:bg-amber-500/20 blur-2xl rounded-full pointer-events-none" />
                                                )}

                                                <div>
                                                    <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
                                                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                                                            {goal.category}
                                                        </span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenEditModal(goal);
                                                                }}
                                                                className="p-1.5 text-zinc-400 hover:text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm("Delete this goal? Linked tasks will not be deleted.")) {
                                                                        deleteGoal({ id: goal._id });
                                                                    }
                                                                }}
                                                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <h4 className="font-extrabold text-xl text-[var(--foreground)] leading-tight mb-2 relative z-10">
                                                        {goal.title}
                                                    </h4>
                                                    {goal.description && (
                                                        <p className="text-sm text-zinc-500 line-clamp-3 mb-4 relative z-10">
                                                            {goal.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="mt-auto space-y-4 relative z-10">
                                                    <div>
                                                        <div className="flex justify-between text-xs font-bold mb-1.5">
                                                            <span className="text-zinc-500">Progress</span>
                                                            <span className={colors.text}>{progressPercentage}%</span>
                                                        </div>
                                                        <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${colors.ring} transition-all duration-500`}
                                                                style={{ width: `${progressPercentage}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                                                        {needsReview ? (
                                                            <button
                                                                onClick={() => setActiveReviewGoalId(goal._id)}
                                                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                                                            >
                                                                <AlertCircle className="w-3.5 h-3.5" /> Review Now
                                                            </button>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : "No Deadline"}
                                                            </span>
                                                        )}

                                                        <button 
                                                            onClick={() => setActiveReviewGoalId(goal._id)}
                                                            className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            <Target className="w-3.5 h-3.5" /> {activeCount} Tasks
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {completedGoals.length > 0 && (
                                <div className="mt-12 pt-8 border-t border-[var(--border)] max-w-4xl">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                        <Award className="w-4 h-4 text-emerald-500" /> Completed Goals
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {completedGoals.map((goal: any) => (
                                            <div key={goal._id} className="p-4 bg-zinc-50 dark:bg-[#151515] rounded-xl border border-[var(--border)] flex items-center justify-between">
                                                <span className="line-through text-zinc-500 font-medium text-sm">{goal.title}</span>
                                                <span className="text-emerald-500 font-bold text-xs uppercase tracking-wider">Completed</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create / Edit Goal Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#181818] p-7 rounded-[24px] shadow-2xl w-full max-w-md border border-[var(--border)] space-y-6 animate-in zoom-in-95 duration-200">
                        <h3 className="font-extrabold text-xl text-[var(--foreground)] tracking-tight">
                            {editingGoalId ? "Edit Goal" : "Create New Goal"}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Goal Title</label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="e.g. Run a half marathon"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-[15px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)] transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="Why is this outcome important?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-[14px] text-[var(--foreground)] outline-none focus:border-[var(--foreground)] resize-none transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-sm font-medium text-[var(--foreground)] outline-none cursor-pointer"
                                    >
                                        <option value="Personal">Personal</option>
                                        <option value="Health">Health</option>
                                        <option value="Career">Career</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Learning">Learning</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Color Theme</label>
                                    <select
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-sm font-medium text-[var(--foreground)] outline-none cursor-pointer"
                                    >
                                        <option value="emerald">Emerald</option>
                                        <option value="blue">Blue</option>
                                        <option value="purple">Purple</option>
                                        <option value="amber">Amber</option>
                                        <option value="pink">Pink</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Review Cycle</label>
                                    <select
                                        value={reviewCycle}
                                        onChange={(e) => setReviewCycle(e.target.value as any)}
                                        className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-[var(--border)] rounded-xl p-3 text-sm font-medium text-[var(--foreground)] outline-none cursor-pointer"
                                    >
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annual">Annual</option>
                                        <option value="none">None</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Target Date</label>
                                    <div className="h-[46px]">
                                        <CustomDatePicker value={targetDate} onChange={(val) => setTargetDate(val)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveGoal}
                                className="px-6 py-2.5 text-sm font-bold text-[var(--background)] bg-[var(--foreground)] hover:opacity-90 rounded-xl shadow-md transition-all active:scale-95"
                            >
                                {editingGoalId ? "Update Goal" : "Create Goal"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}