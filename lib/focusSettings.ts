"use client";

export interface FocusSettings {
  workDurationMin: number;
  shortBreakDurationMin: number;
  longBreakDurationMin: number;
  longBreakInterval: number;

  microbreaksEnabled: boolean;
  microbreakDurationSec: number;
  microbreakMaxIntervalMin: number;

  breathingColor: string;
  breathingCount: number;
  breathingSpeedSec: number;
  breathingRetentionSec: number;

  visualFocusDurationSec: number;
  visualFocusShape: "target" | "dot" | "cat" | "sparkles";
}

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = {
  workDurationMin: 25,
  shortBreakDurationMin: 5,
  longBreakDurationMin: 15,
  longBreakInterval: 4,

  microbreaksEnabled: true,
  microbreakDurationSec: 10,
  microbreakMaxIntervalMin: 5,

  breathingColor: "#06b6d4", // Cyan
  breathingCount: 30,
  breathingSpeedSec: 3.5,
  breathingRetentionSec: 60,

  visualFocusDurationSec: 15,
  visualFocusShape: "target",
};

const STORAGE_KEY = "fotion-focus-custom-settings-v1";

export function loadFocusSettings(): FocusSettings {
  if (typeof window === "undefined") return DEFAULT_FOCUS_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FOCUS_SETTINGS;
    return { ...DEFAULT_FOCUS_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error("Failed to load focus settings", e);
    return DEFAULT_FOCUS_SETTINGS;
  }
}

export function saveFocusSettings(settings: FocusSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save focus settings", e);
  }
}
