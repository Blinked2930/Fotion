"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { NoteCard } from "./NoteCard";
import { NewNoteForm } from "./NewNoteForm";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { TipTapEditor } from "@/components/editor/TipTapEditor";
import { useMutation } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";

type Note = {
  _id: Id<"notes">;
  title: string;
  content: string;
  tags: string[];
};

function NoteEditorModal({ note, onClose }: { note: Note; onClose: () => void }) {
  const updateNote = useMutation(api.notes.updateNote);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  const handleSave = async () => {
    await updateNote({
      id: note._id,
      title: title.trim(),
      content,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-zinc-200">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-semibold bg-transparent outline-none text-zinc-900"
          />
        </div>
        <div className="p-4">
          <TipTapEditor content={content} onChange={setContent} />
        </div>
        <div className="p-4 border-t border-zinc-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-600 hover:text-zinc-900 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function NoteList() {
  const notes = useQuery(api.notes.getNotes);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  if (notes === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6 text-zinc-900">Notes</h2>
      
      <div className="mb-6">
        <NewNoteForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(notes as Note[]).map((note) => (
          <NoteCard
            key={note._id}
            note={note}
            onClick={() => setEditingNote(note)}
          />
        ))}
      </div>

      {notes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-500">No notes yet. Create your first note above!</p>
        </div>
      )}

      {editingNote && (
        <NoteEditorModal
          note={editingNote}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  );
}
