"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { X, Folder, Edit2, Trash2, Check, Archive, AlertTriangle, Plus } from "lucide-react";
import { getProjectColor } from "./NewTaskForm";

export function ProjectManagerModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const projects = useQuery(api.projects.getProjects);
  const createProject = useMutation(api.projects.createProject);
  const updateProject = useMutation(api.projects.updateProject);
  const archiveProject = useMutation(api.projects.archiveProject);
  const deleteProject = useMutation(api.projects.deleteProject);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (id: any) => {
    if (editName.trim()) {
      updateProject({ id, name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (newProjectName.trim()) {
      await createProject({ name: newProjectName.trim() });
      setNewProjectName("");
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteProject({ id: deleteConfirmId as any });
      setDeleteConfirmId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)] flex flex-col max-h-[80vh] overflow-hidden relative" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-zinc-500" />
            <h3 className="font-bold text-lg text-[var(--foreground)]">Project Manager</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--border)] bg-zinc-50/50 dark:bg-[#151515]">
          <div className="flex items-center gap-2">
            <input 
              placeholder="Create new project..." 
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              className="flex-1 bg-white dark:bg-[#202020] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-blue-500 transition-colors"
            />
            <button 
              onClick={handleCreate}
              disabled={!newProjectName.trim()}
              className="flex items-center justify-center p-2 rounded-lg bg-blue-500 text-white disabled:opacity-50 transition-colors hover:bg-blue-600"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {projects?.length === 0 && (
            <p className="text-zinc-500 text-center py-8 text-sm">No active projects.</p>
          )}
          {projects?.map(project => (
            <div key={project._id} className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg group transition-colors">
              
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
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full border ${getProjectColor(project._id).split(' ')[0]}`} />
                  <span className="text-[15px] font-medium text-[var(--foreground)]">{project.name}</span>
                </div>
              )}

              {editingId !== project._id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button title="Edit Name" onClick={() => { setEditingId(project._id); setEditName(project.name); }} className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button title="Archive Project" onClick={() => archiveProject({ id: project._id })} className="p-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded">
                    <Archive className="w-4 h-4" />
                  </button>
                  <button title="Permanently Delete" onClick={() => setDeleteConfirmId(project._id)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {deleteConfirmId && (
          <div className="absolute inset-0 z-50 bg-white/95 dark:bg-[#1c1c1c]/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="text-center w-full max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-lg text-[var(--foreground)] mb-2">Delete Project?</h3>
              <p className="text-zinc-500 text-sm mb-6">
                Are you sure? This will unlink the project from all associated tasks. The tasks themselves will not be deleted.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 shadow-sm rounded-lg transition-colors">
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}