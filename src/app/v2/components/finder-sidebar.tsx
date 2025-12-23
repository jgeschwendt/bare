"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronRightIcon,
  FolderIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  CodeBracketIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
import { motion } from "motion/react";
import type { Repository } from "@/lib/types";
import type { Worktree } from "@/lib/types";

interface FinderSidebarProps {
  repositories: Repository[];
  currentRepo?: Repository;
  onRepoSelect: (repo: Repository | undefined) => void;
  onWorktreeSelect?: (worktree: Worktree) => void;
  onAddWorktree?: (repo: Repository) => void;
}

interface GroupedRepos {
  [username: string]: Repository[];
}

export function FinderSidebar({
  repositories,
  currentRepo,
  onRepoSelect,
  onWorktreeSelect,
  onAddWorktree,
}: FinderSidebarProps) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set());
  const [worktrees, setWorktrees] = useState<Map<string, Worktree[]>>(new Map());
  const [selectedWorktrees, setSelectedWorktrees] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string[]>([]);

  const groupedRepos = useMemo(() => {
    const groups: GroupedRepos = {};
    for (const repo of repositories) {
      const pathParts = repo.path.split("/");
      const githubIndex = pathParts.findIndex((p) => p === "GitHub");
      const username = githubIndex >= 0 ? pathParts[githubIndex + 1] : "unknown";

      if (!groups[username]) groups[username] = [];
      groups[username].push(repo);
    }

    // Sort repos by name within each group
    Object.values(groups).forEach((repos) =>
      repos.sort((a, b) => a.name.localeCompare(b.name))
    );

    return groups;
  }, [repositories]);

  // Auto-expand current repo's user
  useEffect(() => {
    if (currentRepo) {
      const pathParts = currentRepo.path.split("/");
      const githubIndex = pathParts.findIndex((p) => p === "GitHub");
      const username = githubIndex >= 0 ? pathParts[githubIndex + 1] : "unknown";
      setExpandedUsers((prev) => new Set(prev).add(username));
      setExpandedRepos((prev) => new Set(prev).add(currentRepo.id));
    }
  }, [currentRepo]);

  // Fetch worktrees for expanded repos
  useEffect(() => {
    const fetchWorktrees = async (repoId: string, repoPath: string) => {
      try {
        const res = await fetch(`/api/worktree?repoPath=${encodeURIComponent(repoPath)}`);
        const data = await res.json();
        setWorktrees((prev) => new Map(prev).set(repoId, data.worktrees || []));
      } catch (error) {
        console.error("Failed to fetch worktrees:", error);
      }
    };

    for (const repoId of expandedRepos) {
      const repo = repositories.find((r) => r.id === repoId);
      if (repo && !worktrees.has(repoId)) {
        fetchWorktrees(repoId, repo.path);
      }
    }
  }, [expandedRepos, repositories, worktrees]);

  const toggleUser = (username: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const toggleRepo = (repoId: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) next.delete(repoId);
      else next.add(repoId);
      return next;
    });
  };

  const handleRepoClick = (repo: Repository) => {
    onRepoSelect(repo);
    toggleRepo(repo.id);
  };

  const handleWorktreeClick = (worktree: Worktree) => {
    if (onWorktreeSelect) onWorktreeSelect(worktree);
  };

  const toggleWorktreeSelection = (path: string) => {
    setSelectedWorktrees((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!currentRepo || selectedWorktrees.size === 0) return;
    if (!confirm(`Delete ${selectedWorktrees.size} worktree(s)?`)) return;

    try {
      for (const wtPath of selectedWorktrees) {
        const wtName = wtPath.split("/").pop();
        await fetch(
          `/api/worktree?repoPath=${encodeURIComponent(currentRepo.path)}&worktreeName=${wtName}`,
          { method: "DELETE" }
        );
      }

      // Refresh worktrees
      const res = await fetch(`/api/worktree?repoPath=${encodeURIComponent(currentRepo.path)}`);
      const data = await res.json();
      setWorktrees((prev) => new Map(prev).set(currentRepo.id, data.worktrees || []));
      setSelectedWorktrees(new Set());
    } catch (error) {
      console.error("Failed to delete worktrees:", error);
    }
  };

  const handleSync = async (repo: Repository) => {
    setIsSyncing(true);
    setSyncProgress([]);

    try {
      const res = await fetch("/api/worktree", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoPath: repo.path, action: "sync-main" }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

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
              setSyncProgress([]);
              setIsSyncing(false);
            }, 1000);
          } else if (!message.startsWith("ERROR:")) {
            setSyncProgress((prev) => [...prev.slice(-2), message]);
          }
        }
      }

      // Refresh worktrees
      const wtRes = await fetch(`/api/worktree?repoPath=${encodeURIComponent(repo.path)}`);
      const wtData = await wtRes.json();
      setWorktrees((prev) => new Map(prev).set(repo.id, wtData.worktrees || []));
    } catch (error) {
      console.error("Sync failed:", error);
      setIsSyncing(false);
      setSyncProgress([]);
    }
  };

  const openInVSCode = (path: string) => {
    window.open(`vscode://file/${path}`, "_blank");
  };

  const openInTerminal = (path: string) => {
    // This would need a backend handler
    console.log("Open terminal:", path);
  };

  return (
    <div className="w-64 bg-white dark:bg-black border-r border-black/10 dark:border-white/10 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
        <span className="text-xs font-semibold opacity-60 uppercase tracking-wider">
          Repositories
        </span>
        {selectedWorktrees.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-2 py-1 text-xs rounded text-red-600 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Delete selected worktrees"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedRepos).map(([username, repos]) => (
          <div key={username}>
            <button
              onClick={() => toggleUser(username)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-black/10 dark:hover:bg-white/10 text-left"
            >
              <ChevronRightIcon
                className={`w-4 h-4 transition-transform ${
                  expandedUsers.has(username) ? "rotate-90" : ""
                }`}
              />
              <span className="font-semibold text-sm">{username}</span>
              <span className="text-xs opacity-40">({repos.length})</span>
            </button>

            {expandedUsers.has(username) && (
              <div className="ml-3">
                {repos.map((repo) => {
                  const isExpanded = expandedRepos.has(repo.id);
                  const repoWorktrees = worktrees.get(repo.id) || [];
                  const mainWorktree = repoWorktrees.find((wt) =>
                    wt.path.endsWith("__main__")
                  );
                  const otherWorktrees = repoWorktrees
                    .filter((wt) => !wt.path.endsWith("__main__"))
                    .sort((a, b) => a.path.localeCompare(b.path));
                  const sortedWorktrees = mainWorktree
                    ? [mainWorktree, ...otherWorktrees]
                    : otherWorktrees;

                  return (
                    <div key={repo.id}>
                      <button
                        onClick={() => handleRepoClick(repo)}
                        className={`w-full px-3 py-1.5 flex items-center gap-2 hover:bg-black/10 dark:hover:bg-white/10 text-left ${
                          currentRepo?.id === repo.id ? "bg-black/10 dark:bg-white/10" : ""
                        }`}
                      >
                        <ChevronRightIcon
                          className={`w-3.5 h-3.5 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                        <FolderIcon className="w-4 h-4 opacity-60" />
                        <span className="text-sm truncate">{repo.name}</span>
                      </button>

                      {isExpanded && (
                        <div className="ml-6">
                          {sortedWorktrees.map((wt) => {
                            const name = wt.path.split("/").pop() || "";
                            const isMain = name === "__main__";
                            const branchName = wt.branch?.replace("refs/heads/", "") || "";
                            const shortHash = wt.head?.slice(0, 7);
                            const isSelected = selectedWorktrees.has(wt.path);

                            return (
                              <div key={wt.path}>
                                {isMain && syncProgress.length > 0 && (
                                  <motion.div
                                    className="px-3 overflow-hidden"
                                    initial={{ height: 0 }}
                                    animate={{ height: "3.75rem" }}
                                    exit={{ height: 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <div className="pt-2 pb-1 text-xs opacity-60 font-mono space-y-0.5">
                                      {syncProgress.map((line, i) => (
                                        <div key={i}>{line}</div>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}

                                <button
                                  onClick={() => handleWorktreeClick(wt)}
                                  className="w-full px-3 py-1.5 hover:bg-black/10 dark:hover:bg-white/10 text-left group"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <FolderIcon className="w-3.5 h-3.5 opacity-60 shrink-0" />
                                        <span
                                          className={`text-xs truncate ${
                                            isMain ? "font-bold" : ""
                                          }`}
                                        >
                                          {isMain ? "main" : name}
                                        </span>
                                        <span className="text-xs opacity-40">/</span>
                                        <span className="text-xs opacity-60 truncate">
                                          {branchName}
                                        </span>
                                      </div>
                                      {shortHash && (
                                        <div className="text-xs opacity-50 ml-5 truncate font-mono">
                                          {shortHash}
                                          {wt.commitMessage && ` ${wt.commitMessage}`}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                      {isMain && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSync(repo);
                                          }}
                                          className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                          disabled={isSyncing}
                                        >
                                          <ArrowPathIcon className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openInVSCode(wt.path);
                                        }}
                                        className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                      >
                                        <CodeBracketIcon className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openInTerminal(wt.path);
                                        }}
                                        className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                      >
                                        <CommandLineIcon className="w-3.5 h-3.5" />
                                      </button>
                                      {!isMain && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleWorktreeSelection(wt.path);
                                          }}
                                          className={`px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
                                            isSelected ? "text-red-600" : ""
                                          }`}
                                        >
                                          <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              </div>
                            );
                          })}

                          <button
                            onClick={() => onAddWorktree?.(repo)}
                            className="w-full px-3 py-1.5 ml-3 flex items-center gap-2 hover:bg-black/10 dark:hover:bg-white/10 text-left opacity-60 hover:opacity-100"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span className="text-xs">Add worktree</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
