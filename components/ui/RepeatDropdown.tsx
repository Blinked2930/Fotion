"use client";

import { useState, useRef, useEffect } from "react";
import { Repeat } from "lucide-react";
import {
  Recurrence,
  MONTH_SHORT,
  WEEKDAY_LONG,
  buildPreset,
  describeRecurrence,
  getBrowserTimeZone,
} from "@/convex/recurrence";
import { RecurrenceModal } from "./RecurrenceModal";

type OptionKey = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "custom";

export function RepeatDropdown({
  value,
  onChange,
  baseDate = null,
  align = "left",
  disabled = false,
}: {
  /** Current structured recurrence, or null for "None". */
  value: Recurrence | null;
  onChange: (val: Recurrence | null) => void;
  /** The task's Do-On (or Due-By) date. Presets like "Weekly on Wednesday" use it. */
  baseDate?: number | null;
  align?: "left" | "right";
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const d = new Date(baseDate ?? Date.now());
  const options: { key: OptionKey; label: string }[] = [
    { key: "none", label: "None" },
    { key: "daily", label: "Daily" },
    { key: "weekdays", label: "Weekdays (Mon–Fri)" },
    { key: "weekly", label: `Weekly on ${WEEKDAY_LONG[d.getDay()]}` },
    { key: "monthly", label: `Monthly on day ${d.getDate()}` },
    { key: "yearly", label: `Yearly on ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}` },
    { key: "custom", label: "Custom…" },
  ];

  const handleSelect = (key: OptionKey) => {
    setIsOpen(false);
    if (key === "none") {
      onChange(null);
    } else if (key === "custom") {
      setIsModalOpen(true);
    } else {
      onChange(buildPreset(key, baseDate, getBrowserTimeZone()));
    }
  };

  const isActive = value !== null;
  const label = value ? describeRecurrence(value) : "None";

  return (
    <div className="relative w-fit max-w-full" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`outline-none px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 font-medium text-[12px] border max-w-full ${disabled ? "opacity-70 pointer-events-none" : ""} ${isActive
            ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-900/50"
            : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          }`}
      >
        <Repeat className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-1 w-56 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-xl rounded-lg py-1 z-50`}
        >
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleSelect(opt.key)}
              className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center"
            >
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${opt.key !== "none"
                    ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-900/50"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]"
                  }`}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {isModalOpen && (
        <RecurrenceModal
          initial={value}
          baseDate={baseDate}
          onCancel={() => setIsModalOpen(false)}
          onSave={(rec) => {
            setIsModalOpen(false);
            onChange(rec);
          }}
        />
      )}
    </div>
  );
}