"use client";

import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useOfflineQuery, useOfflineSyncMutation } from "@/hooks/useOfflineMutation";
import {
    Target, Plus, Trash2, Edit3, Clock, Award, Sparkles, Filter
} from "lucide-react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { TaskCard } from "@/components/ui/TaskCard";

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; ring: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", ring: "bg-emerald-500" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", ring: "bg-blue-500" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/20", ring: "bg-purple-500" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", ring: "bg-amber-500" },
    pink: { bg: "bg-pink-500/10", text: "text-pink-500", border: "border-pink-500/20", ring: "bg-pink-500" },
};

export function GoalsView() {
    const sessionId = useGuestSession();
    const goals = useOfflineQuery(api.goals.getGoals, { sessionId: sessionId ?? undefined }, "getGoals") || [];
    const tasks = useOfflineQuery(api.tasks.getTasks, { sessionId: sessionId ?? undefined }, "getTasks") || [];

    const createGoal = useOfflineSyncMutation(api.goals.createGoal, "createGoal");
    const updateGoal = useOfflineSyncMutation(api.goals.updateGoal, "updateGoal");
    const deleteGoal = useOfflineSyncMutation(api.goals.deleteGoal, "deleteGoal");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGoalId, setSelectedGoalId] = useState<Id<"goals"> | null>(null);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [targetDate, setTargetDate] = useState<number | null>(null);
    const [category, setCategory] = useState("Personal");
    const [color, setColor] = useState("emerald");
    const [editingGoalId, setEditingGoalId] = useState<Id<"goals"> | null>(null);

    const handleOpenCreateModal = () => {
        setEditingGoalId(null);
        setTitle("");
        setDescription("");
        setTargetDate(null);
        setCategory("Personal");
        setColor("emerald");
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (goal: any) => {
        setEditingGoalId(goal._id);
        setTitle(goal.title);
        setDescription(goal.description || "");
        setTargetDate(goal.targetDate || null);
        setCategory(goal.category || "Personal");
        setColor(goal.color || "emerald");
        setIsModalOpen(true);
    };

    const handleSaveGoal = async () => {
        if (!title.trim()) return;

        if (editingGoalId) {
            await updateGoal({
                id: editingGoalId,
                title: title.trim(),
                description: description.trim() || undefined,
                targetDate: targetDate || null,
                category,
                color,
            });
        } else {
            await createGoal({
                title: title.trim(),
                description: description.trim() || undefined,
                targetDate: targetDate || null,
                category,
                color,
                sessionId: sessionId ?? undefined,
            });
        }

        setIsModalOpen(false);
    };

    const selectedGoal = goals.find((g: any) => g._id === selectedGoalId);
    const linkedTasks = selectedGoalId
        ? tasks.filter((t: any) => t.goalId === selectedGoalId)
        : [];

    const activeGoals = goals.filter((g: any) => g.status !== "completed");
    const completedGoals = goals.filter((g: any) => g.status === "completed");

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-2xl border border-[var(--border)]">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--foreground)]">
                        <Target className="w-5 h-5 text-emerald-500" />
                        Goals & Outcomes
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Connect high-level objectives to day-to-day execution.
                    </p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> New Goal
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                            Active Goals ({activeGoals.length})
                        </h3>
                    </div>

                    {activeGoals.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-[var(--border)] rounded-2xl space-y-3">
                            <Sparkles className="w-8 h-8 text-zinc-400 mx-auto" />
                            <p className="text-sm text-zinc-500">No active goals set yet.</p>
                            <button
                                onClick={handleOpenCreateModal}
                                className="text-xs font-semibold text-emerald-500 hover:underline"
                            >
                                Set your first milestone →
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeGoals.map((goal: any) => {
                                const colors = COLOR_MAP[goal.color || "emerald"] || COLOR_MAP.emerald;
                                const isSelected = selectedGoalId === goal._id;

                                return (
                                    <div
                                        key={goal._id}
                                        onClick={() => setSelectedGoalId(isSelected ? null : goal._id)}
                                        className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${isSelected
                                                ? "border-emerald-500 bg-emerald-500/5 shadow-md"
                                                : "border-[var(--border)] bg-white dark:bg-[#1a1a1a] hover:border-zinc-400 dark:hover:border-zinc-700"
                                            }`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                                                    {goal.category}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenEditModal(goal);
                                                        }}
                                                        className="p-1 text-zinc-400 hover:text-[var(--foreground)] rounded"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm("Delete this goal? Linked tasks will not be deleted.")) {
                                                                deleteGoal({ id: goal._id });
                                                                if (selectedGoalId === goal._id) setSelectedGoalId(null);
                                                            }
                                                        }}
                                                        className="p-1 text-zinc-400 hover:text-red-500 rounded"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-base text-[var(--foreground)] leading-snug mb-1">
                                                {goal.title}
                                            </h4>
                                            {goal.description && (
                                                <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                                                    {goal.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            <div>
                                                <div className="flex justify-between text-xs font-semibold mb-1">
                                                    <span className="text-zinc-500">Progress</span>
                                                    <span className={colors.text}>{goal.progress}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${colors.ring} transition-all duration-500`}
                                                        style={{ width: `${goal.progress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-[var(--border)]">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : "No Target Date"}
                                                </span>
                                                <span className="font-medium">
                                                    {goal.completedTasks}/{goal.totalTasks} Tasks
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {completedGoals.length > 0 && (
                        <div className="pt-4 border-t border-[var(--border)]">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-emerald-500" /> Completed Goals ({completedGoals.length})
                            </h3>
                            <div className="space-y-2">
                                {completedGoals.map((goal: any) => (
                                    <div key={goal._id} className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-[var(--border)] flex items-center justify-between text-xs">
                                        <span className="line-through text-zinc-500 font-medium">{goal.title}</span>
                                        <span className="text-emerald-500 font-bold">Completed</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-zinc-50 dark:bg-[#151515] p-5 rounded-2xl border border-[var(--border)] flex flex-col min-h-[400px]">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Linked Tasks
                    </h3>

                    {!selectedGoal ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-400 space-y-2 py-12">
                            <Target className="w-10 h-10 opacity-30" />
                            <p className="text-sm">Select a goal to view and manage its linked tasks.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 flex-1 flex flex-col">
                            <div className="p-3 bg-white dark:bg-[#1f1f1f] rounded-xl border border-[var(--border)]">
                                <div className="text-xs text-zinc-400 font-medium">Viewing Goal</div>
                                <div className="font-bold text-sm text-[var(--foreground)]">{selectedGoal.title}</div>
                            </div>

                            <div className="space-y-2 overflow-y-auto flex-1 max-h-[500px]">
                                {linkedTasks.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-[var(--border)] rounded-xl">
                                        No tasks linked to this goal yet.
                                    </div>
                                ) : (
                                    linkedTasks.map((task: any) => (
                                        <TaskCard key={task._id} task={task} />
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#1c1c1c] p-6 rounded-2xl shadow-2xl w-full max-w-md border border-[var(--border)] space-y-4">
                        <h3 className="font-bold text-lg text-[var(--foreground)]">
                            {editingGoalId ? "Edit Goal" : "Create New Goal"}
                        </h3>

                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Goal Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Run a half marathon"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-[var(--border)] rounded-xl p-2.5 text-[var(--foreground)] outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="Why is this outcome important?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-[var(--border)] rounded-xl p-2.5 text-[var(--foreground)] outline-none focus:border-emerald-500 resize-none text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-[var(--border)] rounded-xl p-2.5 text-[var(--foreground)] outline-none text-xs"
                                    >
                                        <option value="Personal">Personal</option>
                                        <option value="Health">Health</option>
                                        <option value="Career">Career</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Learning">Learning</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Color Theme</label>
                                    <select
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-[var(--border)] rounded-xl p-2.5 text-[var(--foreground)] outline-none text-xs"
                                    >
                                        <option value="emerald">Emerald</option>
                                        <option value="blue">Blue</option>
                                        <option value="purple">Purple</option>
                                        <option value="amber">Amber</option>
                                        <option value="pink">Pink</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-500 mb-1">Target Date</label>
                                <CustomDatePicker value={targetDate} onChange={(val) => setTargetDate(val)} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveGoal}
                                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow transition-all"
                            >
                                {editingGoalId ? "Update Goal" : "Create Goal"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}