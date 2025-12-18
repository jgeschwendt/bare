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

    // Sort repos within each group by lastAccessed
    for (const repos of groups.values()) {
      repos.sort((a, b) =>
        new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime()
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
      case "turborepo": return "badge-primary";
      case "nx": return "badge-secondary";
      case "lerna": return "badge-accent";
      case "workspace": return "badge-info";
      default: return "badge-ghost";
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
                  className="card bg-base-100 shadow hover:shadow-lg transition-shadow text-left"
                >
                  <div className="card-body p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FolderIcon className="w-5 h-5 opacity-60 shrink-0" />
                        <h3 className="font-semibold truncate">{repo.name}</h3>
                      </div>
                      {repo.type && (
                        <span className={`badge badge-sm ${getTypeColor(repo.type)}`}>
                          {repo.type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs opacity-60 mt-2">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>{formatDate(repo.lastAccessed)}</span>
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
