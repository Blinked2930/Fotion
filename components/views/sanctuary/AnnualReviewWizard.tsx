"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SERIF, formatMinutes, goalHex } from "./theme";
import {
  ArrowLeft, ArrowRight, Clock, TrendingUp, AlertTriangle, FileText, ListPlus, Check,
} from "lucide-react";
import { TipTapEditor } from "@/components/editor/TipTapEditor";

const AUTOSAVE_MS = 800;

// Prompts whose answers can be turned into real tasks.
const TASK_PROMPTS: Record<string, { heading: string; hint: string }> = {
  conversations: {
    heading: "Turn these into tasks",
    hint: "Each line of your answer becomes a task you can act on.",
  },
  "habits-start-stop": {
    heading: "Turn these into tasks",
    hint: "Pick the habits you want on your list. Tick only the ones to start.",
  },
};

// Pulls one line item per list item (or per paragraph) out of a TipTap answer.
function extractLines(html: string): string[] {
  if (!html || typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");

  let nodes = Array.from(doc.querySelectorAll("li"));
  if (nodes.length === 0) nodes = Array.from(doc.querySelectorAll("p, h1, h2, h3"));

  const seen = new Set<string>();
  const lines: string[] = [];
  for (const node of nodes) {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("ul, ol").forEach((n) => n.remove());
    const text = (clone.textContent || "").replace(/\s+/g, " ").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    lines.push(text.length > 200 ? `${text.slice(0, 197)}…` : text);
    if (lines.length >= 25) break;
  }
  return lines;
}

function PlanTaskPanel({
  promptId,
  html,
  periodKey,
  sessionId,
}: {
  promptId: string;
  html: string;
  periodKey: string;
  sessionId?: string;
}) {
  const createManyTasks = useMutation(api.tasks.createManyTasks);
  const storageKey = `fotion-annual-created:${periodKey}:${promptId}`;

  const [created, setCreated] = useState<string[]>([]);
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remember which lines already became tasks so they aren't created twice.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setCreated(raw ? JSON.parse(raw) : []);
    } catch {
      setCreated([]);
    }
  }, [storageKey]);

  const lines = useMemo(() => extractLines(html), [html]);
  const pending = lines.filter((l) => !created.includes(l));
  const selected = pending.filter((l) => !unchecked.has(l));
  const alreadyCreated = lines.filter((l) => created.includes(l));

  if (lines.length === 0) return null;
  const copy = TASK_PROMPTS[promptId];

  const toggle = (line: string) => {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  };

  const handleCreate = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await createManyTasks({
        tasks: selected.map((title) => ({
          title,
          isUrgent: false,
          isImportant: true,
          isForFunsies: false,
          status: "todo" as const,
          listCategory: "Current" as const,
          isToday: false,
          doOnDate: null,
          doByDate: null,
          projectId: null,
          sessionId,
        })),
      });
      const next = [...created, ...selected];
      setCreated(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error("Could not create tasks from answer:", err);
      setError("Couldn’t create the tasks. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-black/[0.06] bg-white/40 p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        <ListPlus className="h-3.5 w-3.5" />
        {copy.heading}
      </div>
      <p className="mt-2 text-[13px] text-zinc-500">{copy.hint}</p>

      <ul className="mt-4 space-y-1.5">
        {pending.map((line) => {
          const checked = !unchecked.has(line);
          return (
            <li key={line}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-1.5 text-[14px] text-[var(--foreground)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(line)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--foreground)]"
                />
                <span className="leading-snug">{line}</span>
              </label>
            </li>
          );
        })}
        {alreadyCreated.map((line) => (
          <li
            key={line}
            className="flex items-start gap-3 px-2 py-1.5 text-[14px] text-zinc-400"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span className="leading-snug line-through decoration-zinc-300 dark:decoration-zinc-600">
              {line}
            </span>
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}

      {pending.length > 0 && (
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy || selected.length === 0}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-semibold text-[var(--background)] outline-none transition-all hover:opacity-90 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 active:scale-95 disabled:opacity-40 motion-reduce:transition-none"
        >
          {busy
            ? "Creating…"
            : `Create ${selected.length} ${selected.length === 1 ? "task" : "tasks"}`}
        </button>
      )}
    </div>
  );
}

