"use client";

import { useEffect, useState } from "react";
import type { Remote } from "@/lib/git";
import type { WorktreeConfig } from "@/lib/worktree-config";

interface RemotesManagerProps {
  repoPath: string;
}

export function RemotesManager({ repoPath }: RemotesManagerProps) {
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
    return <div className="text-xs text-gray-500">Loading remotes...</div>;
  }

  const upstreamRemote = config.upstreamRemote || "origin";

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Git Remotes</h4>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            + Add Remote
          </button>
        )}
      </div>

      {error && (
        <div className="p-2 mb-2 bg-red-50 text-red-700 text-xs rounded">
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAddRemote} className="mb-3 p-2 bg-white border rounded">
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input
                type="text"
                required
                value={newRemoteName}
                onChange={(e) => setNewRemoteName(e.target.value)}
                placeholder="upstream"
                className="w-full px-2 py-1 text-xs border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">URL</label>
              <input
                type="text"
                required
                value={newRemoteUrl}
                onChange={(e) => setNewRemoteUrl(e.target.value)}
                placeholder="https://github.com/owner/repo.git"
                className="w-full px-2 py-1 text-xs border rounded"
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
                className="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-1">
        {remotes.length === 0 ? (
          <p className="text-xs text-gray-500">No remotes</p>
        ) : (
          remotes.map((remote) => (
            <div
              key={remote.name}
              className="flex items-center justify-between p-2 bg-white border rounded text-xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{remote.name}</span>
                  {remote.name === upstreamRemote && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      base
                    </span>
                  )}
                </div>
                <div className="text-gray-600 truncate">{remote.url}</div>
              </div>
              <div className="flex gap-1 ml-2">
                {remote.name !== upstreamRemote && (
                  <button
                    onClick={() => handleSetUpstream(remote.name)}
                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded whitespace-nowrap"
                    title="Set as base for worktrees"
                  >
                    Set Base
                  </button>
                )}
                {remote.name !== "origin" && (
                  <button
                    onClick={() => handleRemoveRemote(remote.name)}
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Worktrees branch from <span className="font-medium">{upstreamRemote}/main</span>
      </p>
    </div>
  );
}
