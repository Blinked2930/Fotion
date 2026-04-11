"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FileText, Trash2, Tag } from "lucide-react";
import { useState } from "react";

type Note = {
  _id: Id<"notes">;
  title: string;
  content: string;
  tags: string[];
};

interface NoteCardProps {
  note: Note;
  onClick?: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const deleteNote = useMutation(api.notes.deleteNote);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNote({ id: note._id });
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const contentPreview = stripHtml(note.content).slice(0, 150);
  const isLongContent = contentPreview.length >= 150;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <FileText className="w-5 h-5 text-zinc-400 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-900 truncate">{note.title}</h3>
          
          <p className="text-sm text-zinc-600 mt-2 line-clamp-3">
            {isExpanded ? contentPreview : contentPreview.slice(0, 100)}
            {!isExpanded && isLongContent && "..."}
          </p>
          
          {isLongContent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-xs text-zinc-500 mt-1 hover:text-zinc-700"
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}

          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded-full"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleDelete}
          className="text-zinc-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
