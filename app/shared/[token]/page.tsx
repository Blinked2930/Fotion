"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, Lock, FileText } from "lucide-react";
import { useState, useEffect } from "react";

export default function SharedNotePage() {
  const params = useParams();
  const token = params.token as string;
  
  const note = useQuery(api.shared.getPublicNote, { token });
  const updateNote = useMutation(api.shared.updatePublicNote);
  
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when data loads
  useEffect(() => {
    if (note && !content) setContent(note.content || "");
  }, [note]);

  if (note === undefined) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300 dark:text-zinc-700" />
      </div>
    );
  }

  if (note === null) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center text-center px-4">
        <Lock className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
        <h1 className="text-xl font-bold text-[var(--foreground)]">Private or Not Found</h1>
        <p className="text-zinc-500 mt-2 max-w-sm">This note may have been deleted, or the owner has revoked public access.</p>
      </div>
    );
  }

  const handleSave = async (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (content !== note.content) {
      setIsSaving(true);
      await updateNote({ token, content });
      setTimeout(() => setIsSaving(false), 500); // UI feedback
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <h1 className="text-lg font-bold text-[var(--foreground)]">{note.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-md border border-green-200 dark:border-green-800/50">Shared Publicly</span>
            {isSaving && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleSave}
          placeholder="Start typing..."
          className="w-full min-h-[60vh] bg-transparent text-[var(--foreground)] text-lg outline-none resize-none placeholder:text-zinc-500 leading-relaxed"
        />
      </div>
    </div>
  );
}