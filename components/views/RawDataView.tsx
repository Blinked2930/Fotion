"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { calculateQuadrant } from "@/lib/eisenhower";
import { 
  Loader2, Type, PlayCircle, Calendar, CheckSquare, 
  List as ListIcon, Folder, Sigma, Check
} from "lucide-react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";

const NotionHeader = ({ icon: Icon, label, minWidth }: { icon: any, label: string, minWidth?: string }) => (
  <th className="border border-[var(--border)] px-3 py-2 font-normal text-zinc-500 dark:text-zinc-400 text-[13px] bg-zinc-50/50 dark:bg-zinc-900/50 text-left align-middle" style={{ minWidth: minWidth || '140px' }}>
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <Icon className="w-3.5 h-3.5 text-zinc-400" />
      {label}
    </div>
  </th>
);

const NotionCell = ({ children }: { children: React.ReactNode }) => (
  <td className="border border-[var(--border)] px-3 py-1.5 text-[13px] text-[var(--foreground)] truncate align-middle h-[36px]">
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

export function RawDataView() {
  const tasks = useQuery(api.tasks.getTasks);
  const projects = useQuery(api.projects.getProjects);
  const updateTask = useMutation(api.tasks.updateTask);

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

  return (
    <div className="w-full overflow-x-auto pb-12">
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
              <NotionHeader icon={Folder} label="Project" minWidth="160px" />
              <NotionHeader icon={ListIcon} label="List" minWidth="160px" />
              <NotionHeader icon={Sigma} label="Quadrant" minWidth="180px" />
              <NotionHeader icon={CheckSquare} label="For Funsies" minWidth="110px" />
              <NotionHeader icon={CheckSquare} label="Today" minWidth="90px" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const quadrant = calculateQuadrant(task.isForFunsies, task.isUrgent, task.isImportant);
              
              return (
                <tr key={task._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors group">
                  <NotionCell>
                    <input 
                      type="text" 
                      defaultValue={task.title} 
                      onBlur={(e) => { if(e.target.value.trim() !== task.title) handleUpdate(task._id, "title", e.target.value.trim() || "Unknown Task") }}
                      className="bg-transparent w-full outline-none font-medium"
                    />
                  </NotionCell>
                  
                  <NotionCell>
                    <select value={task.status} onChange={(e) => handleUpdate(task._id, "status", e.target.value)} className="bg-transparent outline-none cursor-pointer text-xs font-medium w-full">
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </NotionCell>
                  
                  <NotionCell>
                    <div className="w-[120px]">
                      <CustomDatePicker value={task.doByDate ?? null} onChange={(val) => handleUpdate(task._id, "doByDate", val)} />
                    </div>
                  </NotionCell>
                  
                  <NotionCell>
                    <div className="w-[120px]">
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
                    <select value={task.projectId || ""} onChange={(e) => handleUpdate(task._id, "projectId", e.target.value || null)} className="bg-transparent outline-none cursor-pointer text-xs font-medium w-full">
                      <option value="">None</option>
                      {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </NotionCell>

                  <NotionCell>
                    <select value={task.listCategory || "Current"} onChange={(e) => handleUpdate(task._id, "listCategory", e.target.value)} className="bg-transparent outline-none cursor-pointer text-xs font-medium w-full">
                      <option value="Current">Current</option>
                      <option value="Waiting For">Waiting For</option>
                      <option value="Someday Maybe">Someday Maybe</option>
                    </select>
                  </NotionCell>

                  <NotionCell>
                    <span className="text-zinc-600 dark:text-zinc-300">{quadrant}</span>
                  </NotionCell>

                  <NotionCell>
                    <NotionCheckbox checked={task.isForFunsies} onChange={() => handleUpdate(task._id, "isForFunsies", !task.isForFunsies)} />
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
  );
}