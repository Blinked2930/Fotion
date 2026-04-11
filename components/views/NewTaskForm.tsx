"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Calendar, Folder } from "lucide-react";
import { CleanDatePicker } from "./TaskDetailsPane";

export function NewTaskForm() {
  const createTask = useMutation(api.tasks.createTask);
  const projects = useQuery(api.projects.getProjects);
  const createProject = useMutation(api.projects.createProject);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [isForFunsies, setIsForFunsies] = useState(false);
  const [isToday, setIsToday] = useState(false);
  const [listCategory, setListCategory] = useState<"Current" | "Waiting For" | "Someday Maybe">("Current");
  const [doOnDate, setDoOnDate] = useState<number | null>(null);
  const [doByDate, setDoByDate] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-Save State Refs (so the click-outside event has the latest data)
  const stateRef = useRef({ title, description, isUrgent, isImportant, isForFunsies, isToday, listCategory, doOnDate, doByDate, projectId });
  useEffect(() => {
    stateRef.current = { title, description, isUrgent, isImportant, isForFunsies, isToday, listCategory, doOnDate, doByDate, projectId };
  }, [title, description, isUrgent, isImportant, isForFunsies, isToday, listCategory, doOnDate, doByDate, projectId]);

  // Click Outside Logic (With Auto-Save!)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // 1. If clicking inside the project dropdown, do nothing.
      if (projectDropdownRef.current && projectDropdownRef.current.contains(event.target as Node)) return;
      
      // 2. If clicking inside a native calendar picker, do nothing.
      if (document.activeElement?.getAttribute('type') === 'date') return;

      // 3. If clicking completely outside the form
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false); // Always close dropdown
        
        // AUTO SAVE LOGIC
        if (stateRef.current.title.trim() !== "") {
          createTask({
            title: stateRef.current.title.trim(),
            description: stateRef.current.description.trim() || undefined,
            isUrgent: stateRef.current.isUrgent,
            isImportant: stateRef.current.isImportant,
            isForFunsies: stateRef.current.isForFunsies,
            isToday: stateRef.current.isToday,
            listCategory: stateRef.current.listCategory,
            doOnDate: stateRef.current.doOnDate,
            doByDate: stateRef.current.doByDate,
            projectId: stateRef.current.projectId as any,
          });
          
          // Reset after save
          setTitle(""); setDescription(""); setIsUrgent(false); setIsImportant(false); setIsForFunsies(false);
          setIsToday(false); setListCategory("Current"); setDoOnDate(null); setDoByDate(null); setProjectId(null);
        }
        setIsExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [createTask]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setIsExpanded(false);
      return;
    }

    await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      isUrgent, isImportant, isForFunsies, isToday, listCategory, doOnDate, doByDate, projectId: projectId as any,
    });

    // Reset and KEEP focus for rapid-fire adding
    setTitle(""); setDescription(""); setIsUrgent(false); setIsImportant(false); setIsForFunsies(false);
    setIsToday(false); setListCategory("Current"); setDoOnDate(null); setDoByDate(null); setProjectId(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      const newId = await createProject({ name: newProjectName.trim() });
      setProjectId(newId);
      setIsModalOpen(false);
      setNewProjectName("");
    }
  };

  const selectedProject = projects?.find(p => p._id === projectId);

  return (
    <>
      <form 
        ref={formRef}
        onSubmit={handleSubmit}
        className={`relative transition-all rounded-lg -mx-2 px-2 border ${
          isExpanded ? "bg-white dark:bg-[#1f1f1f] border-[var(--border)] shadow-md py-3 my-2 z-30" : "border-transparent bg-transparent py-1.5 hover:bg-[var(--subtle-bg)]"
        }`}
      >
        <div className="flex items-start gap-2">
          <Plus className={`w-5 h-5 mt-0.5 transition-colors ${isExpanded ? "text-zinc-500" : "text-zinc-300"}`} />
          <div className="flex-1 min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              onKeyDown={handleKeyDown}
              placeholder="Type a new task and press Enter..."
              className="w-full bg-transparent outline-none text-[15px] font-medium text-[var(--foreground)] placeholder:text-zinc-400 placeholder:font-normal"
            />
            
            {isExpanded && (
              <div className="mt-4 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setIsExpanded(false)}
                  placeholder="Add notes... (optional)"
                  rows={1}
                  className="w-full bg-transparent outline-none text-sm text-[var(--foreground)] placeholder:text-zinc-400 resize-none"
                />

                <div className="flex flex-col gap-5 border-t border-[var(--border)] pt-4">
                  
                  {/* Top Row: Checkboxes & Project */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--foreground)] font-medium">
                      <input type="checkbox" checked={isToday} onChange={(e) => setIsToday(e.target.checked)} className="rounded border-[var(--border)]" />
                      Today
                    </label>

                    {/* Project Dropdown */}
                    <div className="relative" ref={projectDropdownRef}>
                      <button 
                        type="button" 
                        onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                        className="flex items-center gap-1.5 hover:text-[var(--foreground)] font-medium bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded border border-[var(--border)]"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        {selectedProject?.name || "No Project"}
                      </button>
                      {isProjectDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-xl rounded-lg py-1 z-50">
                          <button type="button" onClick={() => { setProjectId(null); setIsProjectDropdownOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">None</button>
                          {projects?.map(p => (
                            <button key={p._id} type="button" onClick={() => { setProjectId(p._id); setIsProjectDropdownOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">{p.name}</button>
                          ))}
                          <div className="border-t border-[var(--border)] my-1"></div>
                          <button type="button" onClick={() => { setIsProjectDropdownOpen(false); setIsModalOpen(true); }} className="w-full text-left px-3 py-1.5 text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">+ Create Project</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PILLS ROW (Delineated!) */}
                  <div className="flex flex-wrap gap-x-8 gap-y-4">
                    
                    {/* Matrix Tags */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">Matrix Tags</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setIsUrgent(!isUrgent)} className={`text-xs px-3 py-1 rounded-full transition-colors border ${isUrgent ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-transparent" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>Urgent</button>
                        <button type="button" onClick={() => setIsImportant(!isImportant)} className={`text-xs px-3 py-1 rounded-full transition-colors border ${isImportant ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-transparent" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>Important</button>
                        <button type="button" onClick={() => setIsForFunsies(!isForFunsies)} className={`text-xs px-3 py-1 rounded-full transition-colors border ${isForFunsies ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-transparent" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>For Funsies</button>
                      </div>
                    </div>

                    {/* List Group */}
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">List</span>
                      <div className="flex gap-2">
                        {['Current', 'Waiting For', 'Someday Maybe'].map(listName => (
                          <button key={listName} type="button" onClick={() => setListCategory(listName as any)} className={`text-xs px-3 py-1 rounded-full transition-all border ${listCategory === listName ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-transparent' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                            {listName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dates Row */}
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">Dates</span>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium text-zinc-400">Do On:</span>
                        <CleanDatePicker value={doOnDate} onChange={setDoOnDate} placeholder="Select date..." />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Calendar className="w-4 h-4 text-red-400" />
                        <span className="font-medium text-zinc-400">Due By:</span>
                        <CleanDatePicker value={doByDate} onChange={setDoByDate} placeholder="Select date..." />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* CREATE PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200 p-4">
          <div className="bg-white dark:bg-[#1c1c1c] p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-[var(--border)]">
            <h3 className="font-bold text-lg text-[var(--foreground)] mb-4">New Project</h3>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g., Q3 Finances"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              className="w-full bg-transparent border border-[var(--border)] rounded-lg p-2 text-[var(--foreground)] mb-6 outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">Cancel</button>
              <button onClick={handleCreateProject} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}