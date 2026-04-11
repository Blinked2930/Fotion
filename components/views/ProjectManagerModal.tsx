"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X, Folder, Edit2, Trash2, Check } from "lucide-react";

export function ProjectManagerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const projects = useQuery(api.projects.getProjects);
  const updateProject = useMutation(api.projects.updateProject);
  const deleteProject = useMutation(api.projects.deleteProject);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (!isOpen) return null;

  const handleSave = (id: any) => {
    if (editName.trim()) {
      updateProject({ id, name: editName.trim() });
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)] flex flex-col max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-lg text-[var(--foreground)]">Project Manager</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {projects?.length === 0 && (
            <p className="text-zinc-500 text-center py-8 text-sm">No projects created yet.</p>
          )}
          {projects?.map(project => (
            <div key={project._id} className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg group">
              {editingId === project._id ? (
                <div className="flex-1 flex items-center gap-2 mr-4">
                  <input 
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave(project._id)}
                    className="flex-1 bg-transparent border border-blue-500 rounded px-2 py-1 outline-none text-[14px]"
                  />
                  <button onClick={() => handleSave(project._id)} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"><Check className="w-4 h-4" /></button>
                </div>
              ) : (
                <span className="text-[15px] font-medium text-[var(--foreground)]">{project.name}</span>
              )}

              {editingId !== project._id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(project._id); setEditName(project.name); }} className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => { if(window.confirm("Delete this project? This won't delete the tasks, just the project link.")) deleteProject({ id: project._id }); }} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}