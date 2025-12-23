"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FolderIcon,
  CodeBracketIcon,
  CommandLineIcon,
  TrashIcon,
  ArrowPathIcon,
  ClockIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import type { Repository } from "@/lib/types";
import type { Worktree } from "@/lib/types";

interface OverviewDashboardProps {
  repositories: Repository[];
}

export function OverviewDashboard({ repositories }: OverviewDashboardProps) {
  const router = useRouter();
  const [repoWorktrees, setRepoWorktrees] = useState<Map<string, Worktree[]>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [worktreeNames, setWorktreeNames] = useState<Map<string, string>>(
    new Map()
  );
  const [creatingWorktrees, setCreatingWorktrees] = useState<
    Map<string, string>
  >(new Map());
  const [syncingWorktrees, setSyncingWorktrees] = useState<Map<string, string>>(
    new Map()
  );
  const [selectedWorktrees, setSelectedWorktrees] = useState<Set<string>>(
    new Set()
  );

  const groupedRepos = useMemo(() => {
    const groups: { [username: string]: Repository[] } = {};
    for (const repo of repositories) {
      const pathParts = repo.path.split("/");
      const githubIndex = pathParts.findIndex((p) => p === "GitHub");
      const username =
        githubIndex >= 0 ? pathParts[githubIndex + 1] : "unknown";

      if (!groups[username]) groups[username] = [];
      groups[username].push(repo);
    }

    // Sort repos by lastSynced within each group
    Object.values(groups).forEach((repos) =>
      repos.sort(
        (a, b) =>
          new Date(b.lastSynced).getTime() - new Date(a.lastSynced).getTime()
      )
    );

    return groups;
  }, [repositories]);

  // Fetch all worktrees for all repos on mount
  useEffect(() => {
    const fetchAllWorktrees = async () => {
      setIsLoading(true);
      const worktreesMap = new Map<string, Worktree[]>();

      await Promise.all(
        repositories.map(async (repo) => {
          try {
            const res = await fetch(
              `/api/worktree?repoPath=${encodeURIComponent(repo.path)}`
            );
            const data = await res.json();
            const wts = data.worktrees || [];

            const mainWorktree = wts.find((wt: Worktree) =>
              wt.path.endsWith("__main__")
            );
            const otherWorktrees = wts
              .filter((wt: Worktree) => !wt.path.endsWith("__main__"))
              .sort((a: Worktree, b: Worktree) => a.path.localeCompare(b.path));

            const sorted = mainWorktree
              ? [mainWorktree, ...otherWorktrees]
              : otherWorktrees;

            worktreesMap.set(repo.id, sorted);
          } catch (error) {
            console.error(`Failed to fetch worktrees for ${repo.name}:`, error);
            worktreesMap.set(repo.id, []);
          }
        })
      );

      setRepoWorktrees(worktreesMap);
      setIsLoading(false);
    };

    if (repositories.length > 0) {
      fetchAllWorktrees();
    } else {
      setIsLoading(false);
    }
  }, [repositories]);

  const openInVSCode = async (path: string) => {
    try {
      await fetch("/api/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, app: "vscode" }),
      });
    } catch (err) {
      console.error("Failed to open in VS Code:", err);
    }
  };

  const openInClaude = async (path: string) => {
    try {
      await fetch("/api/open-with-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
    } catch (err) {
      console.error("Failed to open in Claude:", err);
    }
  };

  const openInTerminal = async (path: string) => {
    try {
      await fetch("/api/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, app: "terminal" }),
      });
    } catch (err) {
      console.error("Failed to open in Terminal:", err);
    }
  };

  const navigateToRepo = (repo: Repository) => {
    const pathParts = repo.path.split("/");
    const githubIndex = pathParts.findIndex((p) => p === "GitHub");
    const username = githubIndex >= 0 ? pathParts[githubIndex + 1] : "unknown";
    router.push(`/v2/${username}/${repo.name}`);
  };

  const handleAddWorktree = async (
    e: React.FormEvent,
    repoPath: string,
    repoId: string
  ) => {
    e.preventDefault();
    const worktreeName = worktreeNames.get(repoId) || "";
    if (!worktreeName.trim()) return;

    // Clear input immediately
    setWorktreeNames((prev) => {
      const next = new Map(prev);
      next.delete(repoId);
      return next;
    });

    const existing = repoWorktrees.get(repoId) || [];
    const mainWorktree = existing.find((wt) => wt.path.endsWith("__main__"));
    const mainHead = mainWorktree?.head || "";

    const tempPath = `${repoPath}/../${worktreeName.trim()}`;
    const placeholderWorktree: Worktree = {
      path: tempPath,
      branch: worktreeName.trim(),
      head: mainHead,
      commitMessage: "Creating...",
    };

    // Add placeholder immediately in sorted position
    setRepoWorktrees((prev) => {
      const existing = prev.get(repoId) || [];
      const mainWorktree = existing.find((wt) => wt.path.endsWith("__main__"));
      const otherWorktrees = existing.filter(
        (wt) => !wt.path.endsWith("__main__")
      );

      // Insert placeholder in sorted position by worktree name
      const allOthers = [...otherWorktrees, placeholderWorktree].sort(
        (a, b) => {
          const nameA = a.path.split("/").pop() || "";
          const nameB = b.path.split("/").pop() || "";
          return nameA.localeCompare(nameB);
        }
      );

      const sorted = mainWorktree ? [mainWorktree, ...allOthers] : allOthers;
      return new Map(prev).set(repoId, sorted);
    });

    setCreatingWorktrees((prev) => new Map(prev).set(tempPath, "Creating..."));

    try {
      const response = await fetch("/api/worktree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoPath,
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
          if (message === "[WORKTREE_CREATED]") {
            // Worktree is ready - fetch real data so buttons work
            const res = await fetch(
              `/api/worktree?repoPath=${encodeURIComponent(repoPath)}`
            );
            const data = await res.json();
            const wts = data.worktrees || [];

            const mainWorktree = wts.find((wt: Worktree) =>
              wt.path.endsWith("__main__")
            );
            const otherWorktrees = wts
              .filter((wt: Worktree) => !wt.path.endsWith("__main__"))
              .sort((a: Worktree, b: Worktree) => a.path.localeCompare(b.path));

            const sorted = mainWorktree
              ? [mainWorktree, ...otherWorktrees]
              : otherWorktrees;

            setRepoWorktrees((prev) => new Map(prev).set(repoId, sorted));
          } else if (message === "[DONE]") {
            // Installation complete - clear creating state
            setTimeout(() => {
              setCreatingWorktrees((prev) => {
                const next = new Map(prev);
                next.delete(tempPath);
                return next;
              });
            }, 500);
          } else if (!message.startsWith("ERROR:")) {
            setCreatingWorktrees((prev) =>
              new Map(prev).set(tempPath, message)
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to create worktree:", err);
      setCreatingWorktrees((prev) => {
        const next = new Map(prev);
        next.delete(tempPath);
        return next;
      });
    }
  };

  const handleSyncMain = async (
    repoPath: string,
    repoId: string,
    mainPath: string
  ) => {
    setSyncingWorktrees((prev) => new Map(prev).set(mainPath, "Syncing..."));

    try {
      const response = await fetch("/api/worktree", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoPath,
          action: "sync-main",
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
            // Refresh worktrees for this repo
            const res = await fetch(
              `/api/worktree?repoPath=${encodeURIComponent(repoPath)}`
            );
            const data = await res.json();
            const wts = data.worktrees || [];

            const mainWorktree = wts.find((wt: Worktree) =>
              wt.path.endsWith("__main__")
            );
            const otherWorktrees = wts
              .filter((wt: Worktree) => !wt.path.endsWith("__main__"))
              .sort((a: Worktree, b: Worktree) => a.path.localeCompare(b.path));

            const sorted = mainWorktree
              ? [mainWorktree, ...otherWorktrees]
              : otherWorktrees;

            setTimeout(async () => {
              setRepoWorktrees((prev) => new Map(prev).set(repoId, sorted));
              setSyncingWorktrees((prev) => {
                const next = new Map(prev);
                next.delete(mainPath);
                return next;
              });

              // Update lastSynced in registry
              await fetch(`/api/repos?id=${encodeURIComponent(repoId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
              });

              // Refresh to get updated data
              router.refresh();
            }, 500);
          } else if (!message.startsWith("ERROR:")) {
            setSyncingWorktrees((prev) => new Map(prev).set(mainPath, message));
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync main:", err);
      setSyncingWorktrees((prev) => {
        const next = new Map(prev);
        next.delete(mainPath);
        return next;
      });
    }
  };

  const handleDeleteSelected = async (repoPath: string, repoId: string) => {
    if (selectedWorktrees.size === 0) return;

    const worktrees = repoWorktrees.get(repoId) || [];
    const repoWorktreePaths = new Set(worktrees.map((wt) => wt.path));

    // Only delete worktrees that belong to this repository
    const toDelete = Array.from(selectedWorktrees).filter((path) =>
      repoWorktreePaths.has(path)
    );

    if (toDelete.length === 0) return;

    // Delete in parallel
    await Promise.all(
      toDelete.map(async (wtPath) => {
        const wt = worktrees.find((w) => w.path === wtPath);
        if (!wt) return;

        const name = wt.path.split("/").pop() || "";
        if (name === "__main__") return;

        try {
          await fetch(
            `/api/worktree?repoPath=${encodeURIComponent(
              repoPath
            )}&worktreeName=${encodeURIComponent(name)}`,
            { method: "DELETE" }
          );
        } catch (err) {
          console.error(`Failed to delete ${name}:`, err);
        }
      })
    );

    // Refresh worktrees
    const res = await fetch(
      `/api/worktree?repoPath=${encodeURIComponent(repoPath)}`
    );
    const data = await res.json();
    const wts = data.worktrees || [];

    const mainWorktree = wts.find((wt: Worktree) =>
      wt.path.endsWith("__main__")
    );
    const otherWorktrees = wts
      .filter((wt: Worktree) => !wt.path.endsWith("__main__"))
      .sort((a: Worktree, b: Worktree) => a.path.localeCompare(b.path));

    const sorted = mainWorktree
      ? [mainWorktree, ...otherWorktrees]
      : otherWorktrees;
    setRepoWorktrees((prev) => new Map(prev).set(repoId, sorted));

    // Clear selections for deleted worktrees
    setSelectedWorktrees((prev) => {
      const next = new Set(prev);
      toDelete.forEach((path) => next.delete(path));
      return next;
    });
  };

  const toggleWorktreeSelection = (wtPath: string) => {
    setSelectedWorktrees((prev) => {
      const next = new Set(prev);
      if (next.has(wtPath)) {
        next.delete(wtPath);
      } else {
        next.add(wtPath);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="text-sm opacity-60 mt-4">Loading repositories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="px-5 pb-10 w-full">
        <table className="table w-full bg-transparent">
          <colgroup>
            <col style={{ width: "1%" }} />
            <col style={{ width: "1%" }} />
            <col style={{ width: "1%" }} />
            <col style={{ width: "1%" }} />
            <col style={{ width: "1%" }} />
            <col style={{ width: "auto" }} />
            <col style={{ width: "1%" }} />
          </colgroup>
          <tbody>
            {Object.entries(groupedRepos).map(([username, repos]) => (
              <React.Fragment key={username}>
                <tr key={`${username}-header`}>
                  <td
                    colSpan={7}
                    className="p-4 border-b-2 border-black/10 dark:border-white/10"
                  >
                    <h2 className="font-bold opacity-80">{username}</h2>
                  </td>
                </tr>
                {repos.map((repo) => {
                  const worktrees = repoWorktrees.get(repo.id) || [];

                  return (
                    <React.Fragment key={repo.id}>
                      <tr
                        className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                        onClick={() => navigateToRepo(repo)}
                      >
                        <td colSpan={7} className="py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1 px-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-xs font-semibold truncate">
                                    {repo.name}
                                  </h3>
                                  {repo.type && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                                      {repo.type}
                                    </span>
                                  )}
                                  {repo.remoteUrl && (
                                    <span className="text-xs text-black/50 dark:text-white/50 truncate font-mono">
                                      {repo.remoteUrl}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center shrink-0 px-1">
                              <div className="flex mr-2 items-center gap-1.5 text-xs text-black/50 dark:text-white/50">
                                <ClockIcon className="w-3.5 h-3.5" />
                                <span>{formatDate(repo.lastSynced)}</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInVSCode(repo.path);
                                }}
                                className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                title="Open in VS Code"
                              >
                                <CodeBracketIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInTerminal(repo.path);
                                }}
                                className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                title="Open in Terminal"
                              >
                                <CommandLineIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToRepo(repo);
                                }}
                                className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                title="View Details"
                              >
                                <ChevronRightIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr className="bg-black/5 dark:bg-white/5">
                        <td colSpan={7} className="p-3">
                          <div className="flex items-center gap-3">
                            <form
                              onSubmit={(e) =>
                                handleAddWorktree(e, repo.path, repo.id)
                              }
                              className="flex-1"
                            >
                              <input
                                type="text"
                                placeholder="feature/new-branch"
                                className="px-2.5 py-1.5 text-sm border border-black/20 dark:border-white/20 rounded w-full bg-transparent placeholder-black/40 dark:placeholder-white/40"
                                value={worktreeNames.get(repo.id) || ""}
                                onChange={(e) =>
                                  setWorktreeNames((prev) =>
                                    new Map(prev).set(repo.id, e.target.value)
                                  )
                                }
                              />
                            </form>
                            {(() => {
                              const repoWorktreePaths = new Set(
                                worktrees.map((wt) => wt.path)
                              );
                              const selectedInThisRepo = Array.from(
                                selectedWorktrees
                              ).filter((path) => repoWorktreePaths.has(path));
                              return (
                                selectedInThisRepo.length > 0 && (
                                  <button
                                    onClick={() =>
                                      handleDeleteSelected(repo.path, repo.id)
                                    }
                                    className="px-2.5 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                    Delete {selectedInThisRepo.length}
                                  </button>
                                )
                              );
                            })()}
                          </div>
                        </td>
                      </tr>

                      {worktrees.map((wt) => {
                        const name = wt.path.split("/").pop() || "";
                        const isMain = name === "__main__";
                        const branchName =
                          wt.branch?.replace("refs/heads/", "") || "";
                        const shortHash = wt.head?.slice(0, 7);
                        const progressMessage =
                          creatingWorktrees.get(wt.path) ||
                          syncingWorktrees.get(wt.path);

                        return (
                          <tr
                            key={wt.path}
                            className="hover:bg-black/5 dark:hover:bg-white/5 text-[10px] leading-[1.2]"
                          >
                            <td
                              className={`pl-4 p-1 whitespace-nowrap ${
                                isMain ? "font-bold" : ""
                              }`}
                            >
                              {isMain ? "main" : name}
                            </td>
                            <td className="text-black/30 dark:text-white/30 p-1 whitespace-nowrap">
                              /
                            </td>
                            <td className="text-black/60 dark:text-white/60 p-1 whitespace-nowrap">
                              {branchName}
                            </td>
                            <td className="text-black/30 dark:text-white/30 p-1 whitespace-nowrap">
                              /
                            </td>
                            <td className="text-black/50 dark:text-white/50 font-mono p-1 whitespace-nowrap">
                              {shortHash || ""}
                            </td>
                            <td className="text-black/50 dark:text-white/50 whitespace-nowrap pl-4">
                              {progressMessage || wt.commitMessage || ""}
                            </td>
                            <td className="p-1">
                              <div className="flex items-center">
                                {isMain && (
                                  <button
                                    onClick={() =>
                                      handleSyncMain(
                                        repo.path,
                                        repo.id,
                                        wt.path
                                      )
                                    }
                                    className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    title="Sync main"
                                  >
                                    <ArrowPathIcon className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openInClaude(wt.path)}
                                  className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                  title="Open in Claude"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <g transform="translate(12,12)">
                                      <rect
                                        x="-1.5"
                                        y="-10"
                                        width="3"
                                        height="8"
                                        rx="1.5"
                                      />
                                      <rect
                                        x="-1.5"
                                        y="-10"
                                        width="3"
                                        height="8"
                                        rx="1.5"
                                        transform="rotate(45)"
                                      />
                                      <rect
                                        x="-1.5"
                                        y="-10"
                                        width="3"
                                        height="8"
                                        rx="1.5"
                                        transform="rotate(90)"
                                      />
                                      <rect
                                        x="-1.5"
                                        y="-10"
                                        width="3"
                                        height="8"
                                        rx="1.5"
                                        transform="rotate(135)"
                                      />
                                      <rect
                                        x="-1.5"
                                        y="-10"
                                        width="3"
                                        height="8"
                                        rx="1.5"
                                        transform="rotate(180)"
                                      />
                                      <rect
                                        x="-1.5"
                                        y="-10"
                                        width="3"
                                        height="8"
                                        rx="1.5"
                                        transform="rotate(225)"
                                      />
                                      <rect
                                        x="-1.5"
                                        y="-10"
                                        width="3"
                                        height="8"
                                        rx="1.5"
                                        transform="rotate(270)"
                                      />
                                      <rect
                                        x="-1.5"
                                        y="-10"
                                        width="3"
                                        height="8"
                                        rx="1.5"
                                        transform="rotate(315)"
                                      />
                                    </g>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openInVSCode(wt.path)}
                                  className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                  title="Open in VS Code"
                                >
                                  <CodeBracketIcon className="w-4 h-4" />
                                </button>
                                {!isMain && (
                                  <button
                                    onClick={() =>
                                      toggleWorktreeSelection(wt.path)
                                    }
                                    className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                    title="Delete worktree"
                                  >
                                    <TrashIcon
                                      className={`w-4 h-4 ${
                                        selectedWorktrees.has(wt.path)
                                          ? "text-red-500"
                                          : ""
                                      }`}
                                    />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}

            {repositories.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 opacity-60">
                  <FolderIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No repositories found</p>
                  <p className="text-sm mt-2">
                    Click "Add Repo" to get started
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
