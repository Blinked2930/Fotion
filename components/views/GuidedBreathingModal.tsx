"use client";

import { useState, useEffect, useRef } from "react";
import { X, Play, Pause, RotateCcw, Settings, Wind, Check, Volume2, VolumeX } from "lucide-react";
import { FocusSettings } from "@/lib/focusSettings";

type BreathingPhase = "idle" | "inhale" | "exhale" | "retention" | "recovery" | "complete";

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

  useEffect(() => {
    setCueColor(settings.breathingColor || "#06b6d4");
    setBreathCount(settings.breathingCount || 30);
    setBreathSpeed(settings.breathingSpeedSec || 3.5);
    setBreathingRatio(settings.breathingRatio || "1:1");
    setSoundEnabled(settings.breathingAudioEnabled ?? true);
  }, [settings]);

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

  // Retention timer - triggers calm chime ONLY on each minute (60s, 120s, 180s...)
  useEffect(() => {
    let interval: any;
    if (phase === "retention") {
      interval = setInterval(() => {
        setRetentionSeconds((prev) => {
          const next = prev + 1;
          if (next > 0 && next % 60 === 0) {
            playRetentionMinuteChime();
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, soundEnabled]);

  // Recovery hold timer
  useEffect(() => {
    let interval: any;
    if (phase === "recovery") {
      interval = setInterval(() => {
        setRecoverySeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPhase("complete");
            setRoundsCompleted((r) => r + 1);
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

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

  // Determine circle scale and animation duration based on phase
  let circleScale = "scale-75 opacity-40";
  let transitionDuration = `${(inhaleMs / 1000).toFixed(2)}s`;
  let statusText = "Wim Hof Breathing";
  let subText = `${breathCount} Breaths`;

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
    circleScale = "scale-90 opacity-60 animate-pulse";
    transitionDuration = "2s";
    statusText = "Exhale Hold";
    subText = retentionSeconds >= 60 ? `${Math.floor(retentionSeconds / 60)}m ${retentionSeconds % 60}s` : `${retentionSeconds}s`;
  } else if (phase === "recovery") {
    circleScale = "scale-110 opacity-90";
    transitionDuration = "1s";
    statusText = "Recovery Inhale";
    subText = `${recoverySeconds}s hold`;
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

  return (
    <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300 flex flex-col justify-between p-6 overflow-hidden select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-2 text-white font-bold tracking-wider uppercase text-xs sm:text-sm">
          <Wind className="w-5 h-5 text-cyan-400" /> Guided Breathing
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              onUpdateSettings({ ...settings, breathingAudioEnabled: next });
            }}
            className="p-2.5 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title={soundEnabled ? "Audio cues active (Minute chime on retention)" : "Audio cues muted"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Breathing Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Breathing Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-4 max-w-xl w-full mx-auto text-center">
        {showSettings ? (
          /* Inline Settings Screen */
          <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 text-left space-y-5 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" /> Breathing Protocol Settings
            </h3>

            {/* Cue Color */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Visual Indicator Color
              </label>
              <div className="flex items-center gap-3">
                {CUE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCueColor(c.value)}
                    className={`w-9 h-9 rounded-full transition-transform border-2 flex items-center justify-center ${
                      cueColor === c.value ? "scale-110 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
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
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                  soundEnabled ? "bg-cyan-500" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    soundEnabled ? "translate-x-5" : "translate-x-0"
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
                    className={`py-2 px-1 rounded-xl text-center border transition-all ${
                      breathingRatio === r.id
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
                min="10"
                max="50"
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
                max="6.0"
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
            <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72 my-4">
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

            {/* Retention Transition Button */}
            {phase === "retention" && (
              <button
                onClick={() => {
                  setPhase("recovery");
                  setRecoverySeconds(15);
                }}
                className="mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold rounded-full transition-all shadow-xl active:scale-95 text-sm"
              >
                Take Recovery Inhale (15s Hold)
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
      <div className="flex items-center justify-center gap-4 max-w-md w-full mx-auto pb-4">
        {phase === "idle" ? (
          <button
            onClick={handleStart}
            className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-lg rounded-full shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-6 h-6 fill-current" /> Begin Wim Hof Session
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

