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
  value: Recurrence | null;
  onChange: (val: Recurrence | null) => void;
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
          className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-2 w-56 bg-white dark:bg-[#1a1a1a] border border-[var(--border)] shadow-xl rounded-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden`}
        >
          {options.map((opt) => {
            const isCustom = opt.key === "custom";
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSelect(opt.key)}
                className={`w-full text-left px-3 py-2.5 flex items-center transition-colors ${isCustom ? 'hover:bg-pink-50 dark:hover:bg-pink-900/20 border-t border-[var(--border)] mt-1 pt-3' : 'hover:bg-zinc-50 dark:hover:bg-[#252525]'}`}
              >
                <span
                  className={`px-3 py-1 rounded-full text-[12px] font-bold border ${opt.key !== "none"
                    ? isCustom ? "bg-pink-500 text-white border-pink-500 shadow-sm" : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-900/50"
                    : "bg-zinc-100 text-zinc-600 dark:bg-[#2a2a2a] dark:text-zinc-300 border-transparent"
                    }`}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
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