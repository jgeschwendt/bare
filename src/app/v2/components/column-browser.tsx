"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FolderIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  CodeBracketIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
import type { Repository } from "@/lib/types";
import type { Worktree } from "@/lib/types";

interface ColumnBrowserProps {
  repositories: Repository[];
  onRepoSelect: (repo: Repository | undefined) => void;
  onWorktreeSelect?: (worktree: Worktree) => void;
  onAddWorktree?: (repo: Repository) => void;
}

interface GroupedRepos {
  [username: string]: Repository[];
}

export function ColumnBrowser({
  repositories,
  onRepoSelect,
  onWorktreeSelect,
  onAddWorktree,
}: ColumnBrowserProps) {
  const [selectedUsername, setSelectedUsername] = useState<string | undefined>();
  const [selectedRepo, setSelectedRepo] = useState<Repository | undefined>();
  const [selectedWorktree, setSelectedWorktree] = useState<Worktree | undefined>();
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);

  const groupedRepos = useMemo(() => {
    const groups: GroupedRepos = {};
    for (const repo of repositories) {
      const pathParts = repo.path.split("/");
      const githubIndex = pathParts.findIndex((p) => p === "GitHub");
      const username = githubIndex >= 0 ? pathParts[githubIndex + 1] : "unknown";

      if (!groups[username]) groups[username] = [];
      groups[username].push(repo);
    }

    Object.values(groups).forEach((repos) =>
      repos.sort((a, b) => a.name.localeCompare(b.name))
    );

    return groups;
  }, [repositories]);

  const usernames = useMemo(
    () => Object.keys(groupedRepos).sort(),
    [groupedRepos]
  );

  const currentRepos = useMemo(
    () => (selectedUsername ? groupedRepos[selectedUsername] || [] : []),
    [selectedUsername, groupedRepos]
  );

  useEffect(() => {
    const fetchWorktrees = async () => {
      if (!selectedRepo) {
        setWorktrees([]);
        return;
      }

      try {
        const res = await fetch(
          `/api/worktree?repoPath=${encodeURIComponent(selectedRepo.path)}`
        );
        const data = await res.json();
        const wts = data.worktrees || [];

        const mainWorktree = wts.find((wt: Worktree) =>
          wt.path.endsWith("__main__")
        );
        const otherWorktrees = wts
          .filter((wt: Worktree) => !wt.path.endsWith("__main__"))
          .sort((a: Worktree, b: Worktree) => a.path.localeCompare(b.path));

        setWorktrees(mainWorktree ? [mainWorktree, ...otherWorktrees] : otherWorktrees);
      } catch (error) {
        console.error("Failed to fetch worktrees:", error);
        setWorktrees([]);
      }
    };

    fetchWorktrees();
  }, [selectedRepo]);

  const handleUsernameSelect = (username: string) => {
    setSelectedUsername(username);
    setSelectedRepo(undefined);
    setSelectedWorktree(undefined);
    onRepoSelect(undefined);
  };

  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo);
    setSelectedWorktree(undefined);
    onRepoSelect(repo);
  };

  const handleWorktreeClick = (worktree: Worktree) => {
    setSelectedWorktree(worktree);
    if (onWorktreeSelect) onWorktreeSelect(worktree);
  };

  const openInVSCode = (path: string) => {
    window.open(`vscode://file/${path}`, "_blank");
  };

  const openInTerminal = (path: string) => {
    console.log("Open terminal:", path);
  };

  return (
    <div className="flex h-full bg-base-300">
      {/* Column 1: Usernames */}
      <div className="w-64 bg-base-100 border-r border-base-200 flex flex-col">
        <div className="p-3 border-b border-base-200">
          <span className="text-xs font-semibold opacity-60 uppercase tracking-wider">
            Users
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {usernames.map((username) => (
            <button
              key={username}
              onClick={() => handleUsernameSelect(username)}
              className={`w-full px-3 py-2 flex items-center justify-between hover:bg-base-200 text-left ${
                selectedUsername === username ? "bg-primary text-primary-content" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FolderIcon className="w-4 h-4 opacity-60 shrink-0" />
                <span className="text-sm truncate">{username}</span>
              </div>
              {selectedUsername === username && (
                <ChevronRightIcon className="w-4 h-4 opacity-60 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Column 2: Repos */}
      {selectedUsername && (
        <div className="w-64 bg-base-100 border-r border-base-200 flex flex-col">
          <div className="p-3 border-b border-base-200">
            <span className="text-xs font-semibold opacity-60 uppercase tracking-wider">
              Repositories
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {currentRepos.map((repo) => (
              <button
                key={repo.id}
                onClick={() => handleRepoSelect(repo)}
                className={`w-full px-3 py-2 flex items-center justify-between hover:bg-base-200 text-left ${
                  selectedRepo?.id === repo.id ? "bg-primary text-primary-content" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FolderIcon className="w-4 h-4 opacity-60 shrink-0" />
                  <span className="text-sm truncate">{repo.name}</span>
                </div>
                {selectedRepo?.id === repo.id && (
                  <ChevronRightIcon className="w-4 h-4 opacity-60 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Column 3: Worktrees */}
      {selectedRepo && (
        <div className="w-80 bg-base-100 border-r border-base-200 flex flex-col">
          <div className="p-3 border-b border-base-200 flex items-center justify-between">
            <span className="text-xs font-semibold opacity-60 uppercase tracking-wider">
              Worktrees
            </span>
            <button
              onClick={() => onAddWorktree?.(selectedRepo)}
              className="btn btn-ghost btn-xs"
              title="Add worktree"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {worktrees.map((wt) => {
              const name = wt.path.split("/").pop() || "";
              const isMain = name === "__main__";
              const branchName = wt.branch?.replace("refs/heads/", "") || "";
              const shortHash = wt.head?.slice(0, 7);

              return (
                <button
                  key={wt.path}
                  onClick={() => handleWorktreeClick(wt)}
                  className={`w-full px-3 py-2 hover:bg-base-200 text-left group ${
                    selectedWorktree?.path === wt.path ? "bg-base-200" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <FolderIcon className="w-4 h-4 opacity-60 shrink-0" />
                        <span className={`text-sm truncate ${isMain ? "font-bold" : ""}`}>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInVSCode(wt.path);
                        }}
                        className="btn btn-ghost btn-xs"
                        title="Open in VS Code"
                      >
                        <CodeBracketIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInTerminal(wt.path);
                        }}
                        className="btn btn-ghost btn-xs"
                        title="Open in Terminal"
                      >
                        <CommandLineIcon className="w-4 h-4" />
                      </button>
                      {!isMain && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle delete
                          }}
                          className="btn btn-ghost btn-xs"
                          title="Delete worktree"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
