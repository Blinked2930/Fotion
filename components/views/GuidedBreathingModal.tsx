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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Local settings editable in settings pane
  const [cueColor, setCueColor] = useState(settings.breathingColor || "#06b6d4");
  const [breathCount, setBreathCount] = useState(settings.breathingCount || 30);
  const [breathSpeed, setBreathSpeed] = useState(settings.breathingSpeedSec || 3.5);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationTimerRef = useRef<any>(null);

  useEffect(() => {
    setCueColor(settings.breathingColor || "#06b6d4");
    setBreathCount(settings.breathingCount || 30);
    setBreathSpeed(settings.breathingSpeedSec || 3.5);
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

  const playTone = (freq: number, duration: number, type: OscillatorType = "sine") => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log("Audio play error", e);
    }
  };

  // Main Wim Hof Breathing Cycle Loop
  useEffect(() => {
    if (!isOpen) {
      setPhase("idle");
      return;
    }

    const halfCycleMs = (breathSpeed * 1000) / 2;

    if (phase === "inhale") {
      playTone(440, 1.2); // Soft A4 on Inhale
      animationTimerRef.current = setTimeout(() => {
        setPhase("exhale");
      }, halfCycleMs);
    } else if (phase === "exhale") {
      playTone(329.63, 1.2); // Soft E4 on Exhale
      animationTimerRef.current = setTimeout(() => {
        if (currentBreath < breathCount) {
          setCurrentBreath((prev) => prev + 1);
          setPhase("inhale");
        } else {
          // Finished power breaths -> Enter Exhale Retention!
          playTone(523.25, 2.0); // C5 chime
          setPhase("retention");
          setRetentionSeconds(0);
        }
      }, halfCycleMs);
    }

    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, [phase, currentBreath, breathCount, breathSpeed, isOpen]);

  // Retention timer
  useEffect(() => {
    let interval: any;
    if (phase === "retention") {
      interval = setInterval(() => {
        setRetentionSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

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
            playTone(659.25, 2.5); // E5 Chime
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
    });
    setShowSettings(false);
  };

  // Determine circle scale and animation duration based on phase
  let circleScale = "scale-75 opacity-40";
  let transitionDuration = `${(breathSpeed / 2).toFixed(2)}s`;
  let statusText = "Ready to start Wim Hof Breathing";
  let subText = `${breathCount} Power Breaths • Exhale Hold • 15s Recovery`;

  if (phase === "inhale") {
    circleScale = "scale-125 opacity-100 shadow-2xl";
    statusText = "INHALE DEEP";
    subText = `Breath ${currentBreath} of ${breathCount} • Fill belly and chest`;
  } else if (phase === "exhale") {
    circleScale = "scale-75 opacity-50";
    statusText = "LET GO";
    subText = `Breath ${currentBreath} of ${breathCount} • Relax exhale`;
  } else if (phase === "retention") {
    circleScale = "scale-90 opacity-60 animate-pulse";
    transitionDuration = "2s";
    statusText = "EXHALE HOLD (RETENTION)";
    subText = "Hold empty lungs. Relax your shoulders and mind.";
  } else if (phase === "recovery") {
    circleScale = "scale-110 opacity-90";
    transitionDuration = "1s";
    statusText = "RECOVERY INHALE";
    subText = "Take deep breath in and hold for 15 seconds";
  } else if (phase === "complete") {
    circleScale = "scale-100 opacity-80";
    statusText = "ROUND COMPLETE!";
    subText = `Great work! You completed ${roundsCompleted} ${roundsCompleted === 1 ? "round" : "rounds"}.`;
  }

  const formatRetention = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300 flex flex-col justify-between p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto">
        <div className="flex items-center gap-2 text-white font-bold tracking-wider uppercase text-xs sm:text-sm">
          <Wind className="w-5 h-5 text-cyan-400" /> Wim Hof Guided Breathing
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title={soundEnabled ? "Mute audio" : "Enable audio"}
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
          <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 text-left space-y-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" /> Breathing Visual & Protocol
            </h3>

            {/* Cue Color */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Visual Cue Color
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
                max="5.0"
                step="0.5"
                value={breathSpeed}
                onChange={(e) => setBreathSpeed(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
                <span>Fast (2.0s)</span>
                <span>Normal (3.5s)</span>
                <span>Relaxed (5.0s)</span>
              </div>
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
            <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80 my-6">
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
                className={`w-48 h-48 sm:w-60 sm:h-60 rounded-full transition-all ease-in-out shadow-2xl flex flex-col items-center justify-center border-4 border-white/20 ${circleScale}`}
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
                    <span className="block text-xs uppercase font-bold text-white/80 mt-1">Hold Exhale</span>
                  </div>
                ) : phase === "recovery" ? (
                  <div className="text-white">
                    <span className="text-5xl sm:text-6xl font-black tabular-nums">{recoverySeconds}</span>
                    <span className="block text-xs uppercase font-bold text-white/80 mt-1">Hold Inhale</span>
                  </div>
                ) : (
                  <Wind className="w-12 h-12 text-white/90 animate-pulse" />
                )}
              </div>
            </div>

            {/* Dynamic Status Titles */}
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              {statusText}
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 font-medium max-w-md">
              {subText}
            </p>

            {/* Retention Transition Button */}
            {phase === "retention" && (
              <button
                onClick={() => {
                  playTone(587.33, 1.5);
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
