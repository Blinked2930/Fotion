"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, AlertCircle, ChevronDown, Check, Anchor } from "lucide-react";
import { SERIF } from "@/components/views/sanctuary/theme";

export interface HabitFormValues {
  title: string;
  category: string;
  status: "queued" | "ramp_up" | "maintenance" | "paused";
  contextAnchor: "morning_grounding" | "afternoon_focus" | "night_wind_down" | "standalone";
  floorMetric: { description: string; value: number; unit: string };
  targetMetric: { description: string; value: number; unit: string };
  weeklyGraceTokens: number;
}

interface HabitEditorModalProps {
  initial?: any | null;
  activeRampUpCount: number;
  onClose: () => void;
  onSave: (values: HabitFormValues) => Promise<void>;
}

const CATEGORIES = [
  { id: "Physical", label: "Physical", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  { id: "Mental", label: "Mental", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { id: "Creative", label: "Creative", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { id: "Social", label: "Social", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  { id: "Financial", label: "Financial", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  { id: "Productivity", label: "Productivity", color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" },
  { id: "Mindfulness", label: "Mindfulness", color: "text-rose-400 bg-rose-400/10 border-rose-400/20" },
  { id: "Health & Nutrition", label: "Health & Nutrition", color: "text-teal-400 bg-teal-400/10 border-teal-400/20" },
];

const ANCHORS = [
  {
    id: "morning_grounding",
    title: "🌅 Morning Grounding",
    desc: "Executes right after waking, morning coffee, or sunrise routine.",
  },
  {
    id: "afternoon_focus",
    title: "⚡ Afternoon Focus",
    desc: "Executes mid-day before or after primary deep work blocks.",
  },
  {
    id: "night_wind_down",
    title: "🌙 Night Wind Down",
    desc: "Executes post-dinner, evening closure, or pre-bedtime prep.",
  },
  {
    id: "standalone",
    title: "⚓ Standalone Anchor",
    desc: "Trigger-based habit tied to a specific daily event or location.",
  },
];

function CustomSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { id: string; title?: string; label?: string; desc?: string }[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedOption = options.find((o) => o.id === value);

  return (
    <div className="relative" ref={ref}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-zinc-100 dark:bg-[#1a1b26] px-4 py-3 text-sm text-[var(--foreground)] transition-all hover:border-emerald-500/50"
      >
        <span className="truncate font-medium">
          {selectedOption?.title || selectedOption?.label || value}
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[var(--border)] bg-white dark:bg-[#1a1b26] p-2 shadow-2xl animate-in fade-in zoom-in-95">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={`flex w-full items-start justify-between rounded-xl p-2.5 text-left text-xs transition-colors ${
                value === opt.id
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
              }`}
            >
              <div>
                <div className="font-medium text-sm">{opt.title || opt.label}</div>
                {opt.desc && <div className="mt-0.5 text-[11px] text-zinc-500 leading-tight">{opt.desc}</div>}
              </div>
              {value === opt.id && <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function HabitEditorModal({
  initial,
  activeRampUpCount,
  onClose,
  onSave,
}: HabitEditorModalProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Physical");
  const [status, setStatus] = useState<"queued" | "ramp_up" | "maintenance" | "paused">(
    initial?.status ?? (activeRampUpCount < 2 ? "ramp_up" : "queued")
  );
  const [contextAnchor, setContextAnchor] = useState<
    "morning_grounding" | "afternoon_focus" | "night_wind_down" | "standalone"
  >(initial?.contextAnchor ?? "morning_grounding");

  const [floorDesc, setFloorDesc] = useState(initial?.floorMetric?.description ?? "");
  const [floorVal, setFloorVal] = useState<number | "">(initial?.floorMetric?.value ?? "");
  const [floorUnit, setFloorUnit] = useState(initial?.floorMetric?.unit ?? "");

  const [targetDesc, setTargetDesc] = useState(initial?.targetMetric?.description ?? "");
  const [targetVal, setTargetVal] = useState<number | "">(initial?.targetMetric?.value ?? "");
  const [targetUnit, setTargetUnit] = useState(initial?.targetMetric?.unit ?? "");

  const [graceTokens, setGraceTokens] = useState(initial?.weeklyGraceTokens ?? 2);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isRampUpBlocked = status === "ramp_up" && activeRampUpCount >= 2 && initial?.status !== "ramp_up";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a habit title.");
      return;
    }
    if (!floorDesc.trim() || !targetDesc.trim()) {
      setError("Please fill out both Floor and Target tier descriptions.");
      return;
    }
    if (isRampUpBlocked) {
      setError("Maximum 2 habits in active Ramp-Up allowed. Graduate or pause an existing active habit first.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        category,
        status,
        contextAnchor,
        floorMetric: { description: floorDesc.trim(), value: Number(floorVal) || 1, unit: floorUnit.trim() },
        targetMetric: { description: targetDesc.trim(), value: Number(targetVal) || 1, unit: targetUnit.trim() },
        weeklyGraceTokens: Number(graceTokens),
      });
    } catch (err: any) {
      setError(err.message || "Failed to save habit.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border)] bg-white dark:bg-[#12131a] p-6 text-[var(--foreground)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
            <h2 className={`${SERIF} text-2xl font-medium`}>
              {initial ? "Edit Habit System" : "Design New Habit"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500 dark:text-rose-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Habit Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily Deep Reading"
              className="w-full rounded-2xl border border-[var(--border)] bg-zinc-50 dark:bg-white/5 px-4 py-3 text-base outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomSelect
              label="Category"
              value={category}
              onChange={setCategory}
              options={CATEGORIES}
            />
            <CustomSelect
              label="Context Anchor"
              value={contextAnchor}
              onChange={(val) => setContextAnchor(val as any)}
              options={ANCHORS}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Lifecycle Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["ramp_up", "queued", "maintenance", "paused"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`rounded-xl border py-2.5 text-xs font-semibold capitalize transition-all ${
                    status === st
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                      : "border-[var(--border)] bg-zinc-50 dark:bg-white/5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
            {isRampUpBlocked && (
              <p className="mt-2 text-xs text-amber-500">
                ⚠️ Ramp-up capacity full (2/2). Select queued or pause existing to open space.
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-zinc-50 dark:bg-white/[0.02] p-4">
            <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Dual-Threshold Execution Tiers</h3>

            <div className="space-y-2 border-b border-[var(--border)] pb-4">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-300">Floor Metric (Minimum Viable Action)</span>
              <input
                type="text"
                value={floorDesc}
                onChange={(e) => setFloorDesc(e.target.value)}
                placeholder="e.g. Read 1 page"
                className="w-full rounded-xl border border-[var(--border)] bg-white dark:bg-white/5 px-3 py-2 text-xs outline-none focus:border-emerald-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={floorVal}
                  onChange={(e) => setFloorVal(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Target qty (e.g. 1)"
                  className="rounded-xl border border-[var(--border)] bg-white dark:bg-white/5 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={floorUnit}
                  onChange={(e) => setFloorUnit(e.target.value)}
                  placeholder="Unit (e.g. pages, mins)"
                  className="rounded-xl border border-[var(--border)] bg-white dark:bg-white/5 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">Target Metric (Full Ideal Goal)</span>
              <input
                type="text"
                value={targetDesc}
                onChange={(e) => setTargetDesc(e.target.value)}
                placeholder="e.g. Read 15 pages"
                className="w-full rounded-xl border border-[var(--border)] bg-white dark:bg-white/5 px-3 py-2 text-xs outline-none focus:border-emerald-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={targetVal}
                  onChange={(e) => setTargetVal(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Target qty (e.g. 15)"
                  className="rounded-xl border border-[var(--border)] bg-white dark:bg-white/5 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder="Unit (e.g. pages, mins)"
                  className="rounded-xl border border-[var(--border)] bg-white dark:bg-white/5 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-zinc-50 dark:bg-white/5 p-4">
            <div>
              <span className="text-xs font-semibold text-[var(--foreground)]">Weekly Grace Tokens</span>
              <p className="text-[11px] text-zinc-500">Allowed emergency passes per week</p>
            </div>
            <input
              type="number"
              min={0}
              max={7}
              value={graceTokens}
              onChange={(e) => setGraceTokens(Number(e.target.value))}
              className="w-16 rounded-xl border border-[var(--border)] bg-white dark:bg-[#12131a] px-3 py-2 text-center text-sm font-semibold outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-500 px-6 py-2.5 text-xs font-semibold text-white dark:text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : initial ? "Update System" : "Create Habit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}