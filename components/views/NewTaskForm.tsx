"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Folder, Bold, Italic, List, ListOrdered, CheckSquare } from "lucide-react";
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';

const EditorToolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-1 mb-2">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><Bold className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><Italic className="w-3.5 h-3.5" /></button>
      <div className="w-px h-3 bg-[var(--border)] mx-1" />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><List className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><ListOrdered className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded transition-colors ${editor.isActive('taskList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><CheckSquare className="w-3.5 h-3.5" /></button>
    </div>
  );
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
      Placeholder.configure({ placeholder: "Add notes..." })
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
    function handleClickOutside(event: MouseEvent) {
      if (isModalOpen) return;
      if (projectDropdownRef.current && projectDropdownRef.current.contains(event.target as Node)) return;
      
      // If clicking outside entirely
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false); 
        
        const descriptionHTML = editor?.getHTML() || "";
        const hasNotes = editor && !editor.isEmpty;
        const hasTags = stateRef.current.isUrgent || stateRef.current.isImportant || stateRef.current.isForFunsies || stateRef.current.isToday || stateRef.current.listCategory !== "Current" || stateRef.current.doOnDate || stateRef.current.doByDate || stateRef.current.projectId;

        // Auto-save logic with "Unknown Task" fallback
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
          resetForm();
        }
        setIsExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    resetForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
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
        .tiptap ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .tiptap p { margin-bottom: 0.5rem; }
        .tiptap ul[data-type="taskList"] { list-style: none; padding: 0; margin: 0; }
        .tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; margin-bottom: 0.25rem; }
        .tiptap ul[data-type="taskList"] li > label { margin-right: 0.5rem; user-select: none; }
        .tiptap ul[data-type="taskList"] li > label input[type="checkbox"] { accent-color: #3b82f6; width: 1rem; height: 1rem; margin-top: 0.25rem; cursor: pointer; }
        .tiptap p.is-editor-empty:first-child::before { color: #a1a1aa; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        .ProseMirror:focus { outline: none !important; box-shadow: none !important; }
      `}</style>
      <form 
        ref={formRef}
        onSubmit={handleSubmit}
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
            
        {isExpanded && (
          <div className="mt-4 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200 w-full ml-7 pr-7">
            
            <div>
              <EditorToolbar editor={editor} />
              <div className="w-full bg-transparent outline-none text-sm text-[var(--foreground)] placeholder:text-zinc-400">
                <EditorContent editor={editor} className="tiptap outline-none max-h-[200px] overflow-y-auto" />
              </div>
            </div>

            <div className="flex flex-col gap-5 border-t border-[var(--border)] pt-4">
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--foreground)] font-medium">
                  <input type="checkbox" checked={isToday} onChange={(e) => setIsToday(e.target.checked)} className="rounded border-[var(--border)]" />
                  Today
                </label>

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

              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">Matrix Tags</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsUrgent(!isUrgent)} className={`text-xs px-3 py-1 rounded-full transition-colors border ${isUrgent ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-transparent" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>Urgent</button>
                    <button type="button" onClick={() => setIsImportant(!isImportant)} className={`text-xs px-3 py-1 rounded-full transition-colors border ${isImportant ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-transparent" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>Important</button>
                    <button type="button" onClick={() => setIsForFunsies(!isForFunsies)} className={`text-xs px-3 py-1 rounded-full transition-colors border ${isForFunsies ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-transparent" : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>For Funsies</button>
                  </div>
                </div>

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

              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">Dates</span>
                <div className="flex flex-wrap items-center gap-6">
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
        )}
      </form>

      {/* CREATE PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
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