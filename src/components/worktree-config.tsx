"use client";

import { useEffect, useState } from "react";
import type { WorktreeConfig } from "@/lib/worktree-config";

interface WorktreeConfigProps {
  repoPath: string;
}

export function WorktreeConfigComponent({ repoPath }: WorktreeConfigProps) {
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
    return <div className="text-xs text-gray-500">Loading config...</div>;
  }

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Worktree Config</h4>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Edit
          </button>
        )}
      </div>

      {error && (
        <div className="p-2 mb-2 bg-red-50 text-red-700 text-xs rounded">
          {error}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-700">
              Symlink (comma-separated)
            </label>
            <input
              type="text"
              value={symlinkInput}
              onChange={(e) => setSymlinkInput(e.target.value)}
              placeholder=".env, .claude"
              className="w-full px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Files/dirs to symlink from __main__ (shared across worktrees)
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-gray-700">
              Copy (comma-separated)
            </label>
            <input
              type="text"
              value={copyInput}
              onChange={(e) => setCopyInput(e.target.value)}
              placeholder=".env.example"
              className="w-full px-2 py-1 text-xs border rounded focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Files/dirs to copy from __main__ (independent per worktree)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setSymlinkInput((config.symlink || []).join(", "));
                setCopyInput((config.copy || []).join(", "));
                setError(null);
              }}
              className="flex-1 px-2 py-1 text-xs border rounded hover:bg-gray-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div>
            <span className="font-medium text-gray-700">Symlink:</span>{" "}
            <span className="text-gray-600">
              {config.symlink && config.symlink.length > 0
                ? config.symlink.join(", ")
                : "None"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Copy:</span>{" "}
            <span className="text-gray-600">
              {config.copy && config.copy.length > 0
                ? config.copy.join(", ")
                : "None"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
