"use client";

import { useState } from "react";
import { X, Sparkles, AlertCircle } from "lucide-react";
import { SERIF } from "@/components/views/sanctuary/theme";

export interface HabitFormValues {
  title: string;
  category: "Mental" | "Physical" | "Social" | "Creative";
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

export function HabitEditorModal({
  initial,
  activeRampUpCount,
  onClose,
  onSave,
}: HabitEditorModalProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<"Mental" | "Physical" | "Social" | "Creative">(
    initial?.category ?? "Physical"
  );
  const [status, setStatus] = useState<"queued" | "ramp_up" | "maintenance" | "paused">(
    initial?.status ?? (activeRampUpCount < 2 ? "ramp_up" : "queued")
  );
  const [contextAnchor, setContextAnchor] = useState<
    "morning_grounding" | "afternoon_focus" | "night_wind_down" | "standalone"
  >(initial?.contextAnchor ?? "morning_grounding");

  const [floorDesc, setFloorDesc] = useState(initial?.floorMetric?.description ?? "Read 1 page");
  const [floorVal, setFloorVal] = useState(initial?.floorMetric?.value ?? 1);
  const [floorUnit, setFloorUnit] = useState(initial?.floorMetric?.unit ?? "pages");

  const [targetDesc, setTargetDesc] = useState(initial?.targetMetric?.description ?? "Read 15 pages");
  const [targetVal, setTargetVal] = useState(initial?.targetMetric?.value ?? 15);
  const [targetUnit, setTargetUnit] = useState(initial?.targetMetric?.unit ?? "pages");

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
        floorMetric: { description: floorDesc.trim(), value: Number(floorVal), unit: floorUnit.trim() },
        targetMetric: { description: targetDesc.trim(), value: Number(targetVal), unit: targetUnit.trim() },
        weeklyGraceTokens: Number(graceTokens),
      });
    } catch (err: any) {
      setError(err.message || "Failed to save habit.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#12131a] p-6 text-zinc-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h2 className={`${SERIF} text-2xl font-medium`}>
              {initial ? "Edit Habit System" : "Design New Habit"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Habit Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily Deep Reading"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base outline-none focus:border-emerald-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#1a1b26] px-4 py-3 text-sm outline-none focus:border-emerald-400"
              >
                <option value="Physical">Physical</option>
                <option value="Mental">Mental</option>
                <option value="Social">Social</option>
                <option value="Creative">Creative</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Context Anchor
              </label>
              <select
                value={contextAnchor}
                onChange={(e) => setContextAnchor(e.target.value as any)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#1a1b26] px-4 py-3 text-sm outline-none focus:border-emerald-400"
              >
                <option value="morning_grounding">Morning Grounding</option>
                <option value="afternoon_focus">Afternoon Focus</option>
                <option value="night_wind_down">Night Wind Down</option>
                <option value="standalone">Standalone</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Lifecycle Status
            </label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {(["ramp_up", "queued", "maintenance", "paused"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`rounded-xl border py-2.5 text-xs font-semibold capitalize transition-all ${
                    status === st
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
            {isRampUpBlocked && (
              <p className="mt-2 text-xs text-amber-400">
                ⚠️ Ramp-up capacity full (2/2). Selecting this will be blocked on save until a slot opens.
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-sm font-semibold text-emerald-400">Dual-Threshold Execution Tiers</h3>
            
            <div className="space-y-2 border-b border-white/10 pb-4">
              <span className="text-xs font-medium text-amber-300">Floor Metric (Minimum Viable Action)</span>
              <input
                type="text"
                value={floorDesc}
                onChange={(e) => setFloorDesc(e.target.value)}
                placeholder="Floor description"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={floorVal}
                  onChange={(e) => setFloorVal(Number(e.target.value))}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
                />
                <input
                  type="text"
                  value={floorUnit}
                  onChange={(e) => setFloorUnit(e.target.value)}
                  placeholder="Unit (e.g. pages, mins)"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-emerald-300">Target Metric (Full Ideal Goal)</span>
              <input
                type="text"
                value={targetDesc}
                onChange={(e) => setTargetDesc(e.target.value)}
                placeholder="Target description"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={targetVal}
                  onChange={(e) => setTargetVal(Number(e.target.value))}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
                />
                <input
                  type="text"
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder="Unit (e.g. pages, mins)"
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
            <div>
              <span className="text-xs font-semibold text-zinc-300">Weekly Grace Tokens</span>
              <p className="text-[11px] text-zinc-500">Allowed emergency passes per week</p>
            </div>
            <input
              type="number"
              min={0}
              max={7}
              value={graceTokens}
              onChange={(e) => setGraceTokens(Number(e.target.value))}
              className="w-16 rounded-xl border border-white/10 bg-[#12131a] px-3 py-2 text-center text-sm font-semibold outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-xs font-semibold text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-500 px-6 py-2.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : initial ? "Update System" : "Create Habit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}