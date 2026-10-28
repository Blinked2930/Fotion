"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { SERIF } from "./theme";

export function SanctuarySelect<T extends string>({
    value,
    options,
    onChange,
    placeholder = "Choose…",
    alignPopover = "right", // kept for API compatibility, no longer used
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (next: T) => void;
    placeholder?: string;
    alignPopover?: "left" | "right" | "center";
}) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const onDown = (e: PointerEvent | MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [isOpen]);

    const current = options.find((o) => o.value === value);

    return (
        <div className="relative w-full min-w-0" ref={ref}>
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setIsOpen((v) => !v);
                }}
                className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[15px] text-[var(--foreground)] outline-none transition-colors hover:border-zinc-400 focus:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/30 dark:focus:border-white/30"
            >
                <span className={`${SERIF} min-w-0 truncate`}>{current?.label ?? placeholder}</span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen && (
                <>
                    {/*
                      Mobile: dim the page slightly so the anchored popover
                      below reads as an active sheet. Desktop: invisible
                      backdrop (transparent) because the centered popover
                      already reads as a modal without a full-screen dimmer.
                    */}
                    <div
                        className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-0"
                        onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                    />
                    {/*
                      Mobile (< sm): anchored directly below the trigger so the
                      option list appears where the user tapped. Fixes the
                      "Personal dropdown way too far to the right" issue —
                      previously this was a viewport-centered 320px modal that
                      floated off-axis from a 150px-wide field in the editor.

                      Desktop (sm+): centered modal as before, which works well
                      when there's plenty of horizontal room.
                    */}
                    <div
                        role="listbox"
                        className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+1rem)] z-[100] max-h-[70vh] overflow-y-auto rounded-2xl border border-black/10 bg-white p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 dark:border-white/10 dark:bg-[#252525] sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[320px] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2"
                    >
                        {options.map((opt) => {
                            const selected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors active:scale-[0.99] ${
                                        selected
                                            ? "bg-black/[0.04] text-[var(--foreground)] dark:bg-white/[0.06]"
                                            : "text-zinc-600 hover:bg-black/[0.03] dark:text-zinc-300 dark:hover:bg-white/[0.04]"
                                    }`}
                                >
                                    <span className={`${SERIF} min-w-0 truncate`}>{opt.label}</span>
                                    {selected && <Check className="h-4 w-4 shrink-0 text-zinc-500" />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}