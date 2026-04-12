"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { calculateQuadrant } from "@/lib/eisenhower";
import { useRouter } from "next/navigation";
import { 
  Loader2, Type, PlayCircle, Calendar, CheckSquare, 
  List as ListIcon, Folder, Sigma, Check, Maximize2
} from "lucide-react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { getProjectColor, getListColor } from "./NewTaskForm";

const NotionHeader = ({ icon: Icon, label, minWidth }: { icon: any, label: string, minWidth?: string }) => (
  <th className="border border-[var(--border)] px-3 py-2 font-normal text-zinc-500 dark:text-zinc-400 text-[13px] bg-zinc-50/50 dark:bg-zinc-900/50 text-left align-middle" style={{ minWidth: minWidth || '140px' }}>
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="w-3.5 h-3.5 text-zinc-400" />
      {label}
    </div>
  </th>
);

const NotionCell = ({ children }: { children: React.ReactNode }) => (
  <td className="border border-[var(--border)] px-3 py-1.5 text-[13px] text-[var(--foreground)] align-middle h-[40px]">
    {children}
  </td>
);

const NotionCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button onClick={onChange} className="flex items-center w-full h-full">
    {checked ? (
      <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center shadow-sm">
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </div>
    ) : (
      <div className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-600 bg-transparent"></div>
    )}
  </button>
);

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
  const tasks = useQuery(api.tasks.getTasks);
  const projects = useQuery(api.projects.getProjects);
  const updateTask = useMutation(api.tasks.updateTask);
  const createProject = useMutation(api.projects.createProject);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

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
      const newId = await createProject({ name: newProjectName.trim() });
      if (pendingTaskId) {
        handleUpdate(pendingTaskId, "projectId", newId);
      }
      setIsModalOpen(false);
      setNewProjectName("");
      setPendingTaskId(null);
    }
  };

  const projectOptions = [
    { value: null, label: "None" },
    ...projects.map(p => ({ value: p._id, label: p.name }))
  ];

  const ProjectPill = (id: string) => {
    const p = projects.find(proj => proj._id === id);
    if (!p) return <span className="text-zinc-400 text-xs">Empty</span>;
    return <span className={`px-3 py-0.5 rounded-full border text-[12px] font-medium whitespace-nowrap ${getProjectColor(id)}`}>{p.name}</span>;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .no-scroll-bar::-webkit-scrollbar { display: none; }
        .no-scroll-bar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <div className="w-full overflow-x-auto pb-48 no-scroll-bar">
        <div className="inline-block min-w-full align-middle">
          <table className="w-full text-left border-collapse border border-[var(--border)]">
            <thead>
              <tr>
                <NotionHeader icon={Type} label="Task Name" minWidth="280px" />
                <NotionHeader icon={PlayCircle} label="Status" minWidth="130px" />
                <NotionHeader icon={Calendar} label="Due By Date" minWidth="150px" />
                <NotionHeader icon={Calendar} label="Do On Date" minWidth="150px" />
                <NotionHeader icon={CheckSquare} label="Important?" minWidth="110px" />
                <NotionHeader icon={CheckSquare} label="Urgent?" minWidth="100px" />
                <NotionHeader icon={CheckSquare} label="For Funsies" minWidth="110px" />
                <NotionHeader icon={Folder} label="Project" minWidth="160px" />
                <NotionHeader icon={ListIcon} label="Pipelines" minWidth="160px" />
                <NotionHeader icon={Sigma} label="Quadrant" minWidth="180px" />
                <NotionHeader icon={CheckSquare} label="Today" minWidth="90px" />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
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
                        {/* Bulletproofed root router push */}
                        <button 
                          onClick={() => router.push(`/?taskId=${task._id}`)}
                          className="flex-shrink-0 p-1.5 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-sm rounded text-zinc-500 hover:text-[var(--foreground)] sm:opacity-0 sm:group-hover/title:opacity-100 transition-all"
                          title="Open Task Details"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </NotionCell>
                    
                    <NotionCell>
                      <BeautifulDropdown 
                        value={task.status} 
                        options={[{value: 'todo'}, {value: 'in-progress'}, {value: 'done'}]} 
                        onChange={(val) => handleUpdate(task._id, "status", val)} 
                        renderPill={StatusPill} 
                      />
                    </NotionCell>
                    
                    <NotionCell>
                      <div className="whitespace-nowrap min-w-[130px]">
                        <CustomDatePicker value={task.doByDate ?? null} onChange={(val) => handleUpdate(task._id, "doByDate", val)} />
                      </div>
                    </NotionCell>
                    
                    <NotionCell>
                      <div className="whitespace-nowrap min-w-[130px]">
                        <CustomDatePicker value={task.doOnDate ?? null} onChange={(val) => handleUpdate(task._id, "doOnDate", val)} />
                      </div>
                    </NotionCell>

                    <NotionCell>
                      <NotionCheckbox checked={task.isImportant} onChange={() => handleUpdate(task._id, "isImportant", !task.isImportant)} />
                    </NotionCell>

                    <NotionCell>
                      <NotionCheckbox checked={task.isUrgent} onChange={() => handleUpdate(task._id, "isUrgent", !task.isUrgent)} />
                    </NotionCell>

                    <NotionCell>
                      <NotionCheckbox checked={task.isForFunsies} onChange={() => handleUpdate(task._id, "isForFunsies", !task.isForFunsies)} />
                    </NotionCell>

                    <NotionCell>
                      <BeautifulDropdown 
                        value={task.projectId} 
                        options={projectOptions} 
                        onChange={(val) => handleUpdate(task._id, "projectId", val)} 
                        renderPill={ProjectPill} 
                        placeholder="None"
                        actionLabel="+ Create Project"
                        onActionClick={() => {
                          setPendingTaskId(task._id);
                          setIsModalOpen(true);
                        }}
                      />
                    </NotionCell>

                    <NotionCell>
                      <BeautifulDropdown 
                        value={task.listCategory || "Current"} 
                        options={[{value: 'Current'}, {value: 'Waiting For'}, {value: 'Someday Maybe'}]} 
                        onChange={(val) => handleUpdate(task._id, "listCategory", val)} 
                        renderPill={ListPill} 
                      />
                    </NotionCell>

                    <NotionCell>
                      <span className="text-zinc-600 dark:text-zinc-300 text-[12px]">{quadrant}</span>
                    </NotionCell>

                    <NotionCell>
                      <NotionCheckbox checked={!!task.isToday} onChange={() => handleUpdate(task._id, "isToday", !task.isToday)} />
                    </NotionCell>
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
              <button onClick={() => { setIsModalOpen(false); setPendingTaskId(null); }} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateProject} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}