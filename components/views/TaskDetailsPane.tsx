"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  X, Calendar, List, AlignLeft, Trash2, 
  ChevronLeft, Folder, PlayCircle, Sigma, AlertTriangle, CheckSquare, Check, Loader2, Bold, Italic, ListOrdered
} from "lucide-react";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";

import { getProjectColor, getListColor } from "./NewTaskForm";

const PropertyRow = ({ icon: Icon, label, children }: { icon: any, label: string, children: React.ReactNode }) => (
  <div className="flex items-start sm:items-center min-h-[40px] group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 -mx-2 px-2 py-0.5 sm:py-0 rounded transition-colors">
    <div className="w-[140px] flex items-center gap-2 text-zinc-500 text-[14px] shrink-0 pt-1 sm:pt-0">
      <Icon className="w-4 h-4 text-zinc-400" />
      <span>{label}</span>
    </div>
    <div className="flex-1 flex items-center text-[14px] min-w-0 max-w-full overflow-hidden">
      {children}
    </div>
  </div>
);

function ProjectSelect({ value, onChange }: { value?: string | null, onChange: (val: string | null) => void }) {
  const projects = useQuery(api.projects.getProjects);
  const createProject = useMutation(api.projects.createProject);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent | MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const handleCreate = async () => {
    if (newProjectName.trim()) {
      const newId = await createProject({ name: newProjectName.trim() });
      onChange(newId);
      setIsModalOpen(false);
      setNewProjectName("");
    }
  };

  const selectedProject = projects?.find(p => p._id === value);

  return (
    <>
      <div className="relative w-fit max-w-full" ref={ref}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`outline-none px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 font-medium text-[12px] border max-w-full truncate ${getProjectColor(value)}`}
        >
          <Folder className="w-3.5 h-3.5 shrink-0" />
          <span className={`truncate ${!value ? "opacity-60" : ""}`}>{selectedProject?.name || "Empty"}</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-xl rounded-lg py-1 z-50 max-h-[300px] overflow-y-auto">
            <button onClick={() => { onChange(null); setIsOpen(false); }} className="w-full text-left px-3 py-1.5 text-[14px] text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800">None</button>
            {projects?.map((p) => (
              <button key={p._id} onClick={() => { onChange(p._id); setIsOpen(false); }} className="w-full text-left px-3 py-1.5 text-[14px] text-[var(--foreground)] hover:bg-zinc-100 dark:hover:bg-zinc-800 truncate">
                {p.name}
              </button>
            ))}
            <div className="border-t border-[var(--border)] my-1"></div>
            <button onClick={() => { setIsOpen(false); setIsModalOpen(true); }} className="w-full text-left px-3 py-1.5 text-[14px] text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium">
              + Create New Project
            </button>
          </div>
        )}
      </div>

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
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full bg-transparent border border-[var(--border)] rounded-lg p-2 text-[var(--foreground)] mb-6 outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const EditorToolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-1 mb-2 overflow-x-auto hide-scrollbar pb-1">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><Bold className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><Italic className="w-4 h-4" /></button>
      <div className="w-px h-4 bg-[var(--border)] mx-1 shrink-0" />
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('bulletList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><List className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('orderedList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><ListOrdered className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('taskList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><CheckSquare className="w-4 h-4" /></button>
    </div>
  );
};

function PaneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId") as Id<"tasks"> | null;

  const [displayTaskId, setDisplayTaskId] = useState<Id<"tasks"> | null>(taskId);
  const [isOpen, setIsOpen] = useState(false);
  const paneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (taskId) {
      setDisplayTaskId(taskId);
      const timer = setTimeout(() => setIsOpen(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsOpen(false);
    }
  }, [taskId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Type your notes here..." })
    ],
    content: task?.description || "",
    immediatelyRender: false, 
    onBlur: ({ editor }) => {
      handleUpdate("description", editor.getHTML());
    },
  });

  const task = useQuery(api.tasks.getTask, displayTaskId ? { id: displayTaskId } : "skip");
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const [title, setTitle] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (task) setTitle(task.title);
  }, [task]);

  useEffect(() => {
    if (task && editor && task.description !== editor.getHTML()) {
      editor.commands.setContent(task.description || "");
    }
  }, [task?.description, editor]);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent | MouseEvent) => {
      if (showDeleteModal || !isOpen) return;
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input')) return;

      if (paneRef.current && !paneRef.current.contains(target)) {
        router.replace(window.location.pathname, { scroll: false });
      }
    };
    
    document.addEventListener("pointerdown", handleClickOutside, true);
    return () => document.removeEventListener("pointerdown", handleClickOutside, true);
  }, [showDeleteModal, router, isOpen]);

  const closePane = () => router.replace(window.location.pathname, { scroll: false });

  const handleUpdate = (field: string, value: any) => {
    if (displayTaskId) updateTask({ id: displayTaskId, [field]: value });
  };

  return (
    <>
      <style>{`
        .tiptap { outline: none !important; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap; max-width: 100%; min-height: 100px; cursor: text; }
        .tiptap * { max-width: 100%; }
        .tiptap ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .tiptap p { margin-bottom: 0.5rem; }
        .tiptap ul[data-type="taskList"] { list-style: none; padding: 0; margin: 0; }
        .tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; margin-bottom: 0.25rem; }
        .tiptap ul[data-type="taskList"] li > label { margin-right: 0.5rem; user-select: none; }
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

        /* KEYBOARD HIDE LOGIC: If screen height drops below 500px (meaning keyboard is open), hide the pills */
        @media (max-height: 500px) {
          .floating-action-pills { display: none !important; }
        }
      `}</style>

      {/* Pane Layout */}
      <div 
        ref={paneRef} 
        className={`fixed top-0 right-0 h-[100dvh] w-full sm:w-[540px] bg-[var(--background)] sm:border-l border-[var(--border)] z-40 flex flex-col transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)] max-w-full ${
          isOpen ? "translate-x-0 sm:shadow-2xl" : "translate-x-full shadow-none pointer-events-none"
        }`}
      >

        {(!displayTaskId || task === undefined) ? (
          <div className="flex-1 flex items-center justify-center">
            {displayTaskId && <Loader2 className="w-6 h-6 animate-spin text-zinc-300" />}
          </div>
        ) : task === null ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500">Task not found.</div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 sm:px-10 py-10 space-y-6 sm:space-y-8 pb-64 max-w-full">
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleUpdate("title", title)}
              className="w-full text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none text-[var(--foreground)] placeholder-zinc-300"
              placeholder="Task title"
            />

            <div className="flex flex-col gap-1 sm:gap-2 text-[15px] max-w-full">

              <PropertyRow icon={CheckSquare} label="Today">
                <button 
                  type="button" 
                  onClick={() => handleUpdate("isToday", !task.isToday)} 
                  className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${task.isToday ? 'bg-pink-400 border-pink-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}`}
                >
                  {task.isToday && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </button>
              </PropertyRow>
              
              <PropertyRow icon={PlayCircle} label="Status">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'todo', label: 'To Do', activeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50' },
                    { id: 'in-progress', label: 'In Progress', activeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-900/50' },
                    { id: 'done', label: 'Done', activeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900/50' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleUpdate('status', s.id)}
                      className={`px-3 py-1 text-[12px] font-medium rounded-full transition-all border ${
                        task.status === s.id 
                          ? s.activeClass 
                          : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </PropertyRow>

              <PropertyRow icon={Calendar} label="Due By Date">
                <CustomDatePicker value={task.doByDate ?? null} onChange={(val) => handleUpdate("doByDate", val)} />
              </PropertyRow>

              <PropertyRow icon={Calendar} label="Do On Date">
                <CustomDatePicker value={task.doOnDate ?? null} onChange={(val) => handleUpdate("doOnDate", val)} />
              </PropertyRow>

              <PropertyRow icon={Sigma} label="Matrix Tags">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUpdate("isUrgent", !task.isUrgent)}
                    className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors border ${task.isUrgent ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/50' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                  >Urgent</button>
                  <button
                    onClick={() => handleUpdate("isImportant", !task.isImportant)}
                    className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors border ${task.isImportant ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                  >Important</button>
                  <button
                    onClick={() => handleUpdate("isForFunsies", !task.isForFunsies)}
                    className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors border ${task.isForFunsies ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-900/50' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                  >For Funsies</button>
                </div>
              </PropertyRow>

              <PropertyRow icon={List} label="Pipelines">
                <div className="flex flex-wrap gap-2">
                  {['Current', 'Waiting For', 'Someday Maybe'].map(listName => (
                     <button
                     key={listName}
                     onClick={() => handleUpdate("listCategory", listName)}
                     className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all border ${task.listCategory === listName ? getListColor(listName) : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                   >
                     {listName}
                   </button>
                  ))}
                </div>
              </PropertyRow>

              <PropertyRow icon={Folder} label="Project">
                <ProjectSelect value={task.projectId} onChange={(val) => handleUpdate("projectId", val)} />
              </PropertyRow>

            </div>

            <hr className="border-[var(--border)] my-6" />

            <div className="space-y-3 pb-4 max-w-full">
              {/* BREATHABLE CANVAS: The notes section is isolated and comfortable */}
              <div className="w-full bg-zinc-50 dark:bg-[#1a1a1a] rounded-xl p-3 border border-[var(--border)] mt-2">
                <EditorToolbar editor={editor} />
                {/* SCROLL FIX: Removed the wrapper div onClick. TipTap completely owns the focus now. */}
                <EditorContent editor={editor} className="tiptap outline-none w-full break-words text-[15px] text-[var(--foreground)] leading-relaxed mt-2" />
              </div>
            </div>
          </div>
        )}

        {/* Action Pills: These perfectly vanish if the CSS media query detects a mobile keyboard! */}
        <div className="floating-action-pills absolute bottom-6 left-0 w-full px-6 sm:px-10 flex justify-between items-center z-50 pointer-events-none transition-all duration-300 ease-out sm:opacity-100 sm:translate-y-0 opacity-100 translate-y-0">
          <button 
            type="button" 
            onClick={closePane} 
            className="pointer-events-auto flex items-center gap-1.5 bg-white dark:bg-[#252525] text-[var(--foreground)] shadow-xl shadow-black/10 border border-[var(--border)] rounded-full px-5 py-3 font-medium text-[13px] sm:text-sm transition-transform active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 -ml-1 sm:hidden" />
            <X className="w-4 h-4 -ml-1 hidden sm:block" />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:block">Close</span>
          </button>

          {task !== undefined && task !== null && (
            <button 
              type="button" 
              onClick={() => setShowDeleteModal(true)} 
              className="pointer-events-auto flex items-center gap-1.5 bg-white dark:bg-[#252525] text-zinc-500 shadow-xl shadow-black/10 border border-[var(--border)] rounded-full px-5 py-3 font-medium text-[13px] sm:text-sm transition-all active:scale-95 active:border-red-500 active:text-red-500 hover:border-red-500 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>

      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200 p-4">
          <div className="bg-white dark:bg-[#1c1c1c] p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-lg text-[var(--foreground)] mb-4">Delete Task?</h3>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowDeleteModal(false)} 
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                autoFocus
                onClick={() => { deleteTask({ id: displayTaskId as any }); closePane(); setShowDeleteModal(false); }} 
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 shadow-sm rounded-lg transition-colors outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-[#1c1c1c]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TaskDetailsPane() {
  return (
    <Suspense fallback={null}>
      <PaneContent />
    </Suspense>
  );
}