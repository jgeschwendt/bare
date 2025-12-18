"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "motion/react";
import type { Worktree } from "@/lib/types";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  PlusIcon,
  FolderIcon,
  CodeBracketIcon,
  CommandLineIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface WorktreeSidebarProps {
  repoPath?: string;
}

export function WorktreeSidebar({ repoPath }: WorktreeSidebarProps) {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newWorktreeName, setNewWorktreeName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string[]>([]);
  const [selectedWorktrees, setSelectedWorktrees] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const fetchWorktrees = useCallback(async () => {
    if (!repoPath) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/worktree?repoPath=${encodeURIComponent(repoPath)}`
      );
      if (!response.ok) throw new Error("Failed to fetch worktrees");
      const data = await response.json();
      setWorktrees(data.worktrees || []);
    } catch (err) {
      console.error("Failed to load worktrees:", err);
      setWorktrees([]);
    } finally {
      setIsLoading(false);
    }
  }, [repoPath]);

  useEffect(() => {
    if (!repoPath) {
      setWorktrees([]);
      return;
    }

    fetchWorktrees();
  }, [repoPath, fetchWorktrees]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const handleAddWorktree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath || !newWorktreeName.trim()) return;

    setIsCreating(true);
    setCreateProgress([]);
    setCreateError(null);

    try {
      const response = await fetch("/api/worktree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoPath,
          worktreeName: newWorktreeName.trim(),
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
            if (data === "[DONE]") {
              setIsCreating(false);
              setIsAdding(false);
              setNewWorktreeName("");
              setCreateProgress([]);
              await fetchWorktrees();
            } else if (data.startsWith("ERROR: ")) {
              setCreateError(data.slice(7));
              setIsCreating(false);
            } else {
              setCreateProgress((prev) => [...prev, data]);
            }
          }
        }
      }
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to add worktree"
      );
      setIsCreating(false);
    }
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
      console.error(err);
    }
  };

  const handleDelete = async (worktreeName: string) => {
    if (!repoPath) return;

    // Don't allow deleting __main__
    if (worktreeName === "__main__") {
      alert("Cannot delete the main worktree");
      return;
    }

    if (!confirm(`Delete worktree "${worktreeName}"?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/worktree?repoPath=${encodeURIComponent(
          repoPath
        )}&worktreeName=${encodeURIComponent(worktreeName)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete worktree");
      }

      await fetchWorktrees();
    } catch (err) {
      console.error("Failed to delete worktree:", err);
      alert(err instanceof Error ? err.message : "Failed to delete worktree");
    }
  };

  const handleSync = async () => {
    if (!repoPath) return;

    setIsSyncing(true);
    setSyncProgress([]);

    try {
      const response = await fetch("/api/worktree", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoPath,
          action: "sync-main",
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sync main");
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
            if (data === "[DONE]") {
              setIsSyncing(false);
              await new Promise((resolve) => setTimeout(resolve, 1000));
              setSyncProgress([]);
            } else if (data.startsWith("ERROR: ")) {
              console.error("Sync error:", data.slice(7));
              setIsSyncing(false);
            } else {
              setSyncProgress((prev) => [data, ...prev]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync main:", err);
      alert(err instanceof Error ? err.message : "Failed to sync main");
      setIsSyncing(false);
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

  const handleBulkDelete = async () => {
    if (selectedWorktrees.size === 0 || !repoPath) return;

    if (!confirm(`Delete ${selectedWorktrees.size} worktree${selectedWorktrees.size > 1 ? "s" : ""}?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      for (const worktreePath of selectedWorktrees) {
        const worktreeName = worktreePath.split("/").pop() || "";
        const response = await fetch(
          `/api/worktree?repoPath=${encodeURIComponent(repoPath)}&worktreeName=${encodeURIComponent(worktreeName)}`,
          { method: "DELETE" }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to delete ${worktreeName}`);
        }
      }

      setSelectedWorktrees(new Set());
      await fetchWorktrees();
    } catch (err) {
      console.error("Failed to delete worktrees:", err);
      alert(err instanceof Error ? err.message : "Failed to delete worktrees");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-base-300 border-r border-base-100 flex flex-col">
        <button
          onClick={() => setIsCollapsed(false)}
          className="btn btn-ghost btn-sm"
          title="Expand sidebar"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      className="bg-base-300 border-r border-base-100 flex flex-col relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-base-100">
        <span className="text-xs font-semibold opacity-60 uppercase tracking-wider">
          Worktrees
          {selectedWorktrees.size > 0 && (
            <span className="ml-2 text-primary">({selectedWorktrees.size})</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {selectedWorktrees.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn btn-ghost btn-xs text-error"
              title="Delete selected worktrees"
              disabled={isDeleting}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
          {repoPath && (
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="btn btn-ghost btn-xs"
              title="Add worktree"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(true)}
            className="btn btn-ghost btn-xs"
            title="Collapse sidebar"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Worktree Form */}
      {isAdding && (
        <div className="p-3 bg-base-200 border-b border-base-100">
          <form onSubmit={handleAddWorktree} className="space-y-2">
            <input
              type="text"
              value={newWorktreeName}
              onChange={(e) => setNewWorktreeName(e.target.value)}
              placeholder="feature-name"
              className="input input-bordered input-sm w-full"
              autoFocus
              disabled={isCreating}
            />
            {createError && (
              <div className="text-xs text-error">{createError}</div>
            )}
            {createProgress.length > 0 && (
              <div className="text-xs opacity-60 font-mono">
                {createProgress.slice(-2).map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewWorktreeName("");
                  setCreateError(null);
                  setCreateProgress([]);
                }}
                className="btn btn-ghost btn-xs flex-1"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success btn-xs flex-1"
                disabled={isCreating || !newWorktreeName.trim()}
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Worktree List */}
      <div className="flex-1 overflow-y-auto">
        {!repoPath ? (
          <div className="p-4 text-xs opacity-60">
            Select a repository to view worktrees
          </div>
        ) : isLoading ? (
          <div className="p-4 text-xs opacity-60">Loading...</div>
        ) : worktrees.length === 0 ? (
          <div className="p-4 text-xs opacity-60">No worktrees</div>
        ) : (
          <div>
            {[...worktrees]
              .sort((a, b) => {
                const aName = a.path.split("/").pop() || "";
                const bName = b.path.split("/").pop() || "";
                if (aName === "__main__") return -1;
                if (bName === "__main__") return 1;
                return aName.localeCompare(bName);
              })
              .map((wt, index) => {
                const name = wt.path.split("/").pop() || wt.path;
                const branchName =
                  wt.branch?.replace("refs/heads/", "") || "detached";
                const isMain = name === "__main__";
                const shortHash = wt.head?.slice(0, 7);
                const mainWorktree = worktrees.find((w) =>
                  w.path.endsWith("__main__")
                );
                const isDifferentFromMain =
                  mainWorktree && wt.head !== mainWorktree.head;

                return (
                  <React.Fragment key={wt.path}>
                    {isMain && (
                      <motion.div
                        className="px-3 overflow-hidden"
                        initial={{ height: 0 }}
                        animate={{
                          height: syncProgress.length > 0 ? "3.75rem" : 0,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="pt-2 pb-1 text-xs opacity-60 font-mono space-y-0.5">
                          {syncProgress.map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    <div
                      key={index}
                      className="flex items-center justify-between group w-full px-3 py-2 hover:bg-base-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <FolderIcon className="w-4 h-4 opacity-60 shrink-0" />
                          <span
                            className={`text-sm truncate ${
                              isMain ? "font-bold" : ""
                            }`}
                          >
                            {isMain ? "main" : name}
                          </span>
                          <span className="text-xs opacity-60">/</span>
                          <span className="text-xs opacity-60 truncate">
                            {branchName}
                          </span>
                        </div>
                        {shortHash && (
                          <div className="text-xs opacity-50 ml-5 truncate font-mono">
                            {shortHash}
                            {(isMain || isDifferentFromMain) &&
                              wt.commitMessage &&
                              ` ${wt.commitMessage}`}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpen(wt.path, "vscode");
                          }}
                          className="btn btn-ghost btn-xs"
                          title="Open in VS Code"
                        >
                          <CodeBracketIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpen(wt.path, "terminal");
                          }}
                          className="btn btn-ghost btn-xs"
                          title="Open in Terminal"
                        >
                          <CommandLineIcon className="w-4 h-4" />
                        </button>
                        {isMain ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSync();
                            }}
                            className={`btn btn-ghost btn-xs ${
                              isSyncing ? "loading" : ""
                            }`}
                            title="Sync main worktree"
                            disabled={isSyncing}
                          >
                            <ArrowPathIcon
                              className={`w-4 h-4 ${
                                isSyncing ? "animate-spin" : ""
                              }`}
                            />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWorktreeSelection(wt.path);
                            }}
                            className={`btn btn-ghost btn-xs ${
                              selectedWorktrees.has(wt.path) ? "text-error" : ""
                            }`}
                            title={selectedWorktrees.has(wt.path) ? "Deselect worktree" : "Select for deletion"}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />
    </div>
  );
}
