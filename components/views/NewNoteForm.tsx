"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TipTapEditor } from "@/components/editor/TipTapEditor";
import { Plus, X, Tag } from "lucide-react";

export function NewNoteForm() {
  const createNote = useMutation(api.notes.createNote);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createNote({
      title: title.trim(),
      content,
      tags,
    });

    setTitle("");
    setContent("");
    setTags([]);
    setIsExpanded(false);
  };

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  if (!isExpanded) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4">
        <div className="flex items-center gap-3">
          <Plus className="w-5 h-5 text-zinc-400" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="Create a new note..."
            className="flex-1 bg-transparent outline-none text-zinc-900 placeholder:text-zinc-400"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="w-full text-lg font-medium bg-transparent outline-none text-zinc-900 placeholder:text-zinc-400 mb-4"
        />

        <TipTapEditor
          content={content}
          onChange={setContent}
          placeholder="Start writing... (type / for commands)"
        />

        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-600">Tags</span>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-700 text-sm rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-zinc-500 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Add tag..."
                className="px-2 py-1 text-sm bg-zinc-50 rounded outline-none w-24"
              />
              <button
                type="button"
                onClick={addTag}
                className="p-1 text-zinc-500 hover:text-zinc-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="px-4 py-2 text-zinc-600 hover:text-zinc-900 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
          >
            Create Note
          </button>
        </div>
      </form>
    </div>
  );
}
