"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { calculateQuadrant } from "@/lib/eisenhower";
import { 
  Loader2, 
  Type, 
  PlayCircle, 
  Calendar, 
  CheckSquare, 
  List as ListIcon, 
  Folder, 
  Sigma,
  Check
} from "lucide-react";

// --- HELPERS FOR NOTION-STYLE UI ---

const NotionHeader = ({ icon: Icon, label, minWidth }: { icon: any, label: string, minWidth?: string }) => (
  <th 
    className="border border-[var(--border)] px-3 py-2 font-normal text-zinc-500 dark:text-zinc-400 text-[13px] bg-zinc-50/50 dark:bg-zinc-900/50 text-left align-middle"
    style={{ minWidth: minWidth || '140px' }}
  >
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

const NotionCheckbox = ({ checked }: { checked: boolean }) => (
  <div className="flex items-center">
    {checked ? (
      <div className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center shadow-sm">
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </div>
    ) : (
      <div className="w-4 h-4 rounded border border-zinc-300 dark:border-zinc-600 bg-transparent"></div>
    )}
  </div>
);

const StatusPill = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'todo': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'in-progress': 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'done': 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  const labels: Record<string, string> = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'done': 'Done',
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-[12px] font-medium whitespace-nowrap ${styles[status] || styles['todo']}`}>
      {labels[status] || status}
    </span>
  );
};

const ListPill = ({ list }: { list?: string }) => {
  if (!list) return null;
  const styles: Record<string, string> = {
    'Current': 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    'Waiting For': 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    'Someday Maybe': 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-[12px] font-medium whitespace-nowrap ${styles[list] || styles['Waiting For']}`}>
      {list}
    </span>
  );
};

const ProjectPill = ({ name }: { name?: string }) => {
  if (!name) return <span className="text-zinc-400">Empty</span>;
  return (
    <span className="px-2 py-0.5 rounded text-[12px] font-medium whitespace-nowrap bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      {name}
    </span>
  );
};

export function RawDataView() {
  const tasks = useQuery(api.tasks.getTasks);
  const projects = useQuery(api.projects.getProjects);

  // Wait until both tasks and projects are fully loaded from Convex
  if (tasks === undefined || projects === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-12">
      <div className="inline-block min-w-full align-middle">
        <table className="w-full text-left border-collapse border border-[var(--border)]">
          <thead>
            <tr>
              <NotionHeader icon={Type} label="Task Name" minWidth="280px" />
              <NotionHeader icon={PlayCircle} label="Status" minWidth="120px" />
              <NotionHeader icon={Calendar} label="Due By Date" minWidth="140px" />
              <NotionHeader icon={Calendar} label="Do On Date" minWidth="140px" />
              <NotionHeader icon={CheckSquare} label="Important?" minWidth="110px" />
              <NotionHeader icon={CheckSquare} label="Urgent?" minWidth="100px" />
              <NotionHeader icon={Folder} label="Project" minWidth="140px" />
              <NotionHeader icon={ListIcon} label="List" minWidth="140px" />
              <NotionHeader icon={Sigma} label="Quadrant" minWidth="180px" />
              <NotionHeader icon={CheckSquare} label="For Funsies" minWidth="110px" />
              <NotionHeader icon={CheckSquare} label="Today" minWidth="90px" />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const quadrant = calculateQuadrant(task.isForFunsies, task.isUrgent, task.isImportant);
              const project = projects.find(p => p._id === task.projectId);
              
              return (
                <tr key={task._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors group">
                  <NotionCell>
                    <span className="font-medium text-[14px]">{task.title}</span>
                  </NotionCell>
                  
                  <NotionCell>
                    <StatusPill status={task.status} />
                  </NotionCell>
                  
                  <NotionCell>
                    {task.doByDate ? (
                      <span className="text-[var(--foreground)]">{new Date(task.doByDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    ) : (
                      <span className="text-zinc-400">Empty</span>
                    )}
                  </NotionCell>
                  
                  <NotionCell>
                    {task.doOnDate ? (
                      <span className="text-[var(--foreground)]">{new Date(task.doOnDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    ) : (
                      <span className="text-zinc-400">Empty</span>
                    )}
                  </NotionCell>

                  <NotionCell>
                    <NotionCheckbox checked={task.isImportant} />
                  </NotionCell>

                  <NotionCell>
                    <NotionCheckbox checked={task.isUrgent} />
                  </NotionCell>

                  <NotionCell>
                    <ProjectPill name={project?.name} />
                  </NotionCell>

                  <NotionCell>
                    <ListPill list={task.listCategory} />
                  </NotionCell>

                  <NotionCell>
                    <span className="text-zinc-600 dark:text-zinc-300">{quadrant}</span>
                  </NotionCell>

                  <NotionCell>
                    <NotionCheckbox checked={task.isForFunsies} />
                  </NotionCell>

                  <NotionCell>
                    <NotionCheckbox checked={!!task.isToday} />
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