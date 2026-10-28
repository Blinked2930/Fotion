"use client";

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SERIF, formatMinutes, goalHex } from "./theme";
import { ArrowLeft, ArrowRight, Clock, TrendingUp, AlertTriangle, FileText } from "lucide-react";
import { TipTapEditor } from "@/components/editor/TipTapEditor";

export function AnnualReviewWizard({
  sessionId,
  periodKey,
  onFinish,
}: {
  sessionId?: string;
  periodKey: string;
  onFinish: () => void;
}) {
  const data = useQuery(api.annual.getAnnualReviewData, { periodKey, sessionId });
  const ensureReview = useMutation(api.annual.ensureAnnualReview);
  const saveAnswer = useMutation(api.annual.saveAnnualAnswer);
  const completeReview = useMutation(api.annual.completeAnnualReview);

  const [reviewId, setReviewId] = useState<Id<"reviews"> | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (data.review) {
      setReviewId(data.review._id);
    } else {
      ensureReview({ periodKey, sessionId }).then((id) => setReviewId(id as Id<"reviews">));
    }
  }, [data, periodKey, sessionId, ensureReview]);

  useEffect(() => {
    if (!data) return;
    const init: Record<string, string> = {};
    for (const a of data.answers) init[a.promptId] = a.text;
    setLocalAnswers(init);
  }, [data]);

  const template = data?.template ?? null;
  if (!template) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    );
  }

  const currentSection = template.sections[currentSectionIndex];
  const currentPrompt = currentSection.prompts[currentPromptIndex];
  const totalPrompts = template.sections.reduce((sum, s) => sum + s.prompts.length, 0);
  const promptsSoFar = template.sections
    .slice(0, currentSectionIndex)
    .reduce((sum, s) => sum + s.prompts.length, 0) + currentPromptIndex;
  const progress = Math.round(((promptsSoFar + 1) / totalPrompts) * 100);

  const isLastPromptOfSection = currentPromptIndex === currentSection.prompts.length - 1;
  const isLastSection = currentSectionIndex === template.sections.length - 1;
  const isLastPrompt = isLastPromptOfSection && isLastSection;

  const lastYearAnswer = useMemo(() => {
    if (!data?.lastYear?.answers) return null;
    return data.lastYear.answers.find(a => a.promptId === currentPrompt.id);
  }, [data, currentPrompt]);

  const handleAnswerChange = (text: string) => {
    setLocalAnswers(prev => ({ ...prev, [currentPrompt.id]: text }));
  };

  const saveCurrentAnswer = async () => {
    if (!reviewId) return;
    const text = localAnswers[currentPrompt.id] || "";
    try {
      await saveAnswer({ reviewId, promptId: currentPrompt.id, text, sessionId });
    } catch (err) {
      console.error("Failed to save answer:", err);
    }
  };

  const handleNext = async () => {
    setSaving(true);
    await saveCurrentAnswer();
    setSaving(false);
    if (isLastPrompt) {
      await completeReview({ reviewId: reviewId!, sessionId });
      onFinish();
    } else if (isLastPromptOfSection) {
      setCurrentSectionIndex(i => i + 1);
      setCurrentPromptIndex(0);
    } else {
      setCurrentPromptIndex(i => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentPromptIndex === 0) {
      if (currentSectionIndex > 0) {
        setCurrentSectionIndex(i => i - 1);
        setCurrentPromptIndex(template.sections[currentSectionIndex - 1].prompts.length - 1);
      }
    } else {
      setCurrentPromptIndex(i => i - 1);
    }
  };

  const renderEvidence = () => {
    const evidence = data?.evidence;
    if (!evidence) return null;

    const evidencePrompts = [
      "expected-not-completed", "still-important", "lessons", "system-success",
      "valuable-time", "happiness", "success-by-end", "advice-12mo",
    ];
    if (!evidencePrompts.includes(currentPrompt.id)) return null;

    return (
      <div className="mt-8 space-y-4 rounded-2xl border border-black/[0.06] bg-white/40 p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Evidence (data only)
        </div>

        {evidence.totalFocusSeconds > 0 && (
          <div className="flex items-center gap-2 text-[13px] text-[var(--foreground)]">
            <Clock className="h-4 w-4 text-zinc-400" />
            <span className="font-medium">{formatMinutes(evidence.totalFocusSeconds)}</span>
            <span className="text-zinc-500">of focus time logged this year.</span>
          </div>
        )}

        {evidence.focusByGoal.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[12px] text-zinc-500">Top focus time by goal:</div>
            {evidence.focusByGoal.slice(0, 4).map((g) => (
              <div key={g.goalId} className="flex items-center gap-2 text-[12px]">
                <span className="h-2 w-2 rounded-full" style={{ background: goalHex(g.color) }} />
                <span className="truncate text-[var(--foreground)]">{g.title}</span>
                <span className="ml-auto tabular-nums text-zinc-500">{formatMinutes(g.seconds)}</span>
              </div>
            ))}
          </div>
        )}

        {evidence.mostConsistentTasks.length > 0 && (
          <div>
            <div className="text-[12px] text-zinc-500">Most consistent repeating tasks:</div>
            <ul className="mt-1 space-y-0.5">
              {evidence.mostConsistentTasks.map((t, i) => (
                <li key={i} className="flex items-center justify-between text-[12px]">
                  <span className="truncate text-[var(--foreground)]">{t.title}</span>
                  <span className="ml-3 tabular-nums text-zinc-500">{t.count}×</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {evidence.unfinishedGoals.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {evidence.unfinishedGoals.length} unfinished {evidence.unfinishedGoals.length === 1 ? "goal" : "goals"}
            </div>
            <ul className="mt-1 space-y-0.5">
              {evidence.unfinishedGoals.slice(0, 5).map((g) => (
                <li key={g._id} className="text-[12px] text-zinc-500">· {g.title}</li>
              ))}
            </ul>
          </div>
        )}

        {evidence.overdueTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {evidence.overdueTasks.length} overdue {evidence.overdueTasks.length === 1 ? "task" : "tasks"}
            </div>
          </div>
        )}

        {evidence.weeklyRatingTrend.length > 0 && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-zinc-400" />
            <span className="text-[12px] text-zinc-500">Weekly goal ratings: </span>
            <div className="flex items-center gap-0.5">
              {evidence.weeklyRatingTrend.slice(-20).map((w, i) => {
                const color = w.avg <= -1 ? "#ef4444" : w.avg <= 0 ? "#f97316" : w.avg <= 1 ? "#22c55e" : "#10b981";
                return <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />;
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-500 flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-500">
            Annual Review · {periodKey}
          </span>
          <span className="mt-1 text-[13px] text-zinc-500">
            {currentSection.title} · {currentPromptIndex + 1} of {currentSection.prompts.length}
          </span>
        </div>
        <div className="text-[12px] font-semibold tabular-nums text-zinc-500">{progress}%</div>
      </div>

      <div className="mb-10 h-1 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-[var(--foreground)] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2 className={`${SERIF} text-3xl font-medium leading-[1.15] tracking-tight text-[var(--foreground)] sm:text-4xl`}>
        {currentPrompt.text}
      </h2>

      <div className="mt-8">
        <TipTapEditor
          key={currentPrompt.id}
          content={localAnswers[currentPrompt.id] || ""}
          onChange={handleAnswerChange}
          placeholder={currentPrompt.kind === "short" ? "A short answer…" : "Take your time with this one…"}
        />
      </div>

      {lastYearAnswer && lastYearAnswer.text && data && (
        <div className="mt-8 rounded-2xl border border-black/[0.06] bg-zinc-50 p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            <FileText className="h-3.5 w-3.5" />
            Your answer one year ago ({data.lastYear.periodKey})
          </div>
          <div
            className="prose prose-sm prose-zinc mt-3 max-w-none text-[14px] text-zinc-600 dark:prose-invert dark:text-zinc-400"
            dangerouslySetInnerHTML={{ __html: lastYearAnswer.text }}
          />
        </div>
      )}

      {renderEvidence()}

      <div className="mt-12 flex items-center justify-between border-t border-black/[0.06] pt-6 dark:border-white/[0.08]">
        <button
          onClick={handlePrev}
          disabled={currentSectionIndex === 0 && currentPromptIndex === 0}
          className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-black/5 hover:text-[var(--foreground)] dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" /> Previous
        </button>
        <button
          onClick={handleNext}
          disabled={saving || !reviewId}
          className="flex items-center gap-2 rounded-full bg-[var(--foreground)] px-8 py-3 text-sm font-semibold text-[var(--background)] shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {saving ? "Saving..." : isLastPrompt ? "Finish Year" : "Next"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}