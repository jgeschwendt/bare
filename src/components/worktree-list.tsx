"use client";

import { useEffect, useState } from "react";
import type { Worktree } from "@/lib/types";
import { basename } from "path";

interface WorktreeListProps {
  repoPath: string;
  onRefresh?: () => void;
}

export function WorktreeList({ repoPath, onRefresh }: WorktreeListProps) {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingWorktree, setIsAddingWorktree] = useState(false);
  const [worktreeName, setWorktreeName] = useState("");

  const fetchWorktrees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/worktree?repoPath=${encodeURIComponent(repoPath)}`
      );
      if (!response.ok) throw new Error("Failed to fetch worktrees");
      const data = await response.json();
      setWorktrees(data.worktrees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load worktrees");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorktrees();
  }, [repoPath]);

  const handleAddWorktree = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch("/api/worktree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoPath,
          worktreeName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add worktree");
      }

      await fetchWorktrees();
      setIsAddingWorktree(false);
      setWorktreeName("");
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add worktree");
    }
  };

  const handleRemoveWorktree = async (worktreePath: string) => {
    const worktreeName = basename(worktreePath);

    if (!confirm(`Remove worktree "${worktreeName}"?`)) return;

    try {
      const response = await fetch(
        `/api/worktree?repoPath=${encodeURIComponent(repoPath)}&worktreeName=${encodeURIComponent(worktreeName)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove worktree");
      }

      await fetchWorktrees();
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove worktree");
    }
  };

  const handleOpenAddDialog = () => {
    setIsAddingWorktree(true);
  };

  const handleOpen = async (worktreePath: string, app: "cursor" | "vscode" | "terminal") => {
    try {
      const response = await fetch("/api/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: worktreePath, app }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to open in ${app}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to open in ${app}`);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading worktrees...</div>;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Worktrees</h4>
        <button
          onClick={handleOpenAddDialog}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Worktree
        </button>
      </div>

      {error && (
        <div className="p-2 mb-2 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {isAddingWorktree && (
        <form onSubmit={handleAddWorktree} className="mb-3 p-3 bg-gray-50 rounded">
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium mb-1">Worktree Name</label>
              <input
                type="text"
                required
                value={worktreeName}
                onChange={(e) => setWorktreeName(e.target.value)}
                placeholder="feature-xyz"
                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Updates main, installs deps, creates new branch from main, copies node_modules (fast with hardlinks)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddingWorktree(false)}
                className="flex-1 px-2 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-1">
        {worktrees.length === 0 ? (
          <p className="text-xs text-gray-500">No worktrees</p>
        ) : (
          worktrees.map((wt, index) => {
            const name = basename(wt.path);
            const branchName = wt.branch?.replace("refs/heads/", "") || "detached";
            const isProtected = wt.bare || name === "__main__";

            return (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-gray-600">
                    {branchName}
                    {wt.bare && <span className="ml-2 text-gray-400">(bare)</span>}
                    {name === "__main__" && <span className="ml-2 text-gray-400">(protected)</span>}
                  </div>
                </div>
                {!isProtected && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpen(wt.path, "cursor")}
                      className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      title="Open in Cursor"
                    >
                      Cursor
                    </button>
                    <button
                      onClick={() => handleOpen(wt.path, "terminal")}
                      className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
                      title="Open in Terminal"
                    >
                      Terminal
                    </button>
                    <button
                      onClick={() => handleRemoveWorktree(wt.path)}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {isProtected && name === "__main__" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpen(wt.path, "cursor")}
                      className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      title="Open in Cursor"
                    >
                      Cursor
                    </button>
                    <button
                      onClick={() => handleOpen(wt.path, "terminal")}
                      className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
                      title="Open in Terminal"
                    >
                      Terminal
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