export function AnnualReviewWizard({
  sessionId,
  periodKey,
  onFinish,
}: {
  sessionId?: string;
  periodKey: string;
  onFinish: () => void;
}) {
  // ---------------------------------------------------------------------------
  // ALL hooks live above the early returns below. (Previously a useMemo sat
  // after `if (!template) return ...`, so the hook count changed once the data
  // loaded and React threw "rendered more hooks than during the previous
  // render" - a likely cause of the Year tab crash.)
  // ---------------------------------------------------------------------------
  const data = useQuery(
    api.annual.getAnnualReviewData,
    periodKey ? { periodKey, sessionId } : "skip"
  );
  const ensureReview = useMutation(api.annual.ensureAnnualReview);
  const saveAnswer = useMutation(api.annual.saveAnnualAnswer);
  const completeReview = useMutation(api.annual.completeAnnualReview);

  const [reviewId, setReviewId] = useState<Id<"reviews"> | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const reviewIdRef = useRef<Id<"reviews"> | null>(null);
  const pendingRef = useRef<{ promptId: string; text: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersInitializedRef = useRef(false);
  const ensureStartedRef = useRef(false);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  // Write whatever answer is waiting to be saved.
  const flushPending = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    const id = reviewIdRef.current;
    if (!pending || !id) return;
    pendingRef.current = null;
    setSaveState("saving");
    try {
      await saveAnswer({ reviewId: id, promptId: pending.promptId, text: pending.text, sessionId });
      setSaveState("saved");
    } catch (err) {
      console.error("Failed to save answer:", err);
      // Put it back so the next flush retries.
      pendingRef.current = pendingRef.current ?? pending;
      setSaveState("idle");
    }
  };
  flushRef.current = flushPending;

  // Find or create the review row once.
  useEffect(() => {
    if (!data) return;
    if (data.review) {
      reviewIdRef.current = data.review._id;
      setReviewId(data.review._id);
      return;
    }
    if (ensureStartedRef.current) return;
    ensureStartedRef.current = true;
    ensureReview({ periodKey, sessionId })
      .then((id) => {
        reviewIdRef.current = id as Id<"reviews">;
        setReviewId(id as Id<"reviews">);
      })
      .catch((err) => {
        ensureStartedRef.current = false;
        console.error("Failed to start annual review:", err);
      });
  }, [data, periodKey, sessionId, ensureReview]);

  // Seed local answers from the server exactly once, so later live-query
  // updates can never overwrite what the person is currently typing.
  useEffect(() => {
    if (!data || answersInitializedRef.current) return;
    answersInitializedRef.current = true;
    const init: Record<string, string> = {};
    for (const a of data.answers) init[a.promptId] = a.text;
    setLocalAnswers(init);
  }, [data]);

  // If typing happened before the review row existed, save it as soon as it does.
  useEffect(() => {
    if (reviewId && pendingRef.current) void flushRef.current();
  }, [reviewId]);

  // Save anything still pending if the wizard unmounts (Back, tab switch, close).
  useEffect(() => {
    return () => {
      void flushRef.current();
    };
  }, []);

  const template = data?.template ?? null;
  const currentPromptId = template?.sections[currentSectionIndex]?.prompts[currentPromptIndex]?.id;

  const lastYearAnswer = useMemo(() => {
    if (!currentPromptId) return null;
    return data?.lastYear?.answers?.find((a) => a.promptId === currentPromptId) ?? null;
  }, [data, currentPromptId]);

  // ---------------------------------------------------------------------------
  // Early returns (safe: every hook has already run)
  // ---------------------------------------------------------------------------
  if (!periodKey) {
    return <div className="p-8 text-center text-zinc-500">No review period.</div>;
  }

  if (!template) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 motion-reduce:animate-none" />
      </div>
    );
  }

  const currentSection = template.sections[currentSectionIndex];
  const currentPrompt = currentSection.prompts[currentPromptIndex];
  const totalPrompts = template.sections.reduce((sum, s) => sum + s.prompts.length, 0);
  const promptsSoFar =
    template.sections
      .slice(0, currentSectionIndex)
      .reduce((sum, s) => sum + s.prompts.length, 0) + currentPromptIndex;
  const progress = Math.round(((promptsSoFar + 1) / totalPrompts) * 100);

  const isLastPromptOfSection = currentPromptIndex === currentSection.prompts.length - 1;
  const isLastSection = currentSectionIndex === template.sections.length - 1;
  const isLastPrompt = isLastPromptOfSection && isLastSection;

  const handleAnswerChange = (text: string) => {
    const promptId = currentPrompt.id;
    setLocalAnswers((prev) => ({ ...prev, [promptId]: text }));
    pendingRef.current = { promptId, text };
    setSaveState("idle");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flushRef.current();
    }, AUTOSAVE_MS);
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      await flushPending();
      if (isLastPrompt) {
        await completeReview({ reviewId: reviewId!, sessionId });
        onFinish();
      } else if (isLastPromptOfSection) {
        setCurrentSectionIndex((i) => i + 1);
        setCurrentPromptIndex(0);
      } else {
        setCurrentPromptIndex((i) => i + 1);
      }
    } catch (err) {
      console.error("Could not continue the annual review:", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePrev = async () => {
    await flushPending();
    if (currentPromptIndex === 0) {
      if (currentSectionIndex > 0) {
        setCurrentSectionIndex((i) => i - 1);
        setCurrentPromptIndex(template.sections[currentSectionIndex - 1].prompts.length - 1);
      }
    } else {
      setCurrentPromptIndex((i) => i - 1);
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
    <div className="mx-auto flex w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-500 flex-col motion-reduce:animate-none">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-500">
            Annual Review · {periodKey}
          </span>
          <span className="mt-1 text-[13px] text-zinc-500">
            {currentSection.title} · {currentPromptIndex + 1} of {currentSection.prompts.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            aria-live="polite"
            className="text-[11px] font-medium text-zinc-400"
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
          </span>
          <div className="text-[12px] font-semibold tabular-nums text-zinc-500">{progress}%</div>
        </div>
      </div>

      <div className="mb-10 h-1 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-[var(--foreground)] transition-all duration-500 motion-reduce:transition-none"
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

      {TASK_PROMPTS[currentPrompt.id] && (
        <PlanTaskPanel
          key={currentPrompt.id}
          promptId={currentPrompt.id}
          html={localAnswers[currentPrompt.id] || ""}
          periodKey={periodKey}
          sessionId={sessionId}
        />
      )}

      {lastYearAnswer && lastYearAnswer.text && data?.lastYear && (
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
          disabled={(currentSectionIndex === 0 && currentPromptIndex === 0) || saving}
          className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-zinc-500 outline-none transition-colors hover:bg-black/5 hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-30 motion-reduce:transition-none dark:hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" /> Previous
        </button>
        <button
          onClick={handleNext}
          disabled={saving || !reviewId}
          className="flex items-center gap-2 rounded-full bg-[var(--foreground)] px-8 py-3 text-sm font-semibold text-[var(--background)] shadow-lg outline-none transition-all hover:opacity-90 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 active:scale-95 disabled:opacity-50 motion-reduce:transition-none"
        >
          {saving ? "Saving..." : isLastPrompt ? "Finish Year" : "Next"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}