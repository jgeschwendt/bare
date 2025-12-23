"use client";

import { useEffect, useState } from "react";
import type { WorktreeConfig } from "@/lib/worktree-config";

interface WorktreeConfigV2Props {
  repoPath: string;
}

export function WorktreeConfigV2({ repoPath }: WorktreeConfigV2Props) {
  const [config, setConfig] = useState<WorktreeConfig>({ symlink: [], copy: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symlinkInput, setSymlinkInput] = useState("");
  const [copyInput, setCopyInput] = useState("");

  useEffect(() => {
    fetchConfig();
  }, [repoPath]);

  const fetchConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/worktree-config?repoPath=${encodeURIComponent(repoPath)}`
      );
      if (!response.ok) throw new Error("Failed to fetch config");
      const data = await response.json();
      setConfig(data.config || { symlink: [], copy: [] });
      setSymlinkInput((data.config?.symlink || []).join(", "));
      setCopyInput((data.config?.copy || []).join(", "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const newConfig: WorktreeConfig = {
        symlink: symlinkInput
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
        copy: copyInput
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      };

      const response = await fetch("/api/worktree-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoPath, config: newConfig }),
      });

      if (!response.ok) throw new Error("Failed to save config");

      setConfig(newConfig);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save config");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg shadow-lg bg-white dark:bg-black/90 border border-black/10 dark:border-white/10">
        <div className="p-6">
          <div className="text-sm opacity-60">Loading config...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow-lg bg-white dark:bg-black/90 border border-black/10 dark:border-white/10">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold mb-4">Worktree File Config</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1.5 text-sm rounded border border-black/20 dark:border-white/20 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 text-red-900 border border-red-200">
            <span className="text-sm">{error}</span>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4 pt-4">
            <div className="mb-4">
              <label className="block mb-2">
                <span className="text-sm font-medium">Symlink (comma-separated)</span>
              </label>
              <input
                type="text"
                value={symlinkInput}
                onChange={(e) => setSymlinkInput(e.target.value)}
                placeholder=".env, .claude"
                className="px-2.5 py-1.5 text-sm rounded border border-black/20 dark:border-white/20 w-full bg-transparent placeholder-black/40 dark:placeholder-white/40"
              />
              <label className="block mb-2">
                <span className="text-xs opacity-60">
                  Files/dirs to symlink from __main__ (shared across worktrees)
                </span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block mb-2">
                <span className="text-sm font-medium">Copy (comma-separated)</span>
              </label>
              <input
                type="text"
                value={copyInput}
                onChange={(e) => setCopyInput(e.target.value)}
                placeholder=".env.example"
                className="px-2.5 py-1.5 text-sm rounded border border-black/20 dark:border-white/20 w-full bg-transparent placeholder-black/40 dark:placeholder-white/40"
              />
              <label className="block mb-2">
                <span className="text-xs opacity-60">
                  Files/dirs to copy from __main__ (independent per worktree)
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSymlinkInput((config.symlink || []).join(", "));
                  setCopyInput((config.copy || []).join(", "));
                  setError(null);
                }}
                className="px-2.5 py-1.5 text-sm rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10 flex-1"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-2.5 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex-1"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-4">
            <div>
              <span className="font-medium">Symlink:</span>{" "}
              <span className="opacity-60">
                {config.symlink && config.symlink.length > 0
                  ? config.symlink.join(", ")
                  : "None"}
              </span>
            </div>
            <div>
              <span className="font-medium">Copy:</span>{" "}
              <span className="opacity-60">
                {config.copy && config.copy.length > 0
                  ? config.copy.join(", ")
                  : "None"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
