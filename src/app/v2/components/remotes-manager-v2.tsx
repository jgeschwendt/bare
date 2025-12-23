"use client";

import { useEffect, useState } from "react";
import type { Remote } from "@/lib/git";
import type { WorktreeConfig } from "@/lib/worktree-config";

interface RemotesManagerV2Props {
  repoPath: string;
}

export function RemotesManagerV2({ repoPath }: RemotesManagerV2Props) {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [config, setConfig] = useState<WorktreeConfig>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState("");
  const [newRemoteUrl, setNewRemoteUrl] = useState("");

  useEffect(() => {
    fetchData();
  }, [repoPath]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [remotesRes, configRes] = await Promise.all([
        fetch(`/api/remotes?repoPath=${encodeURIComponent(repoPath)}`),
        fetch(`/api/worktree-config?repoPath=${encodeURIComponent(repoPath)}`),
      ]);

      if (!remotesRes.ok) throw new Error("Failed to fetch remotes");
      if (!configRes.ok) throw new Error("Failed to fetch config");

      const remotesData = await remotesRes.json();
      const configData = await configRes.json();

      setRemotes(remotesData.remotes || []);
      setConfig(configData.config || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRemote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch("/api/remotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoPath,
          name: newRemoteName,
          url: newRemoteUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add remote");
      }

      setNewRemoteName("");
      setNewRemoteUrl("");
      setIsAdding(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add remote");
    }
  };

  const handleRemoveRemote = async (name: string) => {
    if (!confirm(`Remove remote "${name}"?`)) return;

    try {
      const response = await fetch(
        `/api/remotes?repoPath=${encodeURIComponent(repoPath)}&name=${encodeURIComponent(name)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove remote");
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove remote");
    }
  };

  const handleSetUpstream = async (name: string) => {
    try {
      const newConfig = { ...config, upstreamRemote: name };

      const response = await fetch("/api/worktree-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoPath, config: newConfig }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set upstream");
      }

      setConfig(newConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set upstream");
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg shadow-lg bg-white dark:bg-black/90 border border-black/10 dark:border-white/10">
        <div className="p-6">
          <div className="text-sm opacity-60">Loading remotes...</div>
        </div>
      </div>
    );
  }

  const upstreamRemote = config.upstreamRemote || "origin";

  return (
    <div className="rounded-lg shadow-lg bg-white dark:bg-black/90 border border-black/10 dark:border-white/10">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold mb-4">Git Remotes</h2>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-2.5 py-1.5 text-sm rounded border border-black/20 dark:border-white/20 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              + Add Remote
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-900 border border-red-200">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {isAdding && (
          <form onSubmit={handleAddRemote} className="space-y-4 pt-4">
            <div className="mb-4">
              <label className="block mb-2">
                <span className="text-sm font-medium">Name</span>
              </label>
              <input
                type="text"
                required
                value={newRemoteName}
                onChange={(e) => setNewRemoteName(e.target.value)}
                placeholder="upstream"
                className="px-2.5 py-1.5 text-sm rounded border border-black/20 dark:border-white/20 w-full bg-transparent placeholder-black/40 dark:placeholder-white/40"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2">
                <span className="text-sm font-medium">URL</span>
              </label>
              <input
                type="text"
                required
                value={newRemoteUrl}
                onChange={(e) => setNewRemoteUrl(e.target.value)}
                placeholder="https://github.com/owner/repo.git"
                className="px-2.5 py-1.5 text-sm rounded border border-black/20 dark:border-white/20 w-full bg-transparent placeholder-black/40 dark:placeholder-white/40"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewRemoteName("");
                  setNewRemoteUrl("");
                }}
                className="px-2.5 py-1.5 text-sm rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10 flex-1"
              >
                Cancel
              </button>
              <button type="submit" className="px-2.5 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-1">
                Add
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2 pt-4">
          {remotes.length === 0 ? (
            <p className="text-sm opacity-60">No remotes</p>
          ) : (
            remotes.map((remote) => (
              <div
                key={remote.name}
                className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{remote.name}</span>
                    {remote.name === upstreamRemote && (
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">base</span>
                    )}
                  </div>
                  <div className="text-sm opacity-60 truncate font-mono">
                    {remote.url}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  {remote.name !== upstreamRemote && (
                    <button
                      onClick={() => handleSetUpstream(remote.name)}
                      className="px-2 py-1 text-xs rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      title="Set as base for worktrees"
                    >
                      Set Base
                    </button>
                  )}
                  {remote.name !== "origin" && (
                    <button
                      onClick={() => handleRemoveRemote(remote.name)}
                      className="px-2 py-1 text-xs rounded text-red-600 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-sm opacity-60 pt-2">
          Worktrees branch from <span className="font-medium">{upstreamRemote}/main</span>
        </p>
      </div>
    </div>
  );
}
