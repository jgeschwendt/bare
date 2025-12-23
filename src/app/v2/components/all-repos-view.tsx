"use client";

import { useMemo } from "react";
import { FolderIcon, ClockIcon } from "@heroicons/react/24/outline";
import type { Repository } from "@/lib/types";

interface AllReposViewProps {
  repositories: Repository[];
  onRepoSelect: (repo: Repository) => void;
}

export function AllReposView({ repositories, onRepoSelect }: AllReposViewProps) {
  // Group repos by username
  const groupedRepos = useMemo(() => {
    const groups = new Map<string, Repository[]>();

    for (const repo of repositories) {
      // Extract username from path: ~/GitHub/{username}/{repo}
      const pathParts = repo.path.split("/");
      const githubIndex = pathParts.findIndex(p => p === "GitHub");
      const username = githubIndex >= 0 ? pathParts[githubIndex + 1] : "unknown";

      if (!groups.has(username)) {
        groups.set(username, []);
      }
      groups.get(username)!.push(repo);
    }

    // Sort repos within each group by lastSynced
    for (const repos of groups.values()) {
      repos.sort((a, b) =>
        new Date(b.lastSynced).getTime() - new Date(a.lastSynced).getTime()
      );
    }

    return groups;
  }, [repositories]);

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

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "turborepo": return "bg-blue-100 text-blue-800";
      case "nx": return "bg-purple-100 text-purple-800";
      case "lerna": return "bg-pink-100 text-pink-800";
      case "workspace": return "bg-cyan-100 text-cyan-800";
      default: return "bg-black/10 dark:bg-white/10";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="space-y-12">
        {Array.from(groupedRepos.entries()).map(([username, repos]) => (
          <div key={username}>
            <h2 className="text-2xl font-bold mb-6 opacity-80">{username}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => onRepoSelect(repo)}
                  className="rounded-lg shadow hover:shadow-lg transition-shadow text-left bg-white dark:bg-black/90 border border-black/10 dark:border-white/10"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FolderIcon className="w-5 h-5 opacity-60 shrink-0" />
                        <h3 className="font-semibold truncate">{repo.name}</h3>
                      </div>
                      {repo.type && (
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getTypeColor(repo.type)}`}>
                          {repo.type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs opacity-60 mt-2">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>{formatDate(repo.lastSynced)}</span>
                    </div>

                    {repo.remoteUrl && (
                      <div className="text-xs opacity-50 mt-1 truncate font-mono">
                        {repo.remoteUrl}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        {repositories.length === 0 && (
          <div className="text-center py-12 opacity-60">
            <FolderIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No repositories found</p>
            <p className="text-sm mt-2">Click "Add Repo" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
