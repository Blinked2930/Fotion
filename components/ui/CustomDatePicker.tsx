"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function CustomDatePicker({
  value,
  onChange,
  placeholder = "Empty",
  alignPopover = "right",
}: {
  value?: number | null;
  onChange: (val: number | null) => void;
  placeholder?: string;
  alignPopover?: "left" | "right" | "center";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent | MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const displayString = value
    ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : placeholder;

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const handleSelectDate = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(newDate.getTime());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
  };

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      {/*
        Trigger pill: matches the size/spacing of the Project pill in
        TaskDetailsPane (px-3 py-1 text-[12px] rounded-full). The previous
        min-h-11 made it visually dominate the property row alongside the
        other pills, which are all ~24px tall.
      */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={`touch-manipulation rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
          value
            ? "bg-white dark:bg-[#252525] border-[var(--border)] text-[var(--foreground)] shadow-sm hover:border-zinc-400"
            : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }`}
      >
        {displayString}
      </button>

      {/*
        Clear button: shrunk to a 24px hit area that reads as an inline
        X next to the pill. The visual target is a 14px glyph inside a
        24px circle (via p-1 padding), which matches the visual weight
        of the pill without dominating it. On touch devices the visual
        is small but the tappable area is the full button (24px), which
        is still comfortable to hit without a stray tap.
      */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear date"
          title="Clear date"
          className="flex h-6 w-6 shrink-0 touch-manipulation items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-500 active:bg-red-500/10 dark:hover:bg-red-500/10 dark:active:bg-red-500/10"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/5 dark:bg-black/40 backdrop-blur-[2px]"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] max-w-[calc(100vw-2rem)] bg-white dark:bg-[#252525] border border-[var(--border)] shadow-2xl rounded-2xl p-4 z-[100] animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-[var(--foreground)] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-[15px] font-semibold text-[var(--foreground)]">
                {viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-[var(--foreground)] transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div
                  key={day}
                  className="text-center text-[11px] font-semibold text-zinc-400 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {blanks.map((b) => (
                <div key={`blank-${b}`} className="w-9 h-9" />
              ))}
              {days.map((day) => {
                const isSelected =
                  value &&
                  new Date(value).getDate() === day &&
                  new Date(value).getMonth() === viewDate.getMonth() &&
                  new Date(value).getFullYear() === viewDate.getFullYear();
                const isToday =
                  new Date().getDate() === day &&
                  new Date().getMonth() === viewDate.getMonth() &&
                  new Date().getFullYear() === viewDate.getFullYear();

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDate(day)}
                    className={`w-9 h-9 rounded-lg text-[14px] flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-blue-500 text-white font-medium shadow-sm"
                        : isToday
                        ? "bg-zinc-100 dark:bg-zinc-800 text-blue-500 font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        : "text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}