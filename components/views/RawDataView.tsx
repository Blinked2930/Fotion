"use client";

import { useState, useRef, useEffect } from "react";
import { calculateQuadrant } from "@/lib/eisenhower";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { 
  Loader2, Type, PlayCircle, Calendar, CheckSquare, 
  List as ListIcon, Folder, Sigma, Check, Maximize2, Link as LinkIcon, AlertTriangle, Target, FilterX
} from "lucide-react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { getProjectColor, getListColor } from "./NewTaskForm";
import { useGuestSession } from "@/hooks/useGuestSession"; 
import { useOfflineQuery, useOfflineSyncMutation } from "@/hooks/useOfflineMutation";

type SortConfig = { key: string, direction: 'asc' | 'desc' }[];

const NotionHeader = ({ 
  icon: Icon, label, minWidth, sortKey, currentSorts, onSort 
}: { 
  icon: any, label: string, minWidth?: string, sortKey?: string, currentSorts?: SortConfig, onSort?: (key: string) => void 
}) => {
  const sortInfo = currentSorts?.find(s => s.key === sortKey);
  const sortIndex = currentSorts && sortInfo ? currentSorts.findIndex(s => s.key === sortKey) + 1 : -1;
  
  return (
    <th 
      onClick={() => sortKey && onSort && onSort(sortKey)}
      className={`border border-[var(--border)] px-3 py-2 font-normal text-[13px] text-left align-middle select-none ${sortKey ? 'cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800' : 'bg-zinc-50/50 dark:bg-zinc-900/50'} ${sortInfo ? 'text-[var(--foreground)] bg-zinc-100/50 dark:bg-zinc-800/50' : 'text-zinc-500 dark:text-zinc-400'}`} 
      style={{ minWidth: minWidth || '140px' }}
    >
      <div className="flex items-center justify-between whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${sortInfo ? 'text-blue-500' : 'text-zinc-400'}`} />
          {label}
        </div>
        {sortInfo && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 ml-2 bg-blue-50 dark:bg-blue-900/30 px-1.5 rounded">
            <span>{sortIndex}</span>
            <span>{sortInfo.direction === 'asc' ? '↑' : '↓'}</span>
          </div>
        )}
      </div>
    </th>
  );
};

const NotionCell = ({ children }: { children: React.ReactNode }) => (
  <td className="border border-[var(--border)] px-3 py-1.5 text-[13px] text-[var(--foreground)] align-middle h-[40px]">
    {children}
  </td>
);

