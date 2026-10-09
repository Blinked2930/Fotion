"use client";

import { useState, useEffect, useRef } from "react";
import { X, Play, RotateCcw, Target, Cat, Sparkles, Circle, Check, Settings, Volume2, VolumeX } from "lucide-react";
import { FocusSettings } from "@/lib/focusSettings";

export function VisualFocusModal({
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
  const [durationSec, setDurationSec] = useState(settings.visualFocusDurationSec || 60);
  const [shape, setShape] = useState<"target" | "dot" | "cat" | "sparkles">(settings.visualFocusShape || "target");
  const [movementMode, setMovementMode] = useState<"bouncing" | "subtle" | "stationary">(
    settings.visualFocusMovementMode || "bouncing"
  );
  const [soundEnabled, setSoundEnabled] = useState(settings.visualFocusAudioEnabled ?? true);

  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Position state for movement animation
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const velRef = useRef({ vx: 0.35, vy: 0.28 });
  const floatTimeRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setDurationSec(settings.visualFocusDurationSec || 60);
    setShape(settings.visualFocusShape || "target");
    setMovementMode(settings.visualFocusMovementMode || "bouncing");
    setSoundEnabled(settings.visualFocusAudioEnabled ?? true);
    setTimeLeft(settings.visualFocusDurationSec || 60);
  }, [settings]);

  // Audio finish chime
  const playFinishChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2.5);
    } catch (e) {}
  };

  // Timer countdown
  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsCompleted(true);
            playFinishChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Animation Loop for Bouncing, Subtle Float, and Stationary Modes
  useEffect(() => {
    if (!isOpen) {
      setPos({ x: 50, y: 50 });
      return;
    }

    if (movementMode === "stationary") {
      setPos({ x: 50, y: 50 });
      return;
    }

    const updatePosition = () => {
      if (movementMode === "bouncing") {
        setPos((prev) => {
          let newX = prev.x + velRef.current.vx;
          let newY = prev.y + velRef.current.vy;

          if (newX <= 18 || newX >= 82) {
            velRef.current.vx *= -1;
            newX = Math.max(18, Math.min(82, newX));
          }
          if (newY <= 22 || newY >= 78) {
            velRef.current.vy *= -1;
            newY = Math.max(22, Math.min(78, newY));
          }

          return { x: newX, y: newY };
        });
      } else if (movementMode === "subtle") {
        floatTimeRef.current += 0.015;
        const t = floatTimeRef.current;
        const newX = 50;
        const newY = 50 - Math.abs(Math.sin(t * 1.5)) * 4;
        setPos({ x: newX, y: newY });
      }

      animFrameRef.current = requestAnimationFrame(updatePosition);
    };

    animFrameRef.current = requestAnimationFrame(updatePosition);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, movementMode]);

  if (!isOpen) return null;

  const handleStart = () => {
    setIsCompleted(false);
    setTimeLeft(durationSec);
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setTimeLeft(durationSec);
  };

  const handleSaveSettings = () => {
    onUpdateSettings({
      ...settings,
      visualFocusDurationSec: durationSec,
      visualFocusShape: shape,
      visualFocusMovementMode: movementMode,
      visualFocusAudioEnabled: soundEnabled,
    });
    setTimeLeft(durationSec);
    setShowSettings(false);
  };

  const renderTargetIcon = () => {
    switch (shape) {
      case "cat":
        return <Cat className="w-10 h-10 text-pink-400" />;
      case "sparkles":
        return <Sparkles className="w-10 h-10 text-amber-400" />;
      case "dot":
        return <Circle className="w-8 h-8 text-emerald-400 fill-current" />;
      case "target":
      default:
        return <Target className="w-10 h-10 text-indigo-400" />;
    }
  };

  const TICK_LABELS = [
    { value: 10, label: "10s" },
    { value: 30, label: "30s" },
    { value: 60, label: "60s" },
    { value: 90, label: "90s" },
    { value: 120, label: "120s" },
  ];

  return (
    <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300 flex flex-col justify-between p-6 select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto relative z-10">
        <div className="flex items-center gap-2 text-white font-bold tracking-wider uppercase text-xs sm:text-sm">
          <Target className="w-5 h-5 text-indigo-400" /> Visual Focus Exercise (Visual Fixation)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              onUpdateSettings({ ...settings, visualFocusAudioEnabled: next });
            }}
            className="p-2.5 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title={soundEnabled ? "Mute finish chime" : "Enable finish chime"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-full bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Exercise settings"
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

      {/* Main Focus Area */}
      <div className="flex-1 relative max-w-4xl w-full mx-auto flex flex-col items-center justify-center my-4">
        {showSettings ? (
          <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 text-left space-y-6 z-20 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" /> Visual Exercise Settings
            </h3>

            {/* Target Icon Selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Focus Target Image
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "target", label: "Target", icon: Target, color: "text-indigo-400" },
                  { id: "cat", label: "Cat", icon: Cat, color: "text-pink-400" },
                  { id: "dot", label: "Dot", icon: Circle, color: "text-emerald-400" },
                  { id: "sparkles", label: "Sparkles", icon: Sparkles, color: "text-amber-400" },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = shape === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setShape(item.id as any)}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                        isSelected
                          ? "bg-indigo-950/80 border-indigo-400 text-white shadow-lg"
                          : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${item.color}`} />
                      <span className="text-[11px] font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Movement Mode */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                Target Movement Pattern
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "bouncing", label: "Bouncing" },
                  { id: "subtle", label: "Subtle Float" },
                  { id: "stationary", label: "Fixed Center" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setMovementMode(mode.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      movementMode === mode.id
                        ? "bg-indigo-500 text-black border-indigo-400"
                        : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Slider with Clean Ticks */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                <span>Fixation Duration</span>
                <span className="text-indigo-400 font-extrabold text-sm">{durationSec} seconds</span>
              </div>

              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />

              {/* Mathematical Tick Marks positioned at exact percentages */}
              <div className="relative w-full h-6 mt-1 text-[11px] font-bold text-zinc-500">
                {TICK_LABELS.map((tick) => {
                  const pct = ((tick.value - 10) / (120 - 10)) * 100;
                  const isSelected = durationSec === tick.value;
                  return (
                    <button
                      key={tick.value}
                      type="button"
                      onClick={() => setDurationSec(tick.value)}
                      className={`absolute -translate-x-1/2 transition-colors ${
                        isSelected ? "text-indigo-400 font-black" : "hover:text-zinc-300"
                      }`}
                      style={{ left: `${pct}%` }}
                    >
                      {tick.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-black font-extrabold rounded-2xl transition-all shadow-lg active:scale-95 text-center"
            >
              Save Exercise Settings
            </button>
          </div>
        ) : (
          <>
            {/* The Moving / Stationary Target Icon (No CSS transition latency drag!) */}
            <div
              className="absolute flex items-center justify-center p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-ping" />
                {renderTargetIcon()}
              </div>
            </div>

            {/* Center Info / Completion Message */}
            <div className="relative z-10 text-center pointer-events-none mt-auto mb-16">
              {isCompleted ? (
                <div className="animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h2 className="text-3xl font-extrabold text-white mb-2">Visual Focus Locked!</h2>
                  <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                    Your prefrontal cortex and visual focus pathways are activated. Ready for deep work session.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-6xl sm:text-7xl font-black text-white tracking-tighter tabular-nums mb-3">
                    {timeLeft}s
                  </div>
                  <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-zinc-400">
                    {isRunning ? "Fixate your gaze on the target without blinking" : "Press Start to begin fixation exercise"}
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Action Controls */}
      <div className="flex items-center justify-center gap-4 max-w-md w-full mx-auto pb-4 relative z-10">
        {!isRunning && !isCompleted ? (
          <button
            onClick={handleStart}
            className="flex-1 py-4 bg-indigo-500 hover:bg-indigo-400 text-black font-black text-lg rounded-full shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Play className="w-6 h-6 fill-current" /> Start Visual Focus ({durationSec}s)
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="px-8 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-full transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" /> Reset Exercise
          </button>
        )}
      </div>
    </div>
  );
}


