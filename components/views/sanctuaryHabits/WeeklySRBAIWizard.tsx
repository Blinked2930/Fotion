"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Sparkles, Trophy, ArrowRight, ShieldCheck, Check } from "lucide-react";
import { SERIF } from "@/components/views/sanctuary/theme";

const SRBAI_QUESTIONS = [
  "I do this habit without having to consciously think about it.",
  "This habit has become automatic for me.",
  "I would find it hard NOT to do this habit.",
  "I execute this habit without needing a conscious reminder.",
];

interface SRBAIWizardProps {
  habits: any[];
  onCheckInSubmit: (data: {
    habitId: string;
    weekStartDate: string;
    srbaiQ1: number;
    srbaiQ2: number;
    srbaiQ3: number;
    srbaiQ4: number;
    perceivedEffort: number;
    stressResilience: number;
  }) => Promise<any>;
  onPromoteQueued: (habitId: string) => Promise<void>;
  onFinish: () => void;
}

export function WeeklySRBAIWizard({
  habits,
  onCheckInSubmit,
  onPromoteQueued,
  onFinish,
}: SRBAIWizardProps) {
  const rampUpHabits = habits.filter((h) => h.status === "ramp_up");
  const maintenanceHabits = habits.filter((h) => h.status === "maintenance");

  const [mode, setMode] = useState<"ramp_up" | "maintenance">(
    rampUpHabits.length > 0 ? "ramp_up" : "maintenance"
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  // Ramp-Up state
  const [q1, setQ1] = useState(4);
  const [q2, setQ2] = useState(4);
  const [q3, setQ3] = useState(4);
  const [q4, setQ4] = useState(4);
  const [effort, setEffort] = useState(3);
  const [resilience, setResilience] = useState(4);

  // Maintenance state
  const [maintenanceRatings, setMaintenanceRatings] = useState<Record<string, boolean>>({});

  const [result, setResult] = useState<any | null>(null);
  const [promotedSuccess, setPromotedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [maintenanceSubmitted, setMaintenanceSubmitted] = useState(false);

  const currentRampUpHabit = rampUpHabits[currentIndex];

  const toggleMaintenanceHabit = (id: string) => {
    setMaintenanceRatings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmitEvaluation = async () => {
    if (!currentRampUpHabit) return;
    setLoading(true);
    const mondayStr = new Date().toISOString().split("T")[0];
    try {
      const res = await onCheckInSubmit({
        habitId: currentRampUpHabit._id,
        weekStartDate: mondayStr,
        srbaiQ1: q1,
        srbaiQ2: q2,
        srbaiQ3: q3,
        srbaiQ4: q4,
        perceivedEffort: effort,
        stressResilience: resilience,
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextHabit = () => {
    setResult(null);
    setPromotedSuccess(false);
    setQ1(4); setQ2(4); setQ3(4); setQ4(4);
    setEffort(3); setResilience(4);
    if (currentIndex + 1 < rampUpHabits.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(rampUpHabits.length);
    }
  };

  const streakCount = result ? result.newStreak : currentRampUpHabit?.consecutiveMaintenanceWeeks ?? 0;

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-[var(--border)] bg-white dark:bg-white/[0.02] p-8 shadow-2xl backdrop-blur-md">
      {/* Tab Switcher for Check-in Type */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-6 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => { setMode("ramp_up"); setCurrentIndex(0); setResult(null); }}
            className={`text-xs font-semibold uppercase tracking-wider pb-2 border-b-2 transition-colors ${
              mode === "ramp_up"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Ramp-Up Automaticity ({rampUpHabits.length})
          </button>
          <button
            onClick={() => { setMode("maintenance"); setResult(null); }}
            className={`text-xs font-semibold uppercase tracking-wider pb-2 border-b-2 transition-colors ${
              mode === "maintenance"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Maintenance Consistency ({maintenanceHabits.length})
          </button>
        </div>
      </div>

      {mode === "ramp_up" ? (
        !currentRampUpHabit ? (
          <div className="text-center py-12 animate-in fade-in">
            <Trophy className="mx-auto h-12 w-12 text-emerald-500 dark:text-emerald-400" />
            <h2 className={`${SERIF} mt-4 text-3xl font-medium text-[var(--foreground)]`}>
              Ramp-Up Evaluations Complete
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Your automaticity streaks have been updated.
            </p>
            {maintenanceHabits.length > 0 && (
              <button
                onClick={() => setMode("maintenance")}
                className="mt-6 rounded-full bg-emerald-500 text-white dark:bg-white dark:text-black px-6 py-2.5 text-xs font-bold hover:bg-emerald-400"
              >
                Proceed to Maintenance Check-In
              </button>
            )}
          </div>
        ) : (
          <div>
            <header className="border-b border-[var(--border)] pb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  SRBAI Automaticity Check-In ({currentIndex + 1} / {rampUpHabits.length})
                </span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((w) => (
                    <div
                      key={w}
                      className={`h-3 w-6 rounded-full transition-all ${
                        w <= streakCount
                          ? "bg-emerald-500 shadow-lg shadow-emerald-500/50"
                          : "bg-zinc-200 dark:bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <h2 className={`${SERIF} mt-2 text-3xl font-medium text-[var(--foreground)]`}>
                {currentRampUpHabit.title}
              </h2>
            </header>

            {!result ? (
              <div className="mt-6 space-y-8">
                <div className="space-y-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    1. Automaticity Index (1 = Disagree, 7 = Agree)
                  </h3>

                  {[
                    { label: SRBAI_QUESTIONS[0], val: q1, setter: setQ1 },
                    { label: SRBAI_QUESTIONS[1], val: q2, setter: setQ2 },
                    { label: SRBAI_QUESTIONS[2], val: q3, setter: setQ3 },
                    { label: SRBAI_QUESTIONS[3], val: q4, setter: setQ4 },
                  ].map((q, idx) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">{q.label}</p>
                      <div className="flex items-center justify-between gap-1">
                        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => q.setter(num)}
                            className={`h-9 flex-1 rounded-xl text-xs font-semibold transition-all ${
                              q.val === num
                                ? "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-black font-bold shadow-md"
                                : "bg-zinc-100 dark:bg-white/5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-white/10"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[var(--border)] pt-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        2. Perceived Effort (1–10)
                      </label>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{effort} / 10</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">Qualifying threshold: &le; 3 (Effortless)</span>
                    <div className="mt-3 flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setEffort(num)}
                          className={`h-8 flex-1 rounded-lg text-xs font-semibold ${
                            effort === num
                              ? "bg-amber-500 text-white font-bold"
                              : "bg-zinc-100 dark:bg-white/5 text-zinc-500"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        3. Stress Resilience (1–5)
                      </label>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{resilience} / 5</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">Qualifying threshold: &ge; 4 (Resilient under strain)</span>
                    <div className="mt-3 flex gap-1">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setResilience(num)}
                          className={`h-8 flex-1 rounded-lg text-xs font-semibold ${
                            resilience === num
                              ? "bg-blue-500 text-white font-bold"
                              : "bg-zinc-100 dark:bg-white/5 text-zinc-500"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSubmitEvaluation}
                    disabled={loading}
                    className="w-full rounded-2xl bg-emerald-500 text-white dark:bg-emerald-400 dark:text-black py-3.5 text-xs font-bold shadow-lg hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {loading ? "Computing Automaticity..." : "Submit SRBAI Evaluation"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-8 space-y-6 animate-in fade-in">
                <div
                  className={`rounded-3xl border p-6 text-center ${
                    result.passed
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                  }`}
                >
                  {result.passed ? (
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="mx-auto h-10 w-10 text-rose-500 dark:text-rose-400" />
                  )}
                  <h3 className={`${SERIF} mt-3 text-2xl font-medium`}>
                    {result.passed ? "Qualifying Check-In Standard Passed!" : "Standard Not Met"}
                  </h3>
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                    Automaticity Index: <strong>{result.srbaiAvg.toFixed(1)} / 7</strong> ({result.calculatedAutomaticityScore}%)
                  </p>
                  <p className="mt-1 text-xs">
                    Consecutive Maintenance Streak: <strong>{result.newStreak} / 5 weeks</strong>
                  </p>
                </div>

                {result.didGraduate && (
                  <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-zinc-800 dark:text-zinc-100">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                      <div>
                        <h4 className={`${SERIF} text-xl font-medium text-amber-600 dark:text-amber-300`}>Habit Graduated to Maintenance!</h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-300">
                          Achieved 5 consecutive qualifying weeks. System slot opened in Ramp-Up.
                        </p>
                      </div>
                    </div>

                    {result.topQueuedHabit && !promotedSuccess && (
                      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-zinc-100 dark:bg-black/40 p-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          #1 Priority Backlog Promotion Ready
                        </span>
                        <h5 className="mt-1 text-base font-semibold">{result.topQueuedHabit.title}</h5>
                        <button
                          onClick={async () => {
                            await onPromoteQueued(result.topQueuedHabit._id);
                            setPromotedSuccess(true);
                          }}
                          className="mt-3 flex items-center justify-center gap-2 w-full rounded-xl bg-amber-500 text-white py-2.5 text-xs font-bold hover:bg-amber-400"
                        >
                          <span>Promote Habit to Active Ramp-Up</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {promotedSuccess && (
                      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/20 p-3 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                        ✓ Priority habit successfully promoted to active Ramp-Up!
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleNextHabit}
                  className="w-full rounded-2xl bg-emerald-500 text-white dark:bg-white dark:text-black py-3.5 text-xs font-bold hover:bg-emerald-400 dark:hover:bg-zinc-200"
                >
                  Continue Next Habit
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        /* Maintenance System Review */
        <div className="space-y-6">
          <header className="border-b border-[var(--border)] pb-4">
            <h2 className={`${SERIF} text-2xl font-medium text-[var(--foreground)]`}>
              Baseline Systems Health Check
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Verify that your graduated baseline habits are maintaining their floor targets without friction.
            </p>
          </header>

          {maintenanceHabits.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-sm">
              No maintenance habits installed yet.
            </div>
          ) : (
            <div className="space-y-3">
              {maintenanceHabits.map((habit) => {
                const isMaintained = maintenanceRatings[habit._id] ?? true;
                return (
                  <div
                    key={habit._id}
                    onClick={() => toggleMaintenanceHabit(habit._id)}
                    className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)] bg-zinc-50 dark:bg-white/5 cursor-pointer transition-all hover:border-emerald-500/40"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--foreground)]">{habit.title}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Target: {habit.targetMetric?.description}</p>
                    </div>
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        isMaintained
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-500 border border-rose-500/30"
                      }`}
                    >
                      {isMaintained ? <Check className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      <span>{isMaintained ? "Baseline Maintained" : "Friction Felt"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={() => { setMaintenanceSubmitted(true); onFinish(); }}
              className="w-full rounded-2xl bg-emerald-500 text-white dark:bg-white dark:text-black py-3.5 text-xs font-bold hover:bg-emerald-400"
            >
              Complete Maintenance Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}