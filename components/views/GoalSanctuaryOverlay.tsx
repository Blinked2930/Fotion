"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Sparkles, ChevronRight, ArrowLeft, BookOpen } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useOfflineSyncMutation, useOfflineQuery } from "@/hooks/useOfflineMutation";
import { getBrowserTimeZone } from "@/convex/recurrence";
import { useQuery } from "convex/react";

import { GoalCard } from "@/components/views/sanctuary/GoalCard";
import { GoalChapter } from "@/components/views/sanctuary/GoalChapter";
import { GoalEditorModal, type GoalFormValues } from "@/components/views/sanctuary/GoalEditorModal";
import { SanctuaryConfirmModal } from "@/components/views/sanctuary/SanctuaryConfirmModal";
import { SERIF, SOFT_GOAL_CAP, needsReview, goalHex } from "@/components/views/sanctuary/theme";
import { AlignScreen } from "@/components/views/sanctuary/AlignScreen";
import { CheckInWizard } from "@/components/views/sanctuary/CheckInWizard";
import { QuarterlyReviewWizard } from "@/components/views/sanctuary/QuarterlyReviewWizard";
import { AnnualReviewWizard } from "@/components/views/sanctuary/AnnualReviewWizard";
import { AnnualReviewExport } from "@/components/views/sanctuary/AnnualReviewExport";

type SanctuaryTab = "goals" | "align" | "checkin" | "review" | "year";

export function GoalSanctuaryOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const sessionId = useGuestSession();
  const goals: any[] =
    useOfflineQuery(api.goals.getGoals, { sessionId: sessionId ?? undefined }, "getGoals") || [];

  const quarterlyStatus = useQuery(api.quarterly.isQuarterlyReviewDue, { sessionId: sessionId ?? undefined });
  const solsticeStatus = useQuery(api.annual.isSolsticeReviewDue, { sessionId: sessionId ?? undefined });

  // Historical annual reviews (completed only), for the Past years picker.
  // Rendered only inside the Year tab and only when there's at least one prior
  // year — the current year is handled by the main Year UI.
  const completedAnnualReviews = useQuery(
    api.annual.listCompletedAnnualReviews,
    { sessionId: sessionId ?? undefined }
  );

  const createGoal = useOfflineSyncMutation(api.goals.createGoal, "createGoal");
  const updateGoal = useOfflineSyncMutation(api.goals.updateGoal, "updateGoal");
  const deleteGoal = useOfflineSyncMutation(api.goals.deleteGoal, "deleteGoal");
  const createPlanAndTask = useOfflineSyncMutation(
    api.goalDetails.createPlanAndTask,
    "createPlanAndTask"
  );

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<SanctuaryTab>("goals");
  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; goal: any | null }>({
    open: false,
    goal: null,
  });
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  // True when the user explicitly starts / re-opens the annual review outside
  // of the solstice window (testing, early start, or editing a completed year).
  const [annualForced, setAnnualForced] = useState(false);
  // Set when the user opens a past year from the "Past years" picker. When set,
  // the Year tab renders the wizard in read-only mode for that periodKey, with
  // a banner to return to the current year.
  const [historicalPeriodKey, setHistoricalPeriodKey] = useState<string | null>(null);

  // Lets the quarterly review genuinely wait for the goal editor: the promise
  // returned from onAdjustGoal resolves when the editor is saved or closed.
  const adjustResolver = useRef<(() => void) | null>(null);

  const closeEditor = () => {
    setEditor({ open: false, goal: null });
    if (adjustResolver.current) {
      adjustResolver.current();
      adjustResolver.current = null;
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setOpenGoalId(null);
      setEditor({ open: false, goal: null });
      setPendingDelete(null);
      setActiveTab("goals");
      setAnnualForced(false);
      setHistoricalPeriodKey(null);
      if (adjustResolver.current) {
        adjustResolver.current();
        adjustResolver.current = null;
      }
    }
  }, [isOpen]);

  // Leaving the Year tab always drops the "forced" early/edit mode and the
  // historical review view.
  useEffect(() => {
    if (activeTab !== "year") {
      setAnnualForced(false);
      setHistoricalPeriodKey(null);
    }
  }, [activeTab]);

  // One-step-back navigation, shared by the Back button and Escape.
  const goBackOneLevel = () => {
    if (openGoalId) setOpenGoalId(null);
    else if (activeTab !== "goals") setActiveTab("goals");
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pendingDelete) setPendingDelete(null);
      else if (editor.open) closeEditor();
      else if (historicalPeriodKey) setHistoricalPeriodKey(null);
      else if (openGoalId) setOpenGoalId(null);
      else if (activeTab !== "goals") setActiveTab("goals");
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editor.open, openGoalId, pendingDelete, activeTab, historicalPeriodKey, onClose]);

  if (!isOpen || !mounted) return null;

  const activeGoals = goals.filter((g) => !g.status || g.status === "active");
  const pausedGoals = goals.filter((g) => g.status === "paused");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const retiredGoals = goals.filter((g) => g.status === "retired");

  const dueCount = activeGoals.filter(needsReview).length;
  const openGoal = openGoalId ? goals.find((g) => g._id === openGoalId) : null;
  const reviewDue = quarterlyStatus?.due;

  // At the top level the button closes the Sanctuary. Anywhere deeper (an open
  // goal, or any tab other than Goals) it steps back instead, so a stray click
  // while in the middle of a review never throws you out of the Sanctuary.
  const atHome = !openGoal && activeTab === "goals";

  // Annual review period: prefer the server's key; fall back to the current
  // year's solstice key so the review can be started/tested at any time.
  const annualPeriodKey =
    solsticeStatus?.periodKey || `${new Date().getFullYear()}-solstice`;

  // The periodKey the Year tab should render. When browsing a past year, it's
  // the historical key; otherwise it's the current-year key.
  const effectiveYearKey = historicalPeriodKey ?? annualPeriodKey;

  // Past years: completed reviews for this session, excluding whichever year
  // is currently active (so we don't duplicate the current year card).
  const pastYears =
    (completedAnnualReviews ?? []).filter((r) => r.periodKey !== annualPeriodKey);

  const handleSave = async (v: GoalFormValues) => {
    if (editor.goal) {
      await updateGoal({
        id: editor.goal._id as Id<"goals">,
        title: v.title,
        description: v.description,
        targetDate: v.targetDate,
        category: v.category,
        color: v.color,
        reviewCycle: v.reviewCycle,
      });
      closeEditor();
      return;
    }

    const newGoalId = await createGoal({
      title: v.title,
      description: v.description || undefined,
      targetDate: v.targetDate,
      category: v.category,
      color: v.color,
      reviewCycle: v.reviewCycle,
      kind: v.kind,
      sessionId: sessionId ?? undefined,
    });

    if (v.initialPlan && newGoalId) {
      try {
        await createPlanAndTask({
          goalId: newGoalId as Id<"goals">,
          trigger: v.initialPlan.trigger,
          action: v.initialPlan.action,
          makeRepeat: v.initialPlan.makeRepeat,
          tz: getBrowserTimeZone(),
          sessionId: sessionId ?? undefined,
        });
      } catch (err) {
        console.error("Could not save initial plan:", err);
      }
    }

    closeEditor();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteGoal({ id: pendingDelete._id as Id<"goals"> });
    } catch (err) {
      console.error("Could not delete goal:", err);
    } finally {
      setPendingDelete(null);
    }
  };

  // IMPORTANT: this is a plain render function, NOT a component.
  // Declaring it as a component inside the overlay made React remount every
  // row on each re-render, which swallowed clicks.
  //
  // Now rendered inside a responsive grid (1 / 2 / 3 columns) so the paused,
  // completed, and retired sections read as tidy card grids instead of one
  // long full-width row per goal.
  const renderInactiveGoalRow = (goal: any) => (
    <button
      key={goal._id}
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenGoalId(goal._id);
      }}
      className="group relative flex min-h-11 w-full min-w-0 cursor-pointer touch-manipulation items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-white/40 px-4 py-3 text-left outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-black/[0.1] hover:bg-white/70 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-zinc-400 active:scale-[0.995] dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="h-2 w-2 shrink-0 rounded-full opacity-70"
          style={{ background: goalHex(goal.color) }}
        />
        <span className={`${SERIF} truncate text-[15px] text-zinc-600 transition-colors group-hover:text-[var(--foreground)] dark:text-zinc-400 dark:group-hover:text-[var(--foreground)]`}>
          {goal.title}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none" />
    </button>
  );

  const tabClass = (tab: SanctuaryTab) =>
    `rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 ${
      activeTab === tab
        ? "text-[var(--foreground)]"
        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
    }`;

  const yearHeading = (title: string) => (
    <h1 className={`${SERIF} text-5xl font-medium leading-[1.04] tracking-tight text-[var(--foreground)] sm:text-7xl`}>
      {title}
    </h1>
  );

  return createPortal(
    <div className="fixed inset-0 z-[240] animate-in fade-in duration-500 motion-reduce:animate-none">
      <div className="pointer-events-none absolute inset-0 bg-[#f6f2ea] dark:bg-[#0c0c12]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_15%_0%,rgba(99,102,241,0.16),transparent),radial-gradient(45%_40%_at_95%_8%,rgba(236,72,153,0.11),transparent)]" />

      <div className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-6xl flex-col">
        {/* Header: safe-area aware on all four sides so the close/back button,
            section nav, and "The Sanctuary" label never collide with the
            notch, dynamic island, or rounded display corners. */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 px-[max(1.5rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10 sm:pt-9">
          <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-zinc-500 dark:text-zinc-400">
            The Sanctuary
          </span>

          {atHome ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Sanctuary"
              className="order-2 flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 outline-none transition-all hover:bg-black/5 hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-zinc-400 active:scale-95 motion-reduce:transition-none dark:hover:bg-white/10 sm:order-3 sm:h-auto sm:w-auto sm:p-3"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={goBackOneLevel}
              aria-label="Back to goals"
              className="order-2 inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium text-zinc-500 outline-none transition-all hover:bg-black/5 hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-zinc-400 active:scale-95 motion-reduce:transition-none dark:hover:bg-white/10 sm:order-3"
            >
              <ArrowLeft className="h-4 w-4" />
              {openGoal ? "All goals" : "Back"}
            </button>
          )}

          {!openGoal && (
            <nav
              aria-label="Sanctuary sections"
              className="order-3 flex w-full items-center gap-4 overflow-x-auto text-[13px] font-medium [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:order-2 sm:w-auto sm:flex-1 sm:pl-6"
            >
              <button
                onClick={() => setActiveTab("goals")}
                className={`${tabClass("goals")} inline-flex min-h-11 touch-manipulation items-center`}
              >
                Goals
              </button>
              <button
                onClick={() => setActiveTab("align")}
                className={`${tabClass("align")} inline-flex min-h-11 touch-manipulation items-center`}
              >
                Align
              </button>
              <button
                onClick={() => setActiveTab("checkin")}
                className={`${tabClass("checkin")} inline-flex min-h-11 touch-manipulation items-center`}
              >
                Check-in
              </button>
              <button
                onClick={() => setActiveTab("review")}
                className={`relative flex min-h-11 touch-manipulation items-center gap-1.5 ${tabClass("review")}`}
              >
                Review
                {reviewDue && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 motion-reduce:animate-none" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("year")}
                className={`relative flex min-h-11 touch-manipulation items-center gap-1.5 ${tabClass("year")}`}
              >
                Year
                {solsticeStatus?.due && (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
                )}
              </button>
            </nav>
          )}
        </div>

        {/* Scroll body: horizontal + bottom safe-area insets so cards, lists,
            and the wizard footer never slide under the home indicator or the
            display's rounded corners. `overscroll-contain` keeps the rubber-
            band from propagating to the page behind the portal. */}
        <div
          className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-[max(1.5rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-8 pb-[max(7rem,calc(4rem+env(safe-area-inset-bottom)))] sm:px-10"
        >
          {openGoal ? (
            <GoalChapter
              goal={openGoal}
              tasks={[]}
              onBack={() => setOpenGoalId(null)}
              onEdit={() => setEditor({ open: true, goal: openGoal })}
              onMarkReviewed={() =>
                updateGoal({
                  id: openGoal._id as Id<"goals">,
                  lastReviewedAt: Date.now(),
                })
              }
              sessionId={sessionId ?? undefined}
            />
          ) : activeTab === "goals" ? (
            <div className="animate-in fade-in duration-500 motion-reduce:animate-none">
              <header className="max-w-3xl">
                <h1
                  className={`${SERIF} text-5xl font-medium leading-[1.04] tracking-tight text-[var(--foreground)] sm:text-7xl`}
                >
                  Where you&rsquo;re headed.
                </h1>
                <p className="mt-5 text-[15px] text-zinc-500 dark:text-zinc-400">
                  {activeGoals.length === 0
                    ? "Nothing here yet. Start with the one that matters most."
                    : `${activeGoals.length} active ${activeGoals.length === 1 ? "goal" : "goals"}`}
                  {dueCount > 0 && (
                    <span className="ml-3 inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 motion-reduce:animate-none" />
                      {dueCount} due for review
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setEditor({ open: true, goal: null })}
                  className="mt-8 inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-[var(--background)] shadow-lg outline-none transition-all hover:opacity-90 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none"
                >
                  <Plus className="h-4 w-4" /> New goal
                </button>
                {activeGoals.length > SOFT_GOAL_CAP && (
                  <p className={`${SERIF} mt-5 text-[15px] italic text-zinc-500`}>
                    You&rsquo;re holding {activeGoals.length} goals. A shorter list leaves each one more room.
                  </p>
                )}
              </header>

              {activeGoals.length === 0 ? (
                <div className="mx-auto mt-20 flex max-w-md flex-col items-center text-center">
                  <Sparkles className="h-8 w-8 text-zinc-400" />
                  <p className={`${SERIF} mt-5 text-2xl italic text-zinc-600 dark:text-zinc-300`}>
                    What would make this year count?
                  </p>
                </div>
              ) : (
                <div className="mt-14 grid gap-6 lg:grid-cols-2">
                  {activeGoals.map((goal, i) => (
                    <GoalCard
                      key={goal._id}
                      goal={goal}
                      index={i}
                      onOpen={() => setOpenGoalId(goal._id)}
                      onEdit={() => setEditor({ open: true, goal })}
                      onDelete={() => setPendingDelete(goal)}
                    />
                  ))}
                </div>
              )}

              {pausedGoals.length > 0 && (
                <section className="relative z-10 mt-16 border-t border-black/[0.07] pt-8 dark:border-white/10">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    Paused
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {pausedGoals.map((g) => renderInactiveGoalRow(g))}
                  </div>
                </section>
              )}

              {completedGoals.length > 0 && (
                <section className="relative z-10 mt-12 border-t border-black/[0.07] pt-8 dark:border-white/10">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    Completed
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {completedGoals.map((g) => renderInactiveGoalRow(g))}
                  </div>
                </section>
              )}

              {retiredGoals.length > 0 && (
                <section className="relative z-10 mt-12 border-t border-black/[0.07] pt-8 dark:border-white/10">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    Retired
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {retiredGoals.map((g) => renderInactiveGoalRow(g))}
                  </div>
                </section>
              )}
            </div>
          ) : activeTab === "align" ? (
            <AlignScreen sessionId={sessionId ?? undefined} />
          ) : activeTab === "checkin" ? (
            <CheckInWizard
              sessionId={sessionId ?? undefined}
              goals={activeGoals}
              onFinish={() => setActiveTab("goals")}
            />
          ) : activeTab === "review" ? (
            <QuarterlyReviewWizard
              sessionId={sessionId ?? undefined}
              onFinish={() => setActiveTab("goals")}
              onAdjustGoal={(goal) =>
                new Promise<void>((resolve) => {
                  adjustResolver.current = resolve;
                  setEditor({ open: true, goal });
                })
              }
            />
          ) : !solsticeStatus ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 motion-reduce:animate-none" />
            </div>
          ) : historicalPeriodKey ? (
            // Read-only view of a past year. The banner makes it obvious you're
            // not looking at the current year, with a one-click way back.
            <div className="mx-auto flex w-full max-w-3xl flex-col">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-white/40 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
                <span className="flex items-center gap-2 text-[13px] text-zinc-600 dark:text-zinc-300">
                  <BookOpen className="h-4 w-4 text-zinc-400" />
                  Reading <span className="font-semibold">{historicalPeriodKey}</span>
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <AnnualReviewExport periodKey={historicalPeriodKey} sessionId={sessionId ?? undefined} />
                  <button
                    type="button"
                    onClick={() => setHistoricalPeriodKey(null)}
                    className="inline-flex min-h-9 touch-manipulation items-center rounded-full px-4 py-2 text-[12px] font-medium text-zinc-500 outline-none transition-all hover:bg-black/5 hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-zinc-400 active:scale-95 motion-reduce:transition-none dark:hover:bg-white/10"
                  >
                    Back to current year
                  </button>
                </div>
              </div>
              <AnnualReviewWizard
                sessionId={sessionId ?? undefined}
                periodKey={historicalPeriodKey}
                onFinish={() => setHistoricalPeriodKey(null)}
                readOnly
              />
            </div>
          ) : annualForced || (solsticeStatus.due && !solsticeStatus.completed) ? (
            <div className="flex flex-col gap-6">
              {!solsticeStatus.due && (
                <p className="mx-auto w-full max-w-2xl rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-[13px] text-amber-700 dark:text-amber-300">
                  {solsticeStatus.completed
                    ? "Editing a completed review. Your changes save as you go."
                    : "Early start. This isn’t the solstice yet, but your answers save as you go and will be waiting on December 21."}
                </p>
              )}
              <AnnualReviewWizard
                sessionId={sessionId ?? undefined}
                periodKey={annualPeriodKey}
                onFinish={() => {
                  setAnnualForced(false);
                  setActiveTab("goals");
                }}
              />
            </div>
          ) : solsticeStatus.completed ? (
            <div className="mx-auto flex w-full max-w-2xl flex-col">
              <header className="max-w-3xl">
                {yearHeading("The year, in review.")}
                <p className="mt-5 text-[15px] text-zinc-500 dark:text-zinc-400">
                  {annualPeriodKey} is complete. You can re-read it, edit it, or export it.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAnnualForced(true)}
                    className="inline-flex min-h-11 touch-manipulation items-center rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-semibold text-[var(--background)] outline-none transition-all hover:opacity-90 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none"
                  >
                    Edit review
                  </button>
                  <AnnualReviewExport periodKey={annualPeriodKey} sessionId={sessionId ?? undefined} />
                </div>
              </header>

              {pastYears.length > 0 && (
                <section className="mt-12 border-t border-black/[0.07] pt-8 dark:border-white/10">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    Past years
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {pastYears.map((r) => (
                      <button
                        key={r.periodKey}
                        type="button"
                        onClick={() => setHistoricalPeriodKey(r.periodKey)}
                        className="group flex min-h-11 w-full min-w-0 touch-manipulation items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-white/40 px-4 py-3 text-left outline-none transition-all hover:-translate-y-0.5 hover:border-black/[0.1] hover:bg-white/70 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-zinc-400 active:scale-[0.995] dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <BookOpen className="h-4 w-4 shrink-0 text-zinc-400" />
                          <span className={`${SERIF} truncate text-[15px] text-zinc-600 transition-colors group-hover:text-[var(--foreground)] dark:text-zinc-400 dark:group-hover:text-[var(--foreground)]`}>
                            {r.periodKey}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-2xl flex-col">
              <header className="max-w-3xl">
                {yearHeading("Not yet.")}
                <p className={`${SERIF} mt-5 text-lg italic text-zinc-500 dark:text-zinc-400`}>
                  The annual review happens on the winter solstice (December 21). It&rsquo;s not yet time.
                </p>
                <p className="mt-4 text-[15px] text-zinc-500 dark:text-zinc-400">
                  You can still begin early. Your answers are saved as you write.
                </p>
                <button
                  type="button"
                  onClick={() => setAnnualForced(true)}
                  className="mt-6 inline-flex min-h-11 touch-manipulation items-center rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-[var(--background)] shadow-lg outline-none transition-all hover:opacity-90 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none"
                >
                  Begin early
                </button>
              </header>

              {pastYears.length > 0 && (
                <section className="mt-12 border-t border-black/[0.07] pt-8 dark:border-white/10">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    Past years
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {pastYears.map((r) => (
                      <button
                        key={r.periodKey}
                        type="button"
                        onClick={() => setHistoricalPeriodKey(r.periodKey)}
                        className="group flex min-h-11 w-full min-w-0 touch-manipulation items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-white/40 px-4 py-3 text-left outline-none transition-all hover:-translate-y-0.5 hover:border-black/[0.1] hover:bg-white/70 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-zinc-400 active:scale-[0.995] dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <BookOpen className="h-4 w-4 shrink-0 text-zinc-400" />
                          <span className={`${SERIF} truncate text-[15px] text-zinc-600 transition-colors group-hover:text-[var(--foreground)] dark:text-zinc-400 dark:group-hover:text-[var(--foreground)]`}>
                            {r.periodKey}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {editor.open && (
        <GoalEditorModal
          initial={editor.goal}
          onClose={closeEditor}
          onSave={handleSave}
        />
      )}

      {pendingDelete && (
        <SanctuaryConfirmModal
          title="Delete this goal?"
          body={
            <span>
              <em>{pendingDelete.title}</em> and its milestones, plans, and check-ins will be
              removed. Linked tasks and projects stay, but lose their tie to this goal.
            </span>
          }
          confirmLabel="Delete goal"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>,
    document.body
  );
}