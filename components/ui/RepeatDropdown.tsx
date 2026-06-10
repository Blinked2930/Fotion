import { useState, useRef, useEffect } from "react";
import { Repeat } from "lucide-react";

export function RepeatDropdown({ 
  value, 
  onChange,
  align = "left",
  disabled = false
}: { 
  value: "none" | "daily" | "weekly" | "monthly", 
  onChange: (val: "none" | "daily" | "weekly" | "monthly") => void,
  align?: "left" | "right",
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const options = [
    { value: "none", label: "None" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  const currentOpt = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative w-fit" ref={ref}>
      <button 
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`outline-none px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 font-medium text-[12px] border max-w-full ${disabled ? 'opacity-70 pointer-events-none' : ''} ${value !== 'none' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-900/50' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
      >
        <Repeat className="w-3.5 h-3.5 shrink-0" />
        <span>{currentOpt.label}</span>
      </button>

      {isOpen && (
        <div className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1 w-32 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-xl rounded-lg py-1 z-50`}>
          {options.map(opt => (
            <button 
              key={opt.value} 
              type="button"
              onClick={() => { onChange(opt.value as any); setIsOpen(false); }} 
              className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center"
            >
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${opt.value !== 'none' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-900/50' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]'}`}>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
