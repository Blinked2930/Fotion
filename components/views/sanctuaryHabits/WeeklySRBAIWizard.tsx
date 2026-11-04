"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Sparkles, Trophy, ArrowRight, X } from "lucide-react";
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
  const [currentIndex, setCurrentIndex] = useState(0);

  const [q1, setQ1] = useState(4);
  const [q2, setQ2] = useState(4);
  const [q3, setQ3] = useState(4);
  const [q4, setQ4] = useState(4);
  const [effort, setEffort] = useState(5);
  const [resilience, setResilience] = useState(3);

  const [result, setResult] = useState<any | null>(null);
  const [promotedSuccess, setPromotedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentHabit = rampUpHabits[currentIndex];

  if (!currentHabit) {
    return (
      <div className="mx-auto max-w-xl text-center py-16 animate-in fade-in">
        <Trophy className="mx-auto h-12 w-12 text-emerald-400" />
        <h2 className={`${SERIF} mt-4 text-3xl font-medium`}>All Active Habits Reviewed</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Your weekly automaticity scores have been computed and streaks updated.
        </p>
        <button
          onClick={onFinish}
          className="mt-6 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-black hover:bg-zinc-200"
        >
          Return to Habit Dashboard
        </button>
      </div>
    );
  }

  const handleSubmitEvaluation = async () => {
    setLoading(true);
    const mondayStr = new Date().toISOString().split("T")[0];
    try {
      const res = await onCheckInSubmit({
        habitId: currentHabit._id,
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
    setEffort(5); setResilience(3);
    setCurrentIndex((prev) => prev + 1);
  };

  const streakCount = result ? result.newStreak : currentHabit.consecutiveMaintenanceWeeks ?? 0;

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.02] p-8 shadow-2xl backdrop-blur-md">
      <header className="border-b border-white/10 pb-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            SRBAI Automaticity Protocol ({currentIndex + 1} / {rampUpHabits.length})
          </span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((w) => (
              <div
                key={w}
                className={`h-3 w-6 rounded-full transition-all ${
                  w <= streakCount
                    ? "bg-emerald-400 shadow-lg shadow-emerald-500/50"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
        <h2 className={`${SERIF} mt-2 text-3xl font-medium text-white`}>{currentHabit.title}</h2>
      </header>

      {!result ? (
        <div className="mt-6 space-y-8">
          <div className="space-y-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              1. Behavioral Automaticity Index (1 = Strongly Disagree, 7 = Strongly Agree)
            </h3>

            {[
              { label: SRBAI_QUESTIONS[0], val: q1, setter: setQ1 },
              { label: SRBAI_QUESTIONS[1], val: q2, setter: setQ2 },
              { label: SRBAI_QUESTIONS[2], val: q3, setter: setQ3 },
              { label: SRBAI_QUESTIONS[3], val: q4, setter: setQ4 },
            ].map((q, idx) => (
              <div key={idx} className="space-y-2">
                <p className="text-xs text-zinc-300">{q.label}</p>
                <div className="flex items-center justify-between gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => q.setter(num)}
                      className={`h-9 flex-1 rounded-xl text-xs font-semibold transition-all ${
                        q.val === num
                          ? "bg-emerald-400 font-bold text-black shadow-md"
                          : "bg-white/5 text-zinc-400 hover:bg-white/10"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Perceived Effort (1–10)
              </label>
              <span className="text-[11px] text-zinc-500">Qualifying standard: &le; 3</span>
              <input
                type="range"
                min={1}
                max={10}
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value))}
                className="mt-3 w-full accent-emerald-400"
              />
              <div className="mt-1 text-right text-xs font-bold text-emerald-400">{effort} / 10</div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Stress Resilience (1–5)
              </label>
              <span className="text-[11px] text-zinc-500">Qualifying standard: &ge; 4</span>
              <input
                type="range"
                min={1}
                max={5}
                value={resilience}
                onChange={(e) => setResilience(Number(e.target.value))}
                className="mt-3 w-full accent-emerald-400"
              />
              <div className="mt-1 text-right text-xs font-bold text-emerald-400">{resilience} / 5</div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSubmitEvaluation}
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-400 py-3.5 text-xs font-bold text-black shadow-lg hover:bg-emerald-300 disabled:opacity-50"
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
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {result.passed ? (
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            ) : (
              <XCircle className="mx-auto h-10 w-10 text-rose-400" />
            )}
            <h3 className={`${SERIF} mt-3 text-2xl font-medium`}>
              {result.passed ? "Qualifying Check-In Standard Passed!" : "Standard Not Met"}
            </h3>
            <p className="mt-2 text-xs text-zinc-300">
              Automaticity Index: <strong className="text-white">{result.srbaiAvg.toFixed(1)} / 7</strong> ({result.calculatedAutomaticityScore}%)
            </p>
            <p className="mt-1 text-xs">
              Consecutive Maintenance Streak: <strong className="text-white">{result.newStreak} / 5 weeks</strong>
            </p>
          </div>

          {result.didGraduate && (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-zinc-100 animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-amber-400" />
                <div>
                  <h4 className={`${SERIF} text-xl font-medium text-amber-300`}>Habit Graduated to Maintenance!</h4>
                  <p className="text-xs text-zinc-300">
                    Achieved 5 consecutive qualifying weeks. System slot opened in Ramp-Up.
                  </p>
                </div>
              </div>

              {result.topQueuedHabit && !promotedSuccess && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    #1 Priority Backlog Promotion Ready
                  </span>
                  <h5 className="mt-1 text-base font-semibold">{result.topQueuedHabit.title}</h5>
                  <button
                    onClick={async () => {
                      await onPromoteQueued(result.topQueuedHabit._id);
                      setPromotedSuccess(true);
                    }}
                    className="mt-3 flex items-center justify-center gap-2 w-full rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-black hover:bg-amber-300"
                  >
                    <span>Promote Habit to Active Ramp-Up</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {promotedSuccess && (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/20 p-3 text-center text-xs font-semibold text-emerald-300">
                  ✓ Priority habit successfully promoted to active Ramp-Up!
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleNextHabit}
            className="w-full rounded-2xl bg-white py-3.5 text-xs font-bold text-black hover:bg-zinc-200"
          >
            Continue Next Habit
          </button>
        </div>
      )}
    </div>
  );
}