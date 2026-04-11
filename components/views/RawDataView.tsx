"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { calculateQuadrant } from "@/lib/eisenhower";
import { Loader2 } from "lucide-react";

export function RawDataView() {
  const tasks = useQuery(api.tasks.getTasks);

  if (tasks === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-8">
      <table className="w-full text-left text-[14px] whitespace-nowrap border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] text-zinc-500 font-medium">
            <th className="py-2 pr-4 font-medium">Title</th>
            <th className="py-2 px-4 font-medium">Status</th>
            <th className="py-2 px-4 font-medium">List Category</th>
            <th className="py-2 px-4 font-medium">Quadrant</th>
            <th className="py-2 px-4 font-medium">Today</th>
            <th className="py-2 px-4 font-medium">Do On</th>
            <th className="py-2 pl-4 font-medium">Do By</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const quadrant = calculateQuadrant(task.isForFunsies, task.isUrgent, task.isImportant);
            
            return (
              <tr key={task._id} className="border-b border-[var(--border)] hover:bg-[var(--subtle-bg)] transition-colors group">
                <td className="py-2 pr-4 text-[var(--foreground)] truncate max-w-[200px]">{task.title}</td>
                <td className="py-2 px-4 text-zinc-600">{task.status}</td>
                <td className="py-2 px-4 text-zinc-600">{task.listCategory}</td>
                <td className="py-2 px-4 text-zinc-600 truncate max-w-[150px]">{quadrant}</td>
                <td className="py-2 px-4 text-zinc-600">{task.isToday ? "Yes" : "-"}</td>
                <td className="py-2 px-4 text-zinc-600">
                  {task.doOnDate ? new Date(task.doOnDate).toLocaleDateString() : "-"}
                </td>
                <td className="py-2 pl-4 text-zinc-600">
                  {task.doByDate ? new Date(task.doByDate).toLocaleDateString() : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}