"use client";

import { useEffect, useState } from "react";
import type { Worktree } from "@/lib/types";
import { basename } from "path";

interface WorktreeListProps {
  repoPath: string;
  onRefresh?: () => void;
}

interface CreatingWorktree {
  name: string;
  progress: string[];
  error: string | null;
  isComplete: boolean;
}

export function WorktreeList({ repoPath, onRefresh }: WorktreeListProps) {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingWorktree, setIsAddingWorktree] = useState(false);
  const [worktreeName, setWorktreeName] = useState("");
  const [creatingWorktrees, setCreatingWorktrees] = useState<CreatingWorktree[]>([]);
  const [selectedWorktrees, setSelectedWorktrees] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

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

    const name = worktreeName.trim();
    if (!name) return;

    // Add to creating list
    const newCreating: CreatingWorktree = {
      name,
      progress: [],
      error: null,
      isComplete: false,
    };

    setCreatingWorktrees((prev) => [...prev, newCreating]);
    setWorktreeName("");

    // Start creation in background
    createWorktree(name);
  };

  const createWorktree = async (name: string) => {
    try {
      const response = await fetch("/api/worktree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoPath,
          worktreeName: name,
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add worktree");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[WORKTREE_CREATED]") {
              // Worktree is created and can be interacted with
              await fetchWorktrees();
              onRefresh?.();
            } else if (data === "[DONE]") {
              setCreatingWorktrees((prev) =>
                prev.map((w) =>
                  w.name === name ? { ...w, isComplete: true } : w
                )
              );
              await fetchWorktrees();
              onRefresh?.();
              // Remove from creating list after a delay
              setTimeout(() => {
                setCreatingWorktrees((prev) => prev.filter((w) => w.name !== name));
              }, 2000);
            } else if (data.startsWith("ERROR: ")) {
              setCreatingWorktrees((prev) =>
                prev.map((w) =>
                  w.name === name
                    ? { ...w, error: data.slice(7), isComplete: true }
                    : w
                )
              );
            } else {
              setCreatingWorktrees((prev) =>
                prev.map((w) =>
                  w.name === name ? { ...w, progress: [...w.progress, data] } : w
                )
              );
            }
          }
        }
      }
    } catch (err) {
      setCreatingWorktrees((prev) =>
        prev.map((w) =>
          w.name === name
            ? {
                ...w,
                error: err instanceof Error ? err.message : "Failed to add worktree",
                isComplete: true,
              }
            : w
        )
      );
    }
  };

  const toggleWorktreeSelection = (worktreePath: string) => {
    setSelectedWorktrees((prev) => {
      const next = new Set(prev);
      if (next.has(worktreePath)) {
        next.delete(worktreePath);
      } else {
        next.add(worktreePath);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedWorktrees.size === 0) return;

    const confirmed = confirm(
      `Remove ${selectedWorktrees.size} worktree${selectedWorktrees.size > 1 ? "s" : ""}?`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    // Run deletion in background
    (async () => {
      try {
        for (const worktreePath of selectedWorktrees) {
          const worktreeName = basename(worktreePath);
          const response = await fetch(
            `/api/worktree?repoPath=${encodeURIComponent(
              repoPath
            )}&worktreeName=${encodeURIComponent(worktreeName)}`,
            { method: "DELETE" }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Failed to remove ${worktreeName}`);
          }
        }

        setSelectedWorktrees(new Set());
        await fetchWorktrees();
        onRefresh?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove worktrees"
        );
      } finally {
        setIsDeleting(false);
      }
    })();
  };

  const handleRemoveWorktree = (worktreePath: string) => {
    const worktreeName = basename(worktreePath);

    const confirmed = confirm(`Remove worktree "${worktreeName}"?`);
    if (!confirmed) return;

    // Run deletion in background
    (async () => {
      try {
        const response = await fetch(
          `/api/worktree?repoPath=${encodeURIComponent(
            repoPath
          )}&worktreeName=${encodeURIComponent(worktreeName)}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to remove worktree");
        }

        await fetchWorktrees();
        onRefresh?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove worktree"
        );
      }
    })();
  };

  const handleOpenAddDialog = () => {
    setIsAddingWorktree(true);
  };

  const handleOpen = async (
    worktreePath: string,
    app: "vscode" | "terminal"
  ) => {
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

  const handleOpenWithClaude = async (worktreePath: string) => {
    try {
      const response = await fetch("/api/open-with-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: worktreePath }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to open with Claude");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to open with Claude"
      );
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading worktrees...</div>;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Worktrees</h4>
        <div className="flex gap-2">
          {selectedWorktrees.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : `Delete ${selectedWorktrees.size}`}
            </button>
          )}
          <button
            onClick={handleOpenAddDialog}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Worktree
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2 mb-2 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {isAddingWorktree && (
        <form
          onSubmit={handleAddWorktree}
          className="mb-3 p-3 bg-gray-50 rounded"
        >
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium mb-1">
                Worktree Name
              </label>
              <input
                type="text"
                required
                value={worktreeName}
                onChange={(e) => setWorktreeName(e.target.value)}
                placeholder="feature-xyz"
                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                You can create multiple worktrees simultaneously
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingWorktree(false);
                  setWorktreeName("");
                }}
                className="flex-1 px-2 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Done
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

      {/* Show creating worktrees */}
      {creatingWorktrees.length > 0 && (
        <div className="mb-3 space-y-2">
          {creatingWorktrees.map((creating) => (
            <div
              key={creating.name}
              className={`p-3 rounded border ${
                creating.error
                  ? "bg-red-50 border-red-200"
                  : creating.isComplete
                  ? "bg-green-50 border-green-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">{creating.name}</div>
                <div className="text-xs text-gray-600">
                  {creating.error ? (
                    <span className="text-red-600">Failed</span>
                  ) : creating.isComplete ? (
                    <span className="text-green-600">✓ Complete</span>
                  ) : (
                    <span className="text-blue-600">Creating...</span>
                  )}
                </div>
              </div>

              {creating.error && (
                <div className="text-xs text-red-700 mb-2">{creating.error}</div>
              )}

              {creating.progress.length > 0 && !creating.error && (
                <div className="text-xs font-mono space-y-0.5 text-gray-700">
                  {creating.progress.slice(-3).map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {worktrees.length === 0 ? (
          <p className="text-xs text-gray-500">No worktrees</p>
        ) : (
          worktrees.map((wt, index) => {
            const name = basename(wt.path);
            const branchName =
              wt.branch?.replace("refs/heads/", "") || "detached";
            const isProtected = wt.bare || name === "__main__";
            const isSelected = selectedWorktrees.has(wt.path);

            return (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-gray-600">
                    {branchName}
                    {wt.bare && (
                      <span className="ml-2 text-gray-400">(bare)</span>
                    )}
                    {name === "__main__" && (
                      <span className="ml-2 text-gray-400">(protected)</span>
                    )}
                  </div>
                </div>
                {!isProtected && (
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => handleOpenWithClaude(wt.path)}
                      className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded font-medium"
                      title="Open in VS Code + Terminal with Claude"
                    >
                      Claude
                    </button>
                    <button
                      onClick={() => handleOpen(wt.path, "vscode")}
                      className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      title="Open in VS Code"
                    >
                      Code
                    </button>
                    <button
                      onClick={() => handleOpen(wt.path, "terminal")}
                      className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
                      title="Open in Terminal"
                    >
                      Terminal
                    </button>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleWorktreeSelection(wt.path)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {isProtected && name === "__main__" && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenWithClaude(wt.path)}
                      className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded font-medium"
                      title="Open in VS Code + Terminal with Claude"
                    >
                      Claude
                    </button>
                    <button
                      onClick={() => handleOpen(wt.path, "vscode")}
                      className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      title="Open in VS Code"
                    >
                      Code
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
