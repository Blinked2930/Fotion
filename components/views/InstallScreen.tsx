import React, { useState } from 'react';
import { Smartphone, Apple, Share, PlusSquare, MoreVertical, MoreHorizontal, X, Check, Download } from 'lucide-react';

export const InstallScreen = ({ onBypass }: { onBypass: () => void }) => {
    const [device, setDevice] = useState<'ios' | 'android' | null>(null);

    return (
        <div className="min-h-[100dvh] w-full bg-zinc-50 dark:bg-[#121212] flex flex-col items-center justify-center p-6 text-[var(--foreground)] relative overflow-hidden">
            
            {/* Background SVG pattern to match Fotion landing page */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none">
                <svg className="absolute top-[15%] left-[10%] w-64 h-64 text-zinc-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="0.5">
                    <circle cx="12" cy="12" r="10" />
                </svg>
                <svg className="absolute bottom-[20%] right-[10%] w-96 h-96 text-zinc-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <svg className="absolute top-[40%] right-[25%] w-32 h-32 text-zinc-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="0.5">
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                </svg>
            </div>

            {!device ? (
                <div className="max-w-sm w-full space-y-8 relative z-10 animate-in fade-in duration-300">
                    <div className="flex justify-center">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center border border-emerald-200 dark:border-emerald-900/50 shadow-sm">
                                <Download className="w-10 h-10 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center space-y-4">
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--foreground)]">Install Protocol</h1>
                        <p className="text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                            To ensure maximum reliability offline and preserve your session, this tool must be installed directly to your device.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => setDevice('ios')}
                            className="w-full py-3.5 rounded-xl bg-white dark:bg-[#1c1c1c] border border-[var(--border)] hover:border-zinc-300 dark:hover:border-zinc-700 font-bold text-[15px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-sm"
                        >
                            <Apple size={20} /> I have an iPhone
                        </button>
                        <button 
                            onClick={() => setDevice('android')}
                            className="w-full py-3.5 rounded-xl bg-white dark:bg-[#1c1c1c] border border-[var(--border)] hover:border-zinc-300 dark:hover:border-zinc-700 font-bold text-[15px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-sm"
                        >
                            <Smartphone size={20} /> I have an Android
                        </button>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-sm bg-white dark:bg-[#1c1c1c] border border-[var(--border)] shadow-2xl rounded-2xl p-6 sm:p-8 relative animate-in slide-in-from-bottom-4 duration-300 z-10">
                    <button 
                        onClick={() => setDevice(null)}
                        className="absolute top-4 right-4 w-8 h-8 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-500 active:scale-95 transition-colors"
                    >
                        <X size={16} />
                    </button>
                    
                    <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                        {device === 'ios' ? 'iOS Installation' : 'Android Installation'}
                    </h2>
                    
                    {device === 'ios' ? (
                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-6 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 inline-block px-2.5 py-1 rounded-md">
                            Must be in Safari Browser
                        </p>
                    ) : (
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-6 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 inline-block px-2.5 py-1 rounded-md">
                            Must be in Chrome Browser
                        </p>
                    )}

                    <div className="space-y-5 text-zinc-600 dark:text-zinc-300 text-[14px] font-medium mb-8">
                        {device === 'ios' ? (
                            <>
                                <div className="flex items-start gap-4">
                                    <MoreHorizontal size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="leading-snug">Tap the <strong className="text-[var(--foreground)]">3-dot menu</strong>.</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <Share size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="leading-snug">Tap the <strong className="text-[var(--foreground)]">Share icon</strong>.</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <PlusSquare size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="leading-snug">Scroll down and tap <strong className="text-[var(--foreground)]">Add to Home Screen</strong>.</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="leading-snug">Tap <strong className="text-[var(--foreground)]">Add</strong> in the top right corner.</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-start gap-4">
                                    <MoreVertical size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="leading-snug">Tap the <strong className="text-[var(--foreground)]">3-dot menu</strong> in the top right corner.</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <PlusSquare size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="leading-snug">Scroll down and tap <strong className="text-[var(--foreground)]">Add to Home screen</strong>.</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <Check size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="leading-snug">Tap <strong className="text-[var(--foreground)]">Install</strong> on the popup.</p>
                                </div>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={() => setDevice(null)}
                        className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold uppercase tracking-widest text-[11px] active:scale-[0.98] transition-all"
                    >
                        Back
                    </button>
                </div>
            )}

            <button 
                onClick={onBypass}
                className="mt-8 text-[11px] font-bold text-zinc-400 hover:text-[var(--foreground)] transition-colors underline underline-offset-4 uppercase tracking-widest z-10"
            >
                Continue in browser (Not Recommended)
            </button>
        </div>
    );
};