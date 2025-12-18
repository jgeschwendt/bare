"use client";

import { useState } from "react";
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

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Add Worktree</h3>

        {repository && (
          <div className="text-sm opacity-60 mb-4">
            Repository: <span className="font-mono">{repository.name}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Worktree Name</span>
            </label>
            <input
              type="text"
              placeholder="feature/new-branch"
              className="input input-bordered"
              value={worktreeName}
              onChange={(e) => setWorktreeName(e.target.value)}
              disabled={isCreating}
              autoFocus
            />
          </div>

          {error && (
            <div className="alert alert-error mt-4">
              <span className="text-sm">{error}</span>
            </div>
          )}

          {progress.length > 0 && (
            <div className="mt-4 p-3 bg-base-200 rounded-lg">
              <div className="text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
                {progress.map((line, i) => (
                  <div key={i} className="opacity-80">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isCreating || !worktreeName.trim()}
            >
              {isCreating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                "Create Worktree"
              )}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
