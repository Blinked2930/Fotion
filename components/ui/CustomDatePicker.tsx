"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, XCircle } from "lucide-react";

export function CustomDatePicker({ 
  value, 
  onChange, 
  placeholder = "Empty" 
}: { 
  value?: number | null, 
  onChange: (val: number | null) => void, 
  placeholder?: string 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  return (
    <div className="relative flex items-center gap-2 group/date" ref={ref}>
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
        className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors border ${value ? 'bg-white dark:bg-zinc-800 border-[var(--border)] text-[var(--foreground)] shadow-sm' : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
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
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-xl rounded-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-[var(--foreground)] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-[14px] font-semibold text-[var(--foreground)]">
              {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-[var(--foreground)] transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-[10px] font-semibold text-zinc-400 py-1">{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {blanks.map(b => <div key={`blank-${b}`} className="w-7 h-7" />)}
            {days.map(day => {
              const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === viewDate.getMonth() && new Date(value).getFullYear() === viewDate.getFullYear();
              const isToday = new Date().getDate() === day && new Date().getMonth() === viewDate.getMonth() && new Date().getFullYear() === viewDate.getFullYear();
              
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={`w-7 h-7 rounded text-[13px] flex items-center justify-center transition-colors ${
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
      )}
    </div>
  );
}