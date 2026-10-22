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

    useEffect(() => {
        if (!isOpen) return;
        const onDown = (e: PointerEvent | MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
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
        <div className="relative flex items-center gap-2" ref={ref}>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    setIsOpen((v) => !v);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[15px] text-[var(--foreground)] outline-none transition-colors hover:border-zinc-400 focus:border-zinc-400 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/30 dark:focus:border-white/30"
            >
                <span className={`${SERIF} truncate`}>{current?.label ?? placeholder}</span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

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
                        role="listbox"
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-black/10 bg-white p-1.5 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-150 dark:border-white/10 dark:bg-[#252525]"
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
                                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors ${
                                        selected
                                            ? "bg-black/[0.04] text-[var(--foreground)] dark:bg-white/[0.06]"
                                            : "text-zinc-600 hover:bg-black/[0.03] dark:text-zinc-300 dark:hover:bg-white/[0.04]"
                                    }`}
                                >
                                    <span className={`${SERIF} truncate`}>{opt.label}</span>
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