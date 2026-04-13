"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Folder, Check } from "lucide-react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';

export const getProjectColor = (id: string | null | undefined) => {
  if (!id) return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]";
  const colors = [
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/50",
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-900/50",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/50",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50",
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-900/50",
    "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-900/50",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export const getListColor = (list: string) => {
  switch (list) {
    case 'Current': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200 dark:border-pink-900/50';
    case 'Someday Maybe': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
    case 'Waiting For':
    default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]';
  }
};

export function NewTaskForm() {
  const createTask = useMutation(api.tasks.createTask);
  const projects = useQuery(api.projects.getProjects);
  const createProject = useMutation(api.projects.createProject);

  const [title, setTitle] = useState("");
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
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Type notes here... (Use 1. or - or [ ] for lists)" })
    ],
    content: "",
    immediatelyRender: false,
  });

  const stateRef = useRef({ title, isUrgent, isImportant, isForFunsies, isToday, listCategory, doOnDate, doByDate, projectId });
  useEffect(() => {
    stateRef.current = { title, isUrgent, isImportant, isForFunsies, isToday, listCategory, doOnDate, doByDate, projectId };
  }, [title, isUrgent, isImportant, isForFunsies, isToday, listCategory, doOnDate, doByDate, projectId]);

  const resetForm = () => {
    setTitle(""); setIsUrgent(false); setIsImportant(false); setIsForFunsies(false);
    setIsToday(false); setListCategory("Current"); setDoOnDate(null); setDoByDate(null); setProjectId(null);
    editor?.commands.setContent("");
  };

  useEffect(() => {
    function handleClickOutside(event: PointerEvent | MouseEvent) {
      if (isModalOpen) return;
      if (projectDropdownRef.current && projectDropdownRef.current.contains(event.target as Node)) return;
      
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false); 
        
        const descriptionHTML = editor?.getHTML() || "";
        const hasNotes = editor && !editor.isEmpty;
        const hasTags = stateRef.current.isUrgent || stateRef.current.isImportant || stateRef.current.isForFunsies || stateRef.current.isToday || stateRef.current.listCategory !== "Current" || stateRef.current.doOnDate || stateRef.current.doByDate || stateRef.current.projectId;

        if (stateRef.current.title.trim() !== "" || hasNotes || hasTags) {
          createTask({
            title: stateRef.current.title.trim() || "Unknown Task",
            description: hasNotes ? descriptionHTML : undefined,
            isUrgent: stateRef.current.isUrgent,
            isImportant: stateRef.current.isImportant,
            isForFunsies: stateRef.current.isForFunsies,
            isToday: stateRef.current.isToday,
            listCategory: stateRef.current.listCategory,
            doOnDate: stateRef.current.doOnDate,
            doByDate: stateRef.current.doByDate,
            projectId: stateRef.current.projectId as any,
          });
          setIsExpanded(false);
          setTimeout(() => resetForm(), 300);
        } else {
          setIsExpanded(false);
        }
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [createTask, isModalOpen, editor]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() && (!editor || editor.isEmpty)) {
      setIsExpanded(false);
      return;
    }
    await createTask({
      title: title.trim() || "Unknown Task",
      description: (editor && !editor.isEmpty) ? editor.getHTML() : undefined,
      isUrgent, isImportant, isForFunsies, isToday, listCategory, doOnDate, doByDate, projectId: projectId as any,
    });
    setIsExpanded(false);
    setTimeout(() => resetForm(), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleKeyDownCapture = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
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
      <style>{`
        .tiptap { min-height: 50px; outline: none !important; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap; max-width: 100%; cursor: text; }
        .tiptap * { max-width: 100%; }
        .tiptap ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .tiptap p { margin-bottom: 0.5rem; }
        .tiptap ul[data-type="taskList"] { list-style: none; padding: 0; margin: 0; }
        .tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; margin-bottom: 0.25rem; }
        .tiptap ul[data-type="taskList"] li > label { margin-right: 0.5rem; user-select: none; }
        .tiptap ul[data-type="taskList"] li > label input[type="checkbox"] { accent-color: #3b82f6; width: 1rem; height: 1rem; margin-top: 0.25rem; cursor: pointer; }
        .tiptap p.is-editor-empty:first-child::before { color: #a1a1aa; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        
        .tiptap input[type="checkbox"] {
          appearance: none;
          background-color: transparent;
          margin: 0;
          font: inherit;
          color: currentColor;
          width: 1.15em;
          height: 1.15em;
          border: 1px solid #d4d4d8;
          border-radius: 0.25em;
          display: grid;
          place-content: center;
          cursor: pointer;
        }
        .tiptap input[type="checkbox"]::before {
          content: "";
          width: 0.65em;
          height: 0.65em;
          transform: scale(0);
          transition: 120ms transform ease-in-out;
          box-shadow: inset 1em 1em white;
          background-color: white;
          transform-origin: center;
          clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
        }
        .tiptap input[type="checkbox"]:checked {
          background-color: #f472b6;
          border-color: #f472b6;
        }
        .tiptap input[type="checkbox"]:checked::before {
          transform: scale(1);
        }
        @media (prefers-color-scheme: dark) {
          .tiptap input[type="checkbox"] { border-color: #52525b; }
        }
      `}</style>
      <form 
        ref={formRef}
        onSubmit={handleSubmit}
        onKeyDownCapture={handleKeyDownCapture}
        className={`relative flex flex-col transition-all rounded-lg -mx-2 px-2 border ${
          isExpanded ? "bg-white dark:bg-[#1f1f1f] border-[var(--border)] shadow-md py-3 my-2 z-30" : "border-transparent bg-transparent py-1.5 hover:bg-[var(--subtle-bg)]"
        }`}
      >
        <div className="flex items-center gap-2 w-full">
          <Plus className={`w-5 h-5 flex-shrink-0 transition-colors ${isExpanded ? "text-zinc-500" : "text-zinc-300"}`} />
          <div className="flex-1 min-w-0 flex items-center">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              onKeyDown={handleKeyDown}
              placeholder="Type a new task and press Enter..."
              className="w-full bg-transparent outline-none text-[15px] font-medium text-[var(--foreground)] placeholder:text-zinc-400 placeholder:font-normal"
            />
          </div>
        </div>
            
        <div className={`grid transition-all duration-[300ms] ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 mt-0"}`}>
          <div className={isExpanded ? "overflow-visible" : "overflow-hidden"}>
            <div className="space-y-3 w-full sm:ml-7 sm:pr-7 pb-1">
              
              <div className="w-full bg-transparent outline-none text-[15px] text-[var(--foreground)] placeholder:text-zinc-400 pt-1">
                <EditorContent editor={editor} className="outline-none h-full break-words" />
              </div>

              <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-4">
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--foreground)] font-medium">
                    <button 
                      type="button" 
                      onClick={() => setIsToday(!isToday)} 
                      className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${isToday ? 'bg-pink-400 border-pink-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}`}
                    >
                      {isToday && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>
                    Today
                  </label>

                  <div className="relative" ref={projectDropdownRef}>
                    <button 
                      type="button" 
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      className={`flex items-center gap-1.5 font-medium px-3 py-1 rounded-full border transition-colors text-[12px] ${getProjectColor(projectId)}`}
                    >
                      <Folder className="w-3.5 h-3.5" />
                      {selectedProject?.name || "No Project"}
                    </button>
                    {isProjectDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-xl rounded-lg py-1 z-50">
                        <button type="button" onClick={() => { setProjectId(null); setIsProjectDropdownOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--foreground)]">None</button>
                        {projects?.map(p => (
                          <button key={p._id} type="button" onClick={() => { setProjectId(p._id); setIsProjectDropdownOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--foreground)]">{p.name}</button>
                        ))}
                        <div className="border-t border-[var(--border)] my-1"></div>
                        <button type="button" onClick={() => { setIsProjectDropdownOpen(false); setIsModalOpen(true); }} className="w-full text-left px-3 py-1.5 text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">+ Create Project</button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">Matrix Tags</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsUrgent(!isUrgent)} className={`text-xs px-3 py-1 rounded-full transition-colors border ${isUrgent ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/50" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>Urgent</button>
                      <button type="button" onClick={() => setIsImportant(!isImportant)} className={`text-xs px-3 py-1 rounded-full transition-colors border ${isImportant ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>Important</button>
                      <button type="button" onClick={() => setIsForFunsies(!isForFunsies)} className={`text-xs px-3 py-1 rounded-full transition-colors border ${isForFunsies ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-900/50" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>For Funsies</button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">List</span>
                    <div className="flex gap-2">
                      {['Current', 'Waiting For', 'Someday Maybe'].map(listName => (
                        <button key={listName} type="button" onClick={() => setListCategory(listName as any)} className={`text-xs px-3 py-1 rounded-full transition-all border ${listCategory === listName ? getListColor(listName) : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                          {listName}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">Dates</span>
                  <div className="flex flex-wrap items-center gap-6 relative z-10">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <span className="font-medium text-zinc-400">Do On:</span>
                      <CustomDatePicker value={doOnDate} onChange={setDoOnDate} placeholder="Select date..." />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <span className="font-medium text-zinc-400">Due By:</span>
                      <CustomDatePicker value={doByDate} onChange={setDoByDate} placeholder="Select date..." />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </form>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
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