"use client";

import { useState, useEffect, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Heading1, Heading2, List, CheckSquare, Quote, Code, Type } from "lucide-react";

interface SlashMenuProps {
  editor: Editor;
  query: string;
  onClose: () => void;
}

const commands = [
  {
    name: "Paragraph",
    icon: Type,
    shortcut: "p",
    action: (editor: Editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    name: "Heading 1",
    icon: Heading1,
    shortcut: "h1",
    action: (editor: Editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    name: "Heading 2",
    icon: Heading2,
    shortcut: "h2",
    action: (editor: Editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    name: "Bullet List",
    icon: List,
    shortcut: "ul",
    action: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    name: "Task List",
    icon: CheckSquare,
    shortcut: "task",
    action: (editor: Editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    name: "Blockquote",
    icon: Quote,
    shortcut: "quote",
    action: (editor: Editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    name: "Code Block",
    icon: Code,
    shortcut: "code",
    action: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
];

export function SlashMenu({ editor, query, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase()) ||
    cmd.shortcut.toLowerCase().includes(query.toLowerCase())
  );

  const executeCommand = useCallback(
    (index: number) => {
      const command = filteredCommands[index];
      if (command) {
        command.action(editor);
        onClose();
      }
    },
    [editor, filteredCommands, onClose]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        executeCommand(selectedIndex);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, selectedIndex, executeCommand, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (filteredCommands.length === 0) return null;

  return (
    <div className="absolute z-50 w-64 bg-white rounded-lg shadow-lg border border-zinc-200 py-2">
      <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        Formatting
      </div>
      {filteredCommands.map((command, index) => {
        const Icon = command.icon;
        return (
          <button
            key={command.name}
            onClick={() => executeCommand(index)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
              index === selectedIndex ? "bg-zinc-100" : "hover:bg-zinc-50"
            }`}
          >
            <Icon className="w-4 h-4 text-zinc-500" />
            <span className="flex-1 text-zinc-900">{command.name}</span>
            <span className="text-xs text-zinc-400">/{command.shortcut}</span>
          </button>
        );
      })}
    </div>
  );
}
