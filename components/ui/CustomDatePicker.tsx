"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, XCircle } from "lucide-react";

export function CustomDatePicker({ 
  value, 
  onChange, 
  placeholder = "Empty",
  alignPopover = "right" 
}: { 
  value?: number | null, 
  onChange: (val: number | null) => void, 
  placeholder?: string,
  alignPopover?: "left" | "right" | "center"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent | MouseEvent) => {
      // Don't close if clicking the mobile backdrop, the backdrop handles its own clicks
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const displayString = value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : placeholder;

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const handleSelectDate = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(newDate.getTime());
    setIsOpen(false);
  };

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

  // GEOMETRY FIX: These alignment classes now ONLY apply on desktop (sm:). 
  // Mobile always uses fixed centering.
  const alignmentClasses = {
    left: "sm:right-0 sm:origin-top-right", 
    right: "sm:left-0 sm:origin-top-left",  
    center: "sm:left-1/2 sm:-translate-x-1/2 sm:origin-top"
  };

  return (
    <div className="relative flex items-center gap-2 group/date" ref={ref}>
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
        className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors border ${value ? 'bg-white dark:bg-[#252525] border-[var(--border)] text-[var(--foreground)] shadow-sm' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      >
        {displayString}
      </button>
      
      {value && (
        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); onChange(null); }} 
          className="opacity-0 group-hover/date:opacity-100 p-1 text-zinc-400 hover:text-red-500 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
        >
          <XCircle className="w-3.5 h-3.5" />
        </button>
      )}

      {isOpen && (
        <>
          {/* MOBILE MODAL BACKDROP: Blurs the screen and traps the click */}
          <div 
            className="fixed inset-0 z-[90] sm:hidden bg-black/5 dark:bg-black/40 backdrop-blur-[2px]"
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(false); }}
          />

          {/* MOBILE: Fixed Center Modal | DESKTOP: Absolute Dropdown */}
          <div className={`
            fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px]
            sm:absolute sm:top-full sm:mt-2 sm:w-64 sm:translate-x-0 sm:translate-y-0
            ${alignmentClasses[alignPopover]}
            bg-white dark:bg-[#252525] border border-[var(--border)] shadow-2xl sm:shadow-xl rounded-2xl sm:rounded-xl p-4 sm:p-3 z-[100] animate-in fade-in zoom-in-95 duration-200
          `}>
            <div className="flex items-center justify-between mb-4 sm:mb-3">
              <button type="button" onClick={prevMonth} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-[var(--foreground)] transition-colors"><ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <span className="text-[15px] sm:text-[14px] font-semibold text-[var(--foreground)]">
                {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" onClick={nextMonth} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-[var(--foreground)] transition-colors"><ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" /></button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2 sm:mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-[11px] sm:text-[10px] font-semibold text-zinc-400 py-1">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-1">
              {blanks.map(b => <div key={`blank-${b}`} className="w-9 h-9 sm:w-8 sm:h-8" />)}
              {days.map(day => {
                const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === viewDate.getMonth() && new Date(value).getFullYear() === viewDate.getFullYear();
                const isToday = new Date().getDate() === day && new Date().getMonth() === viewDate.getMonth() && new Date().getFullYear() === viewDate.getFullYear();
                
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelectDate(day)}
                    className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg sm:rounded text-[14px] sm:text-[13px] flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-blue-500 text-white font-medium shadow-sm' : 
                      isToday ? 'bg-zinc-100 dark:bg-zinc-800 text-blue-500 font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700' : 
                      'text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800'
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