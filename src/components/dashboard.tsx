"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddRepositoryDialog } from "./add-repository-dialog";

export function Dashboard({ children }: { children: React.ReactNode }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  const handleAddRepository = async (repo: {
    name: string;
    path: string;
    remoteUrl?: string;
    type?: string;
  }) => {
    const response = await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(repo),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add repository");
    }

    // Refresh the page to show the new repository
    router.refresh();
  };

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
              onClick={() => setIsDialogOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Repository
            </button>
          </div>

          {children}
        </div>
      </main>

      <AddRepositoryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onAdd={handleAddRepository}
      />
    </>
  );
}
