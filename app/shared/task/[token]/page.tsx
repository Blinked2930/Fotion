"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, Lock, CheckCircle2, Circle, Bold, Italic, List, ListOrdered, CheckSquare, Globe } from "lucide-react";
import { useState, useEffect } from "react";

// Import the rich text editor!
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension, InputRule } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';

const DoubleSpaceFix = Extension.create({
  name: 'doubleSpaceFix',
  addInputRules() {
    return [
      new InputRule({
        find: /([^\s])  $/,
        handler: ({ state, range, match }) => {
          state.tr.insertText(`${match[1]}. `, range.from, range.to);
        },
      }),
    ];
  },
});

const EditorToolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-1 mb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><Bold className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><Italic className="w-4 h-4" /></button>
      <div className="w-px h-4 bg-[var(--border)] mx-1 shrink-0" />
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('bulletList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><List className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('orderedList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><ListOrdered className="w-4 h-4" /></button>
      <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded shrink-0 transition-colors ${editor.isActive('taskList') ? 'bg-zinc-200 dark:bg-zinc-700 text-[var(--foreground)]' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-[var(--foreground)]'}`}><CheckSquare className="w-4 h-4" /></button>
    </div>
  );
};

export default function SharedTaskPage() {
  const params = useParams();
  const token = params.token as string;
  
  const task = useQuery(api.shared.getPublicTask, { token });
  const toggleTask = useMutation(api.shared.togglePublicTask);
  const updateDescription = useMutation(api.shared.updatePublicTaskDescription);
  
  const [isSaving, setIsSaving] = useState(false);

  // Initialize TipTap for the guest!
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Add notes, updates, or context here... (Use 1. or - or [ ] for lists)" }),
      DoubleSpaceFix
    ],
    content: task?.description || "",
    immediatelyRender: false, 
    onBlur: async ({ editor }) => {
      const html = editor.getHTML();
      if (task && html !== task.description) {
        setIsSaving(true);
        await updateDescription({ token, description: html });
        setTimeout(() => setIsSaving(false), 500); 
      }
    },
  });

  // Sync content if it updates remotely
  useEffect(() => {
    if (task && editor && task.description !== editor.getHTML()) {
      editor.commands.setContent(task.description || "");
    }
  }, [task?.description, editor]);

  if (task === undefined) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300 dark:text-zinc-700" />
      </div>
    );
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

  const isDone = task.status === "done";

  const handleToggle = async () => {
    await toggleTask({ token, status: isDone ? "todo" : "done" });
  };

  return (
    <>
      <style>{`
        .tiptap { min-height: 300px; outline: none !important; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap; max-width: 100%; cursor: text; }
        .tiptap * { max-width: 100%; }
        .tiptap ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.5rem; }
        .tiptap p { margin-bottom: 0.5rem; }
        .tiptap ul[data-type="taskList"] { list-style: none; padding: 0; margin: 0; }
        .tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; margin-bottom: 0.25rem; }
        .tiptap ul[data-type="taskList"] li > label { margin-right: 0.5rem; user-select: none; }
        .tiptap p.is-editor-empty:first-child::before { color: #a1a1aa; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        
        .tiptap input[type="checkbox"] {
          appearance: none; background-color: transparent; margin: 0; font: inherit; color: currentColor;
          width: 1.15em; height: 1.15em; border: 1px solid #d4d4d8; border-radius: 0.25em; display: grid; place-content: center; cursor: pointer;
        }
        .tiptap input[type="checkbox"]::before {
          content: ""; width: 0.65em; height: 0.65em; transform: scale(0); transition: 120ms transform ease-in-out;
          box-shadow: inset 1em 1em white; background-color: white; transform-origin: center;
          clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
        }
        .tiptap input[type="checkbox"]:checked { background-color: #f472b6; border-color: #f472b6; }
        .tiptap input[type="checkbox"]:checked::before { transform: scale(1); }
        @media (prefers-color-scheme: dark) { .tiptap input[type="checkbox"] { border-color: #52525b; } }
      `}</style>

      <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8 pt-12 sm:pt-20">
        <div className="max-w-3xl mx-auto">
          
          {/* Beautiful Header */}
          <div className="flex items-center justify-between mb-12">
            <span className="font-bold text-2xl tracking-tight text-[var(--foreground)]">Fotion</span>
            <div className="flex items-center gap-3">
              {isSaving && <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium"><Loader2 className="w-3 h-3 animate-spin" /> Saving</span>}
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-900/50 shadow-sm">
                <Globe className="w-3.5 h-3.5" /> Guest Access
              </span>
            </div>
          </div>

          {/* Task Title Area */}
          <div className="flex items-start gap-4 mb-8">
            <button onClick={handleToggle} className="mt-1 group shrink-0">
              {isDone ? (
                <CheckCircle2 className="w-8 h-8 text-pink-500 transition-transform active:scale-95" />
              ) : (
                <Circle className="w-8 h-8 text-zinc-300 dark:text-zinc-600 group-hover:text-blue-400 transition-all active:scale-95" />
              )}
            </button>
            <h1 className={`text-3xl sm:text-4xl font-bold transition-all leading-tight ${isDone ? "text-zinc-400 line-through" : "text-[var(--foreground)]"}`}>
              {task.title}
            </h1>
          </div>

          {/* Rich Text Editor Area */}
          <div className="bg-zinc-50/50 dark:bg-[#151515] border border-[var(--border)] rounded-2xl p-5 sm:p-8 shadow-sm">
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
    </>
  );
}