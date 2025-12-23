"use client";

import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@/ui/dialog";
import type { Repository } from "@/lib/types";

interface AddWorktreeDialogProps {
  isOpen: boolean;
  repository?: Repository;
  onClose: () => void;
  onComplete: () => void;
}

export function AddWorktreeDialog({
  isOpen,
  repository,
  onClose,
  onComplete,
}: AddWorktreeDialogProps) {
  const [worktreeName, setWorktreeName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repository || !worktreeName.trim()) return;

    setIsCreating(true);
    setProgress([]);
    setError(null);

    try {
      const response = await fetch("/api/worktree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoPath: repository.path,
          worktreeName: worktreeName.trim(),
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          const message = line.slice(6);
          if (message === "[DONE]") {
            setTimeout(() => {
              setWorktreeName("");
              onComplete();
            }, 500);
          } else if (message.startsWith("ERROR:")) {
            setError(message.slice(7));
          } else {
            setProgress((prev) => [...prev, message]);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create worktree");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black/50 z-50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <DialogPanel className="bg-white dark:bg-black/90 border border-black/10 dark:border-white/10 rounded-lg shadow-xl w-full max-w-lg p-6">
          <DialogTitle className="font-bold text-lg mb-4">
            Add Worktree
          </DialogTitle>

        {repository && (
          <div className="text-sm opacity-60 mb-4">
            Repository: <span className="font-mono">{repository.name}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2">
              <span className="text-sm font-medium">Worktree Name</span>
            </label>
            <input
              type="text"
              placeholder="feature/new-branch"
              className="px-3 py-2 rounded border border-black/20 dark:border-white/20 w-full bg-transparent placeholder-black/40 dark:placeholder-white/40"
              value={worktreeName}
              onChange={(e) => setWorktreeName(e.target.value)}
              disabled={isCreating}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 text-red-900 border border-red-200 mt-4">
              <span className="text-sm">{error}</span>
            </div>
          )}

          {progress.length > 0 && (
            <div className="mt-4 p-3 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10">
              <div className="text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
                {progress.map((line, i) => (
                  <div key={i} className="opacity-80">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end mt-6">
            <button
              type="button"
              className="px-3 py-1.5 text-sm rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={isCreating || !worktreeName.trim()}
            >
              {isCreating ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Creating...
                </>
              ) : (
                "Create Worktree"
              )}
            </button>
          </div>
        </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