function CopyLinkButton({ token, isPublic }: { token?: string, isPublic?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!token || !isPublic) return null; 
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(`${window.location.origin}/?vip=${token}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex-shrink-0 ml-2"
      title={`Copy VIP Link`}
    >
      {copied ? <Check className="w-4 h-4 text-blue-500" /> : <LinkIcon className="w-4 h-4" />}
    </button>
  );
}

function BeautifulDropdown({ 
  value, 
  options, 
  onChange, 
  renderPill, 
  placeholder = "Empty",
  actionLabel,
  onActionClick
}: { 
  value: any, 
  options: {value: string | null, label?: string}[], 
  onChange: (val: any) => void, 
  renderPill: (val: any) => React.ReactNode, 
  placeholder?: string,
  actionLabel?: string,
  onActionClick?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left flex items-center justify-between p-1 -ml-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        {value ? renderPill(value) : <span className="text-zinc-400 text-xs px-2">{placeholder}</span>}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 z-[100] mt-1 min-w-[140px] bg-white dark:bg-[#252525] border border-[var(--border)] rounded-lg shadow-xl py-1">
          {options.map(opt => (
            <button 
              key={opt.value || 'null'} 
              onClick={() => { onChange(opt.value); setIsOpen(false); }} 
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center"
            >
              {opt.value ? renderPill(opt.value) : <span className="text-zinc-400 text-xs">{opt.label || placeholder}</span>}
            </button>
          ))}
          {actionLabel && onActionClick && (
            <>
              <div className="border-t border-[var(--border)] my-1"></div>
              <button 
                onClick={() => { setIsOpen(false); onActionClick(); }} 
                className="w-full text-left px-3 py-1.5 text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium text-[12px] transition-colors"
              >
                {actionLabel}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const StatusPill = (status: string) => {
  const styles: Record<string, string> = {
    'todo': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
    'in-progress': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-900/50',
    'done': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900/50',
  };
  const labels: Record<string, string> = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };
  return <span className={`px-3 py-0.5 rounded-full border text-[12px] font-medium whitespace-nowrap ${styles[status] || styles['todo']}`}>{labels[status] || status}</span>;
};

const ListPill = (list: string) => {
  return <span className={`px-3 py-0.5 rounded-full border text-[12px] font-medium whitespace-nowrap ${getListColor(list)}`}>{list}</span>;
};

export function RawDataView() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const sessionId = useGuestSession(); 
  
  const tasks = useOfflineQuery(api.tasks.getTasks, { sessionId: sessionId ?? undefined }, "getTasks"); 
  const projects = useOfflineQuery(api.projects.getProjects, { sessionId: sessionId ?? undefined }, "getProjects");
  
  const updateTask = useOfflineSyncMutation(api.tasks.updateTask, "updateTask");
  const createProject = useOfflineSyncMutation(api.projects.createProject, "createProject");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"synced" | "offline" | "syncing">("synced");

  // NEW: Sort State
  const [sortConfig, setSortConfig] = useState<SortConfig>([]);

  useEffect(() => {
    const handleOnline = () => {
      setSyncState("syncing");
      setTimeout(() => setSyncState("synced"), 2000);
    };
    const handleOffline = () => setSyncState("offline");
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (typeof window !== "undefined" && !navigator.onLine) setSyncState("offline");
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (tasks === undefined || projects === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
      </div>
    );
  }

  const handleUpdate = (id: any, field: string, value: any) => {
    updateTask({ id, [field]: value });
  };

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      const newId = await createProject({ name: newProjectName.trim(), sessionId: sessionId ?? undefined });
      if (pendingTaskId && newId) {
        handleUpdate(pendingTaskId, "projectId", newId);
      }
      setIsModalOpen(false);
      setNewProjectName("");
      setPendingTaskId(null);
    }
  };

  const projectOptions = [
    { value: null, label: "None" },
    ...projects.map((p: any) => ({ value: p._id, label: p.name }))
  ];

  const ProjectPill = (id: string) => {
    const p = projects.find((proj: any) => proj._id === id);
    if (!p) return <span className="text-zinc-400 text-xs">Empty</span>;
    return <span className={`px-3 py-0.5 rounded-full border text-[12px] font-medium whitespace-nowrap ${getProjectColor(id)}`}>{p.name}</span>;
  };

  // MULTI-COLUMN SORT LOGIC
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      const existingIndex = prev.findIndex(s => s.key === key);
      const newConfig = [...prev];
      
      if (existingIndex >= 0) {
        if (newConfig[existingIndex].direction === 'asc') {
          newConfig[existingIndex].direction = 'desc';
        } else {
          newConfig.splice(existingIndex, 1);
        }
      } else {
        newConfig.push({ key, direction: 'asc' });
      }
      return newConfig;
    });
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    for (const sort of sortConfig) {
      let aVal = a[sort.key];
      let bVal = b[sort.key];

      if (sort.key === 'quadrant') {
        aVal = calculateQuadrant(a.isForFunsies, a.isUrgent, a.isImportant);
        bVal = calculateQuadrant(b.isForFunsies, b.isUrgent, b.isImportant);
      } else if (sort.key === 'projectId') {
        aVal = projects?.find((p: any) => p._id === a.projectId)?.name || "Z";
        bVal = projects?.find((p: any) => p._id === b.projectId)?.name || "Z";
      }

      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";
      
      if (aVal === bVal) continue;
      
      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  return (
    <>
      {sortConfig.length > 0 && (
        <div className="mb-3 flex items-center justify-end">
          <button 
            onClick={() => setSortConfig([])}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-md text-xs font-bold transition-colors border border-red-200 dark:border-red-900/50"
          >
            <FilterX className="w-3.5 h-3.5" /> Clear Sort ({sortConfig.length})
          </button>
        </div>
      )}

      <div className="w-full overflow-x-auto pb-64 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] no-swipe-zone relative">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full text-left border-collapse border border-[var(--border)]">
            <thead>
              <tr>
                <NotionHeader icon={Type} label="Task Name" minWidth="280px" sortKey="title" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={PlayCircle} label="Status" minWidth="130px" sortKey="status" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={Calendar} label="Due By Date" minWidth="150px" sortKey="doByDate" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={Calendar} label="Do On Date" minWidth="150px" sortKey="doOnDate" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={CheckSquare} label="Important?" minWidth="110px" sortKey="isImportant" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={CheckSquare} label="Urgent?" minWidth="100px" sortKey="isUrgent" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={CheckSquare} label="For Funsies" minWidth="110px" sortKey="isForFunsies" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={Folder} label="Project" minWidth="160px" sortKey="projectId" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={ListIcon} label="Pipelines" minWidth="160px" sortKey="listCategory" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={Sigma} label="Quadrant" minWidth="180px" sortKey="quadrant" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={Target} label="Focus Mode" minWidth="120px" sortKey="isFocused" currentSorts={sortConfig} onSort={handleSort} />
                <NotionHeader icon={CheckSquare} label="Today" minWidth="90px" sortKey="isToday" currentSorts={sortConfig} onSort={handleSort} />
                {isSignedIn && <NotionHeader icon={LinkIcon} label="Share Access" minWidth="160px" />}
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task: any) => {
                const quadrant = calculateQuadrant(task.isForFunsies, task.isUrgent, task.isImportant);
                return (
                  <tr key={task._id} className="hover:bg-zinc-50 dark:bg-zinc-900/40 transition-colors group">
                    <NotionCell>
                      <div className="group/title relative flex items-center w-full gap-2">
                        <input 
                          type="text" 
                          defaultValue={task.title} 
                          onBlur={(e) => { if(e.target.value.trim() !== task.title) handleUpdate(task._id, "title", e.target.value.trim() || "Unknown Task") }}
                          className="bg-transparent flex-1 min-w-0 outline-none font-medium truncate"
                        />
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/?taskId=${task._id}`);
                          }}
                          className="flex-shrink-0 p-1.5 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-sm rounded text-zinc-500 hover:text-[var(--foreground)] sm:opacity-0 sm:group-hover/title:opacity-100 transition-all"
                          title="Open Task Details"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </NotionCell>
                    
                    <NotionCell><BeautifulDropdown value={task.status} options={[{value: 'todo'}, {value: 'in-progress'}, {value: 'done'}]} onChange={(val) => handleUpdate(task._id, "status", val)} renderPill={StatusPill} /></NotionCell>
                    <NotionCell><div className="whitespace-nowrap min-w-[130px]"><CustomDatePicker value={task.doByDate ?? null} onChange={(val) => handleUpdate(task._id, "doByDate", val)} alignPopover="right" /></div></NotionCell>
                    <NotionCell><div className="whitespace-nowrap min-w-[130px]"><CustomDatePicker value={task.doOnDate ?? null} onChange={(val) => handleUpdate(task._id, "doOnDate", val)} alignPopover="right" /></div></NotionCell>
                    <NotionCell><button onClick={() => handleUpdate(task._id, "isImportant", !task.isImportant)} className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${task.isImportant ? 'bg-pink-400 border-pink-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}`}>{task.isImportant && <Check className="w-3 h-3 text-white" strokeWidth={3} />}</button></NotionCell>
                    <NotionCell><button onClick={() => handleUpdate(task._id, "isUrgent", !task.isUrgent)} className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${task.isUrgent ? 'bg-pink-400 border-pink-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}`}>{task.isUrgent && <Check className="w-3 h-3 text-white" strokeWidth={3} />}</button></NotionCell>
                    <NotionCell><button onClick={() => handleUpdate(task._id, "isForFunsies", !task.isForFunsies)} className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${task.isForFunsies ? 'bg-pink-400 border-pink-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}`}>{task.isForFunsies && <Check className="w-3 h-3 text-white" strokeWidth={3} />}</button></NotionCell>
                    <NotionCell><BeautifulDropdown value={task.projectId} options={projectOptions} onChange={(val) => handleUpdate(task._id, "projectId", val)} renderPill={ProjectPill} placeholder="None" actionLabel="+ Create Project" onActionClick={() => { setPendingTaskId(task._id); setIsModalOpen(true); }} /></NotionCell>
                    <NotionCell><BeautifulDropdown value={task.listCategory || "Current"} options={[{value: 'Current'}, {value: 'Waiting For'}, {value: 'Someday Maybe'}]} onChange={(val) => handleUpdate(task._id, "listCategory", val)} renderPill={ListPill} /></NotionCell>
                    <NotionCell><span className="text-zinc-600 dark:text-zinc-300 text-[12px]">{quadrant}</span></NotionCell>
                    <NotionCell><button onClick={() => handleUpdate(task._id, "isFocused", !task.isFocused)} className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${task.isFocused ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}`}>{task.isFocused && <Check className="w-3 h-3 text-white" strokeWidth={3} />}</button></NotionCell>
                    <NotionCell><button onClick={() => handleUpdate(task._id, "isToday", !task.isToday)} className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${task.isToday ? 'bg-pink-400 border-pink-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}`}>{task.isToday && <Check className="w-3 h-3 text-white" strokeWidth={3} />}</button></NotionCell>

                    {isSignedIn && (
                      <NotionCell>
                        <div className="flex items-center">
                          <button 
                            onClick={() => {
                              if (task.shareToken && task.isPublic) {
                                updateTask({ id: task._id, shareToken: "", isPublic: false, sharedWithSessions: [] });
                              } else {
                                const newToken = task.shareToken || Math.random().toString(36).substring(2, 10);
                                updateTask({ id: task._id, shareToken: newToken, isPublic: true });
                              }
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none ${task.isPublic ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${task.isPublic ? 'translate-x-2' : '-translate-x-2'}`} />
                          </button>
                          <CopyLinkButton token={task.shareToken} isPublic={task.isPublic} />
                        </div>
                      </NotionCell>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {tasks.length === 0 && (
            <div className="w-full text-center py-12 border border-t-0 border-[var(--border)] text-zinc-400 text-sm">
              No tasks found.
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-[90] flex flex-col gap-2 pointer-events-none">
        {syncState === "offline" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-4 duration-300">
            <AlertTriangle className="w-4 h-4" /> Offline: Saved Locally
          </div>
        )}
        {syncState === "syncing" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-lg text-xs font-medium animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Loader2 className="w-4 h-4 animate-spin" /> Syncing...
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1c] p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-[var(--border)] relative" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-[var(--foreground)] mb-4">New Project</h3>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g., Q3 Finances"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              className="w-full bg-transparent border border-[var(--border)] rounded-lg p-2 text-[var(--foreground)] mb-6 outline-none focus:border-blue-500 text-[14px]"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setIsModalOpen(false); setPendingTaskId(null); }} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleCreateProject} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}