"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CloneDialog } from "./clone-dialog";

export function Dashboard({ children }: { children: React.ReactNode }) {
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Bare - Worktree Manager
              </h1>
              <p className="text-gray-600">
                Manage multiple git repositories with worktrees
              </p>
            </div>
            <button
              onClick={() => setIsCloneDialogOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Clone Repository
            </button>
          </div>

          {children}
        </div>
      </main>

      <CloneDialog
        isOpen={isCloneDialogOpen}
        onClose={() => setIsCloneDialogOpen(false)}
        onComplete={() => router.refresh()}
      />
    </>
  );
}
