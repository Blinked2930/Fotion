"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { SlashMenu } from "./SlashMenu";
import { useState, useCallback, useEffect } from "react";

interface TipTapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

export function TipTapEditor({ content = "", onChange, placeholder = "Start typing..." }: TipTapEditorProps) {
  const [slashMenu, setSlashMenu] = useState<{
    show: boolean;
    query: string;
  }>({ show: false, query: "" });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    editorProps: {
      handleKeyDown: (view, event) => {
        if (event.key === "/" && !slashMenu.show) {
          setSlashMenu({ show: true, query: "" });
          return false;
        }

        if (slashMenu.show) {
          if (event.key === "Escape") {
            setSlashMenu({ show: false, query: "" });
            return true;
          }
          if (event.key === "Enter" || event.key === "ArrowDown" || event.key === "ArrowUp") {
            return true;
          }
          if (event.key === "Backspace") {
            const text = view.state.doc.textContent;
            const lastSlash = text.lastIndexOf("/");
            const query = text.slice(lastSlash + 1);
            
            if (lastSlash === -1 || query.length <= 1) {
              setSlashMenu({ show: false, query: "" });
            } else {
              setSlashMenu({ show: true, query: query.slice(0, -1) });
            }
          } else if (event.key.length === 1) {
            const text = view.state.doc.textContent;
            const lastSlash = text.lastIndexOf("/");
            const query = text.slice(lastSlash + 1) + event.key;
            setSlashMenu({ show: true, query });
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  const closeSlashMenu = useCallback(() => {
    if (editor) {
      const text = editor.getText();
      const lastSlash = text.lastIndexOf("/");
      if (lastSlash !== -1) {
        editor.commands.deleteRange({
          from: lastSlash + 1,
          to: editor.state.doc.content.size - 2,
        });
      }
    }
    setSlashMenu({ show: false, query: "" });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (slashMenu.show) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [slashMenu.show, editor]);

  if (!editor) return null;

  return (
    <div className="relative">
      <EditorContent
        editor={editor}
        className="prose prose-zinc max-w-none min-h-[200px] p-4 bg-white rounded-lg border border-zinc-200 focus-within:border-zinc-400 focus-within:ring-1 focus-within:ring-zinc-400 outline-none [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li_label]:mr-2 [&_ul[data-type=taskList]_li>div]:flex-1"
      />
      {slashMenu.show && (
        <div className="absolute left-4 top-8">
          <SlashMenu
            editor={editor}
            query={slashMenu.query}
            onClose={closeSlashMenu}
          />
        </div>
      )}
    </div>
  );
}
