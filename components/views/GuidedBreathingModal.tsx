"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Play, Pause, RotateCcw, Settings, Wind, Check, Volume2, VolumeX,
  Vibrate, VibrateOff, SkipForward,
} from "lucide-react";
import { FocusSettings } from "@/lib/focusSettings";

type BreathingPhase = "idle" | "inhale" | "exhale" | "retention" | "recovery" | "complete";

const HAPTICS_KEY = "fotion-breathing-haptics";

const CUE_COLORS = [
  { name: "Cyan", value: "#06b6d4" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Purple", value: "#a855f7" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Blue", value: "#3b82f6" },
];

export function GuidedBreathingModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: FocusSettings;
  onUpdateSettings: (newSettings: FocusSettings) => void;
}) {
  const [phase, setPhase] = useState<BreathingPhase>("idle");
  const [currentBreath, setCurrentBreath] = useState(1);
  const [retentionSeconds, setRetentionSeconds] = useState(0);
  const [recoverySeconds, setRecoverySeconds] = useState(15);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(settings.breathingAudioEnabled ?? true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Local settings editable in settings pane
  const [cueColor, setCueColor] = useState(settings.breathingColor || "#06b6d4");
  const [breathCount, setBreathCount] = useState(settings.breathingCount || 30);
  const [breathSpeed, setBreathSpeed] = useState(settings.breathingSpeedSec || 3.5);
  const [breathingRatio, setBreathingRatio] = useState<"1:1" | "1:1.5" | "1:2" | "1.5:1">(
    settings.breathingRatio || "1:1"
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationTimerRef = useRef<any>(null);
  const hapticsOnRef = useRef(true);
  const iosSwitchLabelRef = useRef<HTMLLabelElement>(null);
  const iosSwitchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCueColor(settings.breathingColor || "#06b6d4");
    setBreathCount(settings.breathingCount || 30);
    setBreathSpeed(settings.breathingSpeedSec || 3.5);
    setBreathingRatio(settings.breathingRatio || "1:1");
    setSoundEnabled(settings.breathingAudioEnabled ?? true);
  }, [settings]);

  // Haptics preference lives in localStorage so it needs no settings-schema change.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HAPTICS_KEY);
      const on = stored !== "off";
      setHapticsEnabled(on);
      hapticsOnRef.current = on;
    } catch {
      /* ignore */
    }
  }, []);

  // Safari on iOS has no navigator.vibrate, but toggling a native
  // <input type="checkbox" switch> gives a light tap. Mark it as a switch here
  // because React doesn't forward the non-standard attribute reliably.
  useEffect(() => {
    iosSwitchInputRef.current?.setAttribute("switch", "");
  }, [isOpen]);

  const toggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    hapticsOnRef.current = next;
    try {
      localStorage.setItem(HAPTICS_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
    if (next) haptic([30]); // confirm with a tap
  };

  // pattern: [vibrate, pause, vibrate, pause, ...] in ms (same as navigator.vibrate).
  const haptic = useCallback((pattern: number[]) => {
    if (!hapticsOnRef.current || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
      return;
    }

    // iOS best-effort: one switch toggle per "vibrate" slot in the pattern.
    let t = 0;
    pattern.forEach((ms, i) => {
      if (i % 2 === 0) setTimeout(() => iosSwitchLabelRef.current?.click(), t);
      t += ms;
    });
  }, []);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  };

  // Calm Tibetan-style 528Hz Solfeggio Chime for Retention minute marks
  const playRetentionMinuteChime = () => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";

      // 528Hz (Transformation/Miracle tone) + 1056Hz harmonic
      osc1.frequency.setValueAtTime(528, ctx.currentTime);
      osc2.frequency.setValueAtTime(1056, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 3.2);
      osc2.stop(ctx.currentTime + 3.2);
    } catch (e) {
      console.log("Audio play error", e);
    }
  };

  const getRatioFractions = (ratioStr: string) => {
    switch (ratioStr) {
      case "1:1.5":
        return { inFrac: 1 / 2.5, exFrac: 1.5 / 2.5 };
      case "1:2":
        return { inFrac: 1 / 3, exFrac: 2 / 3 };
      case "1.5:1":
        return { inFrac: 1.5 / 2.5, exFrac: 1 / 2.5 };
      case "1:1":
      default:
        return { inFrac: 0.5, exFrac: 0.5 };
    }
  };

  const { inFrac, exFrac } = getRatioFractions(breathingRatio);
  const inhaleMs = breathSpeed * 1000 * inFrac;
  const exhaleMs = breathSpeed * 1000 * exFrac;

  // Main Wim Hof Breathing Cycle Loop
  useEffect(() => {
    if (!isOpen) {
      setPhase("idle");
      return;
    }

    if (phase === "inhale") {
      animationTimerRef.current = setTimeout(() => {
        setPhase("exhale");
      }, inhaleMs);
    } else if (phase === "exhale") {
      animationTimerRef.current = setTimeout(() => {
        if (currentBreath < breathCount) {
          setCurrentBreath((prev) => prev + 1);
          setPhase("inhale");
        } else {
          // Finished power breaths -> Enter Exhale Retention!
          setPhase("retention");
          setRetentionSeconds(0);
        }
      }, exhaleMs);
    }

    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, [phase, currentBreath, breathCount, inhaleMs, exhaleMs, isOpen]);

  // Haptic cue on every phase change: soft tap on inhale, lighter on exhale,
  // longer buzz when the hold begins, a double pulse for recovery.
  useEffect(() => {
    if (!isOpen) return;
    switch (phase) {
      case "inhale":
        haptic([40]);
        break;
      case "exhale":
        haptic([18]);
        break;
      case "retention":
        haptic([160]);
        break;
      case "recovery":
        haptic([90, 70, 90]);
        break;
      case "complete":
        haptic([60, 50, 60, 50, 180]);
        break;
      default:
        break;
    }
  }, [phase, isOpen, haptic]);

  // Retention timer (just counts seconds)
  useEffect(() => {
    let interval: any;
    if (phase === "retention") {
      interval = setInterval(() => {
        setRetentionSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  // Calm chime + haptic on each full minute of retention (60s, 120s, 180s...).
  // Kept out of the state updater so it can't fire twice in React Strict Mode.
  useEffect(() => {
    if (phase === "retention" && retentionSeconds > 0 && retentionSeconds % 60 === 0) {
      playRetentionMinuteChime();
      haptic([220, 120, 220]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retentionSeconds]);

  // Clean Recovery hold timer (Decoupled from phase-switching side effects)
  useEffect(() => {
    let interval: any;
    if (phase === "recovery") {
      interval = setInterval(() => {
        setRecoverySeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  // Transition out of Recovery when timer hits 0
  useEffect(() => {
    if (phase === "recovery" && recoverySeconds <= 0) {
      setPhase("complete");
      setRoundsCompleted((r) => r + 1);
      setRecoverySeconds(15);
    }
  }, [phase, recoverySeconds]);

  if (!isOpen) return null;

  const handleStart = () => {
    initAudio();
    setCurrentBreath(1);
    setPhase("inhale");
  };

  const handleReset = () => {
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    setPhase("idle");
    setCurrentBreath(1);
    setRetentionSeconds(0);
    setRecoverySeconds(15);
  };

  // Skip the remaining power breaths and go straight to the exhale hold.
  const handleSkipToHold = () => {
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    setRetentionSeconds(0);
    setPhase("retention");
  };

  // Leave the exhale hold and take the recovery breath (also logs the hold).
  const handleStartRecovery = () => {
    saveRetentionLog(retentionSeconds);
    setPhase("recovery");
    setRecoverySeconds(15);
  };

  // End the 15s recovery hold early; the existing effect completes the round.
  const handleEndRecoveryEarly = () => {
    setRecoverySeconds(0);
  };

  const handleSaveSettings = () => {
    onUpdateSettings({
      ...settings,
      breathingColor: cueColor,
      breathingCount: breathCount,
      breathingSpeedSec: breathSpeed,
      breathingAudioEnabled: soundEnabled,
      breathingRatio: breathingRatio,
    });
    setShowSettings(false);
  };

  // Save breath hold record to localStorage
  const saveRetentionLog = (holdSecs: number) => {
    if (holdSecs <= 0) return;
    try {
      const raw = localStorage.getItem("fotion-breathing-retention-history");
      const list = raw ? JSON.parse(raw) : [];
      const newEntry = {
        timestamp: Date.now(),
        seconds: holdSecs,
      };
      const updated = [newEntry, ...list].slice(0, 50);
      localStorage.setItem("fotion-breathing-retention-history", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save retention log", e);
    }
  };

  // Helper to fetch personal best hold time from localStorage
  const getBestHoldSeconds = (): number => {
    if (typeof window === "undefined") return 0;
    try {
      const raw = localStorage.getItem("fotion-breathing-retention-history");
      if (!raw) return 0;
      const list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return 0;
      return Math.max(...list.map((item: any) => item.seconds || 0));
    } catch (e) {
      return 0;
    }
  };

  // Determine circle scale and animation duration based on phase
  let circleScale = "scale-75 opacity-40";
  let transitionDuration = `${(inhaleMs / 1000).toFixed(2)}s`;
  let statusText = "Guided Breathing";
  let bestHoldSec = getBestHoldSeconds();
  let subText = bestHoldSec > 0 ? `Best Hold: ${Math.floor(bestHoldSec / 60)}m ${bestHoldSec % 60}s` : `${breathCount} Breaths`;

  if (phase === "inhale") {
    circleScale = "scale-125 opacity-100 shadow-2xl";
    transitionDuration = `${(inhaleMs / 1000).toFixed(2)}s`;
    statusText = "Inhale";
    subText = `${currentBreath} / ${breathCount}`;
  } else if (phase === "exhale") {
    circleScale = "scale-75 opacity-50";
    transitionDuration = `${(exhaleMs / 1000).toFixed(2)}s`;
    statusText = "Exhale";
    subText = `${currentBreath} / ${breathCount}`;
  } else if (phase === "retention") {
    circleScale = "scale-90 opacity-60 animate-pulse motion-reduce:animate-none";
    transitionDuration = "2s";
    statusText = "Exhale Hold";
    subText = "Hold empty lungs • Relax mind & body";
  } else if (phase === "recovery") {
    circleScale = "scale-110 opacity-90";
    transitionDuration = "1s";
    statusText = "Recovery Inhale";
    subText = "Hold full lungs • Feel the energy";
  } else if (phase === "complete") {
    circleScale = "scale-100 opacity-80";
    statusText = "Round Complete";
    subText = `${roundsCompleted} ${roundsCompleted === 1 ? "round" : "rounds"} completed`;
  }

  const formatRetention = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const headerBtn =
    "p-3 sm:p-2.5 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors";

  return (
    <div
      className="fixed inset-0 z-[250] bg-black/95 animate-in fade-in duration-300 motion-reduce:animate-none flex flex-col justify-between px-6 overflow-hidden select-none"
      style={{
        paddingTop: "calc(var(--sat, 0px) + 1rem)",
        paddingBottom: "calc(var(--sab, 0px) + 1rem)",
      }}
    >
      {/* Hidden native switch used for the iOS Safari haptic fallback. */}
      <label
        ref={iosSwitchLabelRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0"
      >
        <input ref={iosSwitchInputRef} type="checkbox" tabIndex={-1} />
      </label>

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-2 text-white font-bold tracking-wider uppercase text-xs sm:text-sm">
          <Wind className="w-5 h-5 text-cyan-400" /> Guided Breathing
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleHaptics}
            aria-label={hapticsEnabled ? "Turn haptics off" : "Turn haptics on"}
            className={headerBtn}
            title={hapticsEnabled ? "Haptics on" : "Haptics off"}
          >
            {hapticsEnabled ? (
              <Vibrate className="w-5 h-5 text-cyan-400" />
            ) : (
              <VibrateOff className="w-5 h-5 text-zinc-500" />
            )}
          </button>
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              onUpdateSettings({ ...settings, breathingAudioEnabled: next });
            }}
            aria-label={soundEnabled ? "Mute audio cues" : "Unmute audio cues"}
            className={headerBtn}
            title={soundEnabled ? "Audio cues active (Minute chime on retention)" : "Audio cues muted"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Breathing settings"
            className={headerBtn}
            title="Breathing Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={onClose} aria-label="Close breathing" className={headerBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Breathing Area */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center relative my-4 max-w-xl w-full mx-auto text-center">
        {showSettings ? (
          /* Inline Settings Screen */
          <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 text-left space-y-5 animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" /> Breathing Protocol Settings
            </h3>

            {/* Cue Color */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Visual Indicator Color
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {CUE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCueColor(c.value)}
                    className={`w-9 h-9 rounded-full transition-transform border-2 flex items-center justify-center ${cueColor === c.value ? "scale-110 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {cueColor === c.value && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Cues Toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-2xl border border-zinc-700">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Audio Minute Chime
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${soundEnabled ? "bg-cyan-500" : "bg-zinc-700"
                  }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${soundEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </button>
            </div>

            {/* Haptics Toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-2xl border border-zinc-700">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Haptic Cues
              </span>
              <button
                type="button"
                onClick={toggleHaptics}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${hapticsEnabled ? "bg-cyan-500" : "bg-zinc-700"
                  }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${hapticsEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </button>
            </div>

            {/* Inhale vs Exhale Ratio */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Inhale vs Exhale Ratio
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "1:1", label: "1 : 1", desc: "Equal" },
                  { id: "1:1.5", label: "1 : 1.5", desc: "Relaxing" },
                  { id: "1:2", label: "1 : 2", desc: "Calming" },
                  { id: "1.5:1", label: "1.5 : 1", desc: "Energizing" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setBreathingRatio(r.id as any)}
                    className={`py-2 px-1 rounded-xl text-center border transition-all ${breathingRatio === r.id
                        ? "bg-cyan-500 text-black border-cyan-400 font-extrabold"
                        : "bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      }`}
                  >
                    <div className="text-xs font-bold">{r.label}</div>
                    <div className="text-[10px] opacity-75">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Number of Breaths */}
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                <span>Power Breaths Per Round</span>
                <span className="text-cyan-400 font-extrabold text-sm">{breathCount} breaths</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={breathCount}
                onChange={(e) => setBreathCount(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Breath Speed */}
            <div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                <span>Breath Pace (Seconds per breath)</span>
                <span className="text-cyan-400 font-extrabold text-sm">{breathSpeed}s</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="15.0"
                step="0.5"
                value={breathSpeed}
                onChange={(e) => setBreathSpeed(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-2xl transition-all shadow-lg active:scale-95 text-center"
            >
              Save Breathing Preferences
            </button>
          </div>
        ) : (
          <>
            {/* Visual Expanding / Contracting Circle */}
            <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72 my-4 shrink-0">
              {/* Outer Glowing Ring */}
              <div
                className="absolute inset-0 rounded-full transition-all ease-in-out blur-xl"
                style={{
                  backgroundColor: cueColor,
                  transitionDuration: transitionDuration,
                  transform: phase === "inhale" ? "scale(1.3)" : phase === "exhale" ? "scale(0.7)" : "scale(0.9)",
                  opacity: phase === "idle" ? 0.2 : 0.4,
                }}
              />

              {/* Main Visual Circle */}
              <div
                className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full transition-all ease-in-out shadow-2xl flex flex-col items-center justify-center border-4 border-white/20 ${circleScale}`}
                style={{
                  backgroundColor: cueColor,
                  transitionDuration: transitionDuration,
                }}
              >
                {phase === "retention" ? (
                  <div className="text-white">
                    <span className="text-4xl sm:text-5xl font-black tabular-nums">
                      {formatRetention(retentionSeconds)}
                    </span>
                    <span className="block text-[11px] uppercase tracking-wider font-bold text-white/80 mt-1">
                      Exhale Hold
                    </span>
                  </div>
                ) : phase === "recovery" ? (
                  <div className="text-white">
                    <span className="text-5xl sm:text-6xl font-black tabular-nums">{recoverySeconds}</span>
                    <span className="block text-[11px] uppercase tracking-wider font-bold text-white/80 mt-1">
                      Inhale Hold
                    </span>
                  </div>
                ) : (
                  <Wind className="w-12 h-12 text-white/90" />
                )}
              </div>
            </div>

            {/* Clean Minimal Status Text */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-1">
              {statusText}
            </h2>
            <p className="text-sm font-semibold tracking-widest text-zinc-400 uppercase">
              {subText}
            </p>

            {/* Skip the remaining power breaths */}
            {(phase === "inhale" || phase === "exhale") && (
              <button
                onClick={handleSkipToHold}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800 hover:text-white font-bold text-sm transition-all active:scale-95"
              >
                <SkipForward className="w-4 h-4" /> Skip to exhale hold
              </button>
            )}

            {/* Retention Transition Button */}
            {phase === "retention" && (
              <button
                onClick={handleStartRecovery}
                className="mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-full transition-all shadow-xl active:scale-95 text-sm"
              >
                Take Recovery Inhale (15s Hold)
              </button>
            )}

            {/* End the recovery hold early */}
            {phase === "recovery" && (
              <button
                onClick={handleEndRecoveryEarly}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800 hover:text-white font-bold text-sm transition-all active:scale-95"
              >
                <SkipForward className="w-4 h-4" /> End hold early
              </button>
            )}

            {phase === "complete" && (
              <button
                onClick={handleStart}
                className="mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-full transition-all shadow-xl active:scale-95 text-sm"
              >
                Start Next Round ({roundsCompleted} Done)
              </button>
            )}
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 flex items-center justify-center gap-4 max-w-md w-full mx-auto">
        {phase === "idle" ? (
          <button
            onClick={handleStart}
            className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-lg rounded-full shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-6 h-6 fill-current" /> Begin Breathing Session
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                if (phase === "inhale" || phase === "exhale") {
                  if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
                  setPhase("idle");
                } else {
                  setPhase("inhale");
                }
              }}
              className="w-14 h-14 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg"
              title="Pause/Resume"
            >
              <Pause className="w-6 h-6 fill-current" />
            </button>

            <button
              onClick={handleReset}
              className="w-14 h-14 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-lg"
              title="Reset Session"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}