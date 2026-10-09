"use client";

import { useState, useEffect } from "react";
import { X, Sliders, Zap, Clock, Coffee, Moon, Check } from "lucide-react";
import { FocusSettings } from "@/lib/focusSettings";

export function FocusSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: FocusSettings;
  onSave: (newSettings: FocusSettings) => void;
}) {
  const [workMin, setWorkMin] = useState(settings.workDurationMin);
  const [shortBreakMin, setShortBreakMin] = useState(settings.shortBreakDurationMin);
  const [longBreakMin, setLongBreakMin] = useState(settings.longBreakDurationMin);
  const [longBreakInterval, setLongBreakInterval] = useState(settings.longBreakInterval);

  const [microbreaksEnabled, setMicrobreaksEnabled] = useState(settings.microbreaksEnabled);
  const [microbreakSec, setMicrobreakSec] = useState(settings.microbreakDurationSec);
  const [microbreakIntervalMin, setMicrobreakIntervalMin] = useState(settings.microbreakMaxIntervalMin);

  useEffect(() => {
    setWorkMin(settings.workDurationMin);
    setShortBreakMin(settings.shortBreakDurationMin);
    setLongBreakMin(settings.longBreakDurationMin);
    setLongBreakInterval(settings.longBreakInterval);
    setMicrobreaksEnabled(settings.microbreaksEnabled);
    setMicrobreakSec(settings.microbreakDurationSec);
    setMicrobreakIntervalMin(settings.microbreakMaxIntervalMin);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      ...settings,
      workDurationMin: workMin,
      shortBreakDurationMin: shortBreakMin,
      longBreakDurationMin: longBreakMin,
      longBreakInterval: longBreakInterval,
      microbreaksEnabled: microbreaksEnabled,
      microbreakDurationSec: microbreakSec,
      microbreakMaxIntervalMin: microbreakIntervalMin,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[230] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#1e1e1e] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-base sm:text-lg">
            <Sliders className="w-5 h-5 text-indigo-500" /> Custom Focus & Timer Preferences
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-[var(--foreground)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-left">
          
          {/* Section 1: Custom Timer Lengths */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" /> Focus & Break Durations
            </h4>

            {/* Work Session Duration */}
            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-[var(--border)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" /> Deep Work Session
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{workMin} mins</span>
              </div>
              <input
                type="range"
                min="5"
                max="90"
                step="5"
                value={workMin}
                onChange={(e) => setWorkMin(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Short Break Duration */}
            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-[var(--border)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-500" /> Short Break
                </span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{shortBreakMin} mins</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={shortBreakMin}
                onChange={(e) => setShortBreakMin(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Long Break Duration */}
            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-[var(--border)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-500" /> Long Break
                </span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{longBreakMin} mins</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={longBreakMin}
                onChange={(e) => setLongBreakMin(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Long Break Frequency */}
            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-[var(--border)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Long Break Frequency
                </span>
                <span className="text-sm font-bold text-indigo-500">Every {longBreakInterval} work sessions</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[2, 3, 4, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setLongBreakInterval(count)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      longBreakInterval === count
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-[var(--border)] hover:border-zinc-400"
                    }`}
                  >
                    Every {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Andrew Huberman Microbreaks Protocol */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Microbreaks (Huberman Protocol)
              </h4>
              <button
                type="button"
                onClick={() => setMicrobreaksEnabled(!microbreaksEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                  microbreaksEnabled ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    microbreaksEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {microbreaksEnabled && (
              <div className="space-y-3 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 animate-in fade-in duration-200">
                {/* Microbreak Length */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span className="text-[var(--foreground)]">Microbreak Duration</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{microbreakSec} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={microbreakSec}
                    onChange={(e) => setMicrobreakSec(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Max Time Between Breaks */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span className="text-[var(--foreground)]">Max Interval Between Breaks</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{microbreakIntervalMin} minutes</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="15"
                    step="1"
                    value={microbreakIntervalMin}
                    onChange={(e) => setMicrobreakIntervalMin(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Microbreak Sound Selection */}
                <div>
                  <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                    Microbreak Audio Cue Sound
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "chime", label: "Chime" },
                      { id: "bell", label: "Bowl" },
                      { id: "beep", label: "Beep" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          onSave({
                            ...settings,
                            workDurationMin: workMin,
                            shortBreakDurationMin: shortBreakMin,
                            longBreakDurationMin: longBreakMin,
                            longBreakInterval: longBreakInterval,
                            microbreaksEnabled: microbreaksEnabled,
                            microbreakDurationSec: microbreakSec,
                            microbreakMaxIntervalMin: microbreakIntervalMin,
                            microbreakSound: s.id as any,
                          })
                        }
                        className={`py-1.5 text-center text-xs font-bold rounded-xl border transition-all ${
                          (settings.microbreakSound || "chime") === s.id
                            ? "bg-amber-500 text-amber-950 border-amber-400 font-extrabold shadow-sm"
                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-[var(--border)] hover:border-amber-300"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[var(--border)] bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-zinc-500 hover:text-[var(--foreground)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-full text-sm font-bold bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 shadow-lg active:scale-95 transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Save Focus Settings
          </button>
        </div>

      </div>
    </div>
  );
}
