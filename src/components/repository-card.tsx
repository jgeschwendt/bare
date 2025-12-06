"use client";

import { useState } from "react";
import type { Repository } from "@/lib/types";
import { WorktreeList } from "./worktree-list";
import { WorktreeConfigComponent } from "./worktree-config";
import { RemotesManager } from "./remotes-manager";

interface RepositoryCardProps {
  repository: Repository;
  onDelete?: (id: string) => void;
}

export function RepositoryCard({ repository, onDelete }: RepositoryCardProps) {
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async (app: "vscode" | "terminal") => {
    setError(null);
    try {
      const response = await fetch("/api/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: repository.path, app }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to open in ${app}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to open in ${app}`);
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:border-gray-400 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold">{repository.name}</h3>
            <button
              onClick={() => handleOpen("vscode")}
              className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded"
              title="Open .bare directory in VS Code"
            >
              Code
            </button>
            <button
              onClick={() => handleOpen("terminal")}
              className="px-2 py-0.5 text-xs text-green-600 hover:bg-green-50 rounded"
              title="Open .bare directory in Terminal"
            >
              Terminal
            </button>
          </div>
          <p className="text-sm text-gray-600">{repository.path}</p>
          {repository.remoteUrl && (
            <p className="text-xs text-gray-500 mt-1">{repository.remoteUrl}</p>
          )}
          {repository.type && (
            <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              {repository.type}
            </span>
          )}
          {error && (
            <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded">
              {error}
            </div>
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
