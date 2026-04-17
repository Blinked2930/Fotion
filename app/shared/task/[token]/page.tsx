"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Loader2, Lock, CheckCircle2, Circle, Bold, Italic, List, ListOrdered, CheckSquare, Globe, 
  Calendar, AlignLeft, Folder, PlayCircle, Sigma, Check, BookmarkPlus, LayoutGrid, ListFilter 
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link"; 

import { useEditor, EditorContent } from '@tiptap/react';
import { Extension, InputRule } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { CustomDatePicker } from "@/components/ui/CustomDatePicker";
import { getProjectColor, getListColor } from "@/components/views/NewTaskForm";
import { useGuestSession } from "@/hooks/useGuestSession"; 

const DoubleSpaceFix = Extension.create({
  name: 'doubleSpaceFix',
  addInputRules() {
    return [
      new InputRule({
        find: /([^\s])  $/,
        handler: ({ state, range, match }) => { state.tr.insertText(`${match[1]}. `, range.from, range.to); },
      }),
    ];
  },
});

const EditorToolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  // NEW: Sorts checklist items natively inside the AST
  const handleSortChecklists = () => {
    const sortListNodes = (nodes: any[]) => {
      if (!Array.isArray(nodes)) return nodes;
      return nodes.map(node => {
        const newNode = { ...node };

        if (newNode.content) {
          newNode.content = sortListNodes(newNode.content);
        }

        if (newNode.type === 'taskList' && newNode.content) {
          const unchecked: any[] = [];
          const checked: any[] = [];

          newNode.content.forEach((child: any) => {
            if (child.type === 'taskItem') {
              if (child.attrs?.checked) checked.push(child);
              else unchecked.push(child);
            } else {
              unchecked.push(child); 
            }
          });

          // Re-combine: Unchecked first, Checked last
          newNode.content = [...unchecked, ...checked];
        }
        return newNode;
      });
    };

    const json = editor.getJSON();
    if (json.content) {
      json.content = sortListNodes(json.content);
      const { from, to } = editor.state.selection;
      editor.commands.setContent(json);
      try { editor.commands.setTextSelection({ from, to }); } catch(e) {}
    }
  };

  return (
    <div className="flex items-center gap-1 mb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><Bold className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><Italic className="w-4 h-4" /></button>
      <div className="w-px h-4 bg-[var(--border)] mx-1 shrink-0" />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('bulletList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><List className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('orderedList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><ListOrdered className="w-4 h-4" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('taskList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><CheckSquare className="w-4 h-4" /></button>
      <div className="w-px h-4 bg-[var(--border)] mx-1 shrink-0" />
      <button type="button" onClick={handleSortChecklists} title="Sort Checkboxes (Unchecked first)" className="p-1.5 rounded shrink-0 transition-colors text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]"><ListFilter className="w-4 h-4" /></button>
    </div>
  );
};

const PropertyRow = ({ icon: Icon, label, children }: { icon: any, label: string, children: React.ReactNode }) => (
  <div className="flex items-start sm:items-center min-h-[40px] group hover:bg-zinc-50 dark:hover:bg-zinc-900/30 -mx-2 px-2 py-0.5 sm:py-0 rounded transition-colors">
    <div className="w-[140px] flex items-center gap-2 text-zinc-500 text-[14px] shrink-0 pt-1 sm:pt-0">
      <Icon className="w-4 h-4 text-zinc-400" />
      <span>{label}</span>
    </div>
    <div className="flex-1 flex flex-wrap items-center text-[14px] min-w-0 max-w-full">
      {children}
    </div>
  </div>
);

function GuestProjectSelect({ value, onChange }: { value?: string | null, onChange: (val: string | null) => void }) {
  const projects = useQuery(api.shared.getPublicProjects);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent | MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  const selectedProject = projects?.find(p => p._id === value);

  return (
    <div className="relative w-fit max-w-full" ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)} className={`outline-none px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 font-medium text-[12px] border max-w-full truncate ${getProjectColor(value)}`}>
        <Folder className="w-3.5 h-3.5 shrink-0" />
        <span className={`truncate ${!value ? "opacity-60" : ""}`}>{selectedProject?.name || "Empty"}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-[#252525] border border-[var(--border)] shadow-xl rounded-lg py-1 z-50 max-h-[250px] overflow-y-auto">
          <button onClick={() => { onChange(null); setIsOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-[var(--border)]">None</span>
          </button>
          {projects?.map((p) => (
            <button key={p._id} onClick={() => { onChange(p._id); setIsOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border truncate max-w-full ${getProjectColor(p._id)}`}>{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SharedTaskPage() {
  const params = useParams();
  const token = params.token as string;
  
  const sessionId = useGuestSession(); 
  
  const task = useQuery(api.shared.getPublicTask, { token });
  const updateTask = useMutation(api.shared.updatePublicTask);
  const saveToSession = useMutation(api.shared.saveTaskToSession);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedToMatrix, setIsSavedToMatrix] = useState(false);
  const [title, setTitle] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (task && sessionId && task.sharedWithSessions?.includes(sessionId)) {
      setIsSavedToMatrix(true);
    }
  }, [task, sessionId]);

  const editor = useEditor({
    extensions: [
      StarterKit, TaskList, TaskItem.configure({ nested: true }), DoubleSpaceFix,
      Placeholder.configure({ placeholder: "Add notes, updates, or context here... (Use 1. or - or [ ] for lists)" })
    ],
    content: task?.description || "",
    immediatelyRender: false, 
    onBlur: async ({ editor }) => {
      const html = editor.getHTML();
      if (task && html !== task.description) {
        handleUpdate("description", html);
      }
    },
  });

  useEffect(() => {
    if (task) setTitle(task.title);
  }, [task]);

  useEffect(() => {
    if (task && editor && task.description !== editor.getHTML()) {
      editor.commands.setContent(task.description || "");
    }
  }, [task?.description, editor]);

  const handleUpdate = async (field: string, value: any) => {
    setIsSaving(true);
    await updateTask({ token, [field]: value });
    setTimeout(() => setIsSaving(false), 500); 
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleSaveToMatrix = async () => {
    if (!sessionId || !task) return;
    await saveToSession({ token, sessionId });
    setIsSavedToMatrix(true);
  };

  if (task === undefined) {
    return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-300 dark:text-zinc-700" /></div>;
  }

  if (task === null) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center text-center px-4">
        <Lock className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
        <h1 className="text-xl font-bold text-[var(--foreground)]">Private or Not Found</h1>
        <p className="text-zinc-500 mt-2 max-w-sm">This task may have been deleted, or the owner has revoked public access.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .tiptap { min-height: 200px; outline: none !important; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap; max-width: 100%; cursor: text; }
        .tiptap * { max-width: 100%; }
        .tiptap ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .tiptap p { margin-bottom: 0.5rem; }
        .tiptap ul[data-type="taskList"] { list-style: none; padding: 0; margin: 0; }
        .tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; margin-bottom: 0.25rem; }
        .tiptap ul[data-type="taskList"] li > label { margin-right: 0.5rem; user-select: none; }
        .tiptap p.is-editor-empty:first-child::before { color: #a1a1aa; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        .tiptap input[type="checkbox"] { appearance: none; background-color: transparent; margin: 0; font: inherit; color: currentColor; width: 1.15em; height: 1.15em; border: 1px solid #d4d4d8; border-radius: 0.25em; display: grid; place-content: center; cursor: pointer; }
        .tiptap input[type="checkbox"]::before { content: ""; width: 0.65em; height: 0.65em; transform: scale(0); transition: 120ms transform ease-in-out; box-shadow: inset 1em 1em white; background-color: white; transform-origin: center; clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%); }
        .tiptap input[type="checkbox"]:checked { background-color: #f472b6; border-color: #f472b6; }
        .tiptap input[type="checkbox"]:checked::before { transform: scale(1); }
        @media (prefers-color-scheme: dark) { .tiptap input[type="checkbox"] { border-color: #52525b; } }
      `}</style>

      <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8 pt-12 sm:pt-20">
        <div className="max-w-3xl mx-auto space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-bold text-2xl tracking-tight text-[var(--foreground)] hover:opacity-80 transition-opacity">
                Fotion
              </Link>
              <Link href="/" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-[var(--foreground)] transition-colors bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-full border border-[var(--border)]">
                <LayoutGrid className="w-3.5 h-3.5" />
                My Matrix
              </Link>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {isSaving && <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium"><Loader2 className="w-3 h-3 animate-spin" /> Saving</span>}
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-900/50 shadow-sm">
                <Globe className="w-3.5 h-3.5" /> Guest Access
              </span>
              
              {sessionId && (
                <button 
                  onClick={handleSaveToMatrix}
                  disabled={isSavedToMatrix}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all shadow-sm ${
                    isSavedToMatrix 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 opacity-80 cursor-default'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95'
                  }`}
                >
                  {isSavedToMatrix ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                  {isSavedToMatrix ? "Saved to Matrix" : "Add to My Matrix"}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <button onClick={() => handleUpdate("status", task.status === "done" ? "todo" : "done")} className="mt-1 group shrink-0 outline-none">
                {task.status === "done" ? <CheckCircle2 className="w-8 h-8 text-pink-500 transition-transform active:scale-95" /> : <Circle className="w-8 h-8 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-400 transition-all active:scale-95" />}
              </button>
              <textarea
                ref={titleRef}
                value={title}
                onChange={handleTitleChange}
                onBlur={() => handleUpdate("title", title)}
                rows={1}
                className={`w-full text-3xl sm:text-4xl font-bold bg-transparent border-none outline-none resize-none overflow-hidden block py-0 leading-tight transition-colors ${task.status === "done" ? "text-zinc-400 line-through" : "text-[var(--foreground)]"}`}
                placeholder="Task title"
              />
            </div>

            {/* FULL METADATA GRID */}
            <div className="flex flex-col gap-1 sm:gap-2 text-[15px] bg-zinc-50/50 dark:bg-[#151515] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm">
              <PropertyRow icon={CheckSquare} label="Today">
                <button type="button" onClick={() => handleUpdate("isToday", !task.isToday)} className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${task.isToday ? 'bg-pink-400 border-pink-400' : 'border-zinc-300 dark:border-zinc-600 bg-transparent'}`}>
                  {task.isToday && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </button>
              </PropertyRow>
              <PropertyRow icon={PlayCircle} label="Status">
                <div className="flex flex-wrap gap-2">
                  {[{ id: 'todo', label: 'To Do', activeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50' }, { id: 'in-progress', label: 'In Progress', activeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-900/50' }, { id: 'done', label: 'Done', activeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900/50' }].map((s) => (
                    <button key={s.id} onClick={() => handleUpdate("status", s.id)} className={`px-3 py-1 text-[12px] font-medium rounded-full transition-all border ${task.status === s.id ? s.activeClass : "bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}>{s.label}</button>
                  ))}
                </div>
              </PropertyRow>
              <PropertyRow icon={Calendar} label="Due By Date">
                <CustomDatePicker value={task.doByDate ?? null} onChange={(val) => handleUpdate("doByDate", val)} alignPopover="left" />
              </PropertyRow>
              <PropertyRow icon={Calendar} label="Do On Date">
                <CustomDatePicker value={task.doOnDate ?? null} onChange={(val) => handleUpdate("doOnDate", val)} alignPopover="left" />
              </PropertyRow>
              <PropertyRow icon={Sigma} label="Matrix Tags">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleUpdate("isUrgent", !task.isUrgent)} className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors border ${task.isUrgent ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/50' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>Urgent</button>
                  <button onClick={() => handleUpdate("isImportant", !task.isImportant)} className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors border ${task.isImportant ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/50' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>Important</button>
                  <button onClick={() => handleUpdate("isForFunsies", !task.isForFunsies)} className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors border ${task.isForFunsies ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-900/50' : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>For Funsies</button>
                </div>
              </PropertyRow>
              <PropertyRow icon={List} label="Pipelines">
                <div className="flex flex-wrap gap-2">
                  {['Current', 'Waiting For', 'Someday Maybe'].map(listName => (
                     <button key={listName} onClick={() => handleUpdate("listCategory", listName)} className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all border ${task.listCategory === listName ? getListColor(listName) : 'bg-transparent border-[var(--border)] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>{listName}</button>
                  ))}
                </div>
              </PropertyRow>
              <PropertyRow icon={Folder} label="Project">
                <GuestProjectSelect value={task.projectId} onChange={(val) => handleUpdate("projectId", val)} />
              </PropertyRow>
            </div>

            {/* FULL RICH TEXT EDITOR */}
            <div className="bg-zinc-50/50 dark:bg-[#151515] border border-[var(--border)] rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Task Notes</label>
                <EditorToolbar editor={editor} />
              </div>
              <div className="w-full text-[var(--foreground)] text-base leading-relaxed">
                <EditorContent editor={editor} className="tiptap" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}