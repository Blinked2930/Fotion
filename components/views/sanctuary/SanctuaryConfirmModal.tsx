"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SERIF } from "./theme";

export function SanctuaryConfirmModal({
    title,
    body,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false,
    onConfirm,
    onCancel,
}: {
    title: string;
    body?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onCancel();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onCancel]);

    if (!mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="w-full max-w-md rounded-[28px] border border-black/10 bg-[#f8f5ef] p-7 shadow-2xl animate-in zoom-in-95 duration-200 dark:border-white/10 dark:bg-[#15151c] sm:p-9">
                <h3 className={`${SERIF} text-2xl font-medium leading-tight text-[var(--foreground)]`}>
                    {title}
                </h3>
                {body && (
                    <div className="mt-3 text-[14px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {body}
                    </div>
                )}
                <div className="mt-8 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-full px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        autoFocus
                        onClick={onConfirm}
                        className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                            destructive
                                ? "bg-red-500 text-white shadow-md shadow-red-500/20 hover:bg-red-600"
                                : "bg-[var(--foreground)] text-[var(--background)] shadow-md hover:opacity-90"
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}