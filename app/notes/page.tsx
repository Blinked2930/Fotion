import { NoteList } from "@/components/views/NoteList";
import Link from "next/link";

export default function NotesPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="text-xl font-bold text-zinc-900">
              Fotion
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-zinc-600 hover:text-zinc-900"
              >
                Tasks
              </Link>
              <Link
                href="/notes"
                className="text-sm font-medium text-zinc-900"
              >
                Notes
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <NoteList />
      </main>
    </div>
  );
}
