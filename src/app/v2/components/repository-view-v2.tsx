"use client";

import type { Repository } from "@/lib/types";
import { RemotesManagerV2 } from "./remotes-manager-v2";
import { WorktreeConfigV2 } from "./worktree-config-v2";

interface RepositoryViewV2Props {
  repository?: Repository;
}

export function RepositoryViewV2({ repository }: RepositoryViewV2Props) {
  if (!repository) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm opacity-60">No repository selected</p>
        <p className="text-xs opacity-40 mt-1">
          Select a repository from the navbar or add a new one
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg shadow-lg bg-white">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">Repository Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="opacity-60">Name</span>
              <span>{repository.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Path</span>
              <span className="font-mono text-xs">{repository.path}</span>
            </div>
            {repository.remoteUrl && (
              <div className="flex justify-between">
                <span className="opacity-60">Remote</span>
                <span className="font-mono text-xs">{repository.remoteUrl}</span>
              </div>
            )}
            {repository.type && (
              <div className="flex justify-between">
                <span className="opacity-60">Type</span>
                <span>{repository.type}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <RemotesManagerV2 repoPath={repository.path} />

      <WorktreeConfigV2 repoPath={repository.path} />
    </div>
  );
}
