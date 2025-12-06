"use client";

import type { Repository } from "@/lib/types";
import { WorktreeList } from "./worktree-list";
import { WorktreeConfigComponent } from "./worktree-config";
import { RemotesManager } from "./remotes-manager";

interface RepositoryCardProps {
  repository: Repository;
  onDelete?: (id: string) => void;
}

export function RepositoryCard({ repository, onDelete }: RepositoryCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:border-gray-400 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{repository.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{repository.path}</p>
          {repository.remoteUrl && (
            <p className="text-xs text-gray-500 mt-1">{repository.remoteUrl}</p>
          )}
          {repository.type && (
            <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              {repository.type}
            </span>
          )}

          <RemotesManager repoPath={repository.path} />
          <WorktreeConfigComponent repoPath={repository.path} />
          <WorktreeList repoPath={repository.path} />
        </div>
        <div className="flex gap-2">
          {onDelete && (
            <button
              onClick={() => onDelete(repository.id)}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
