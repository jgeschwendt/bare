"use client";

import { useState } from "react";

interface CloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function CloneDialog({ isOpen, onClose, onComplete }: CloneDialogProps) {
  const [url, setUrl] = useState("");
  const [targetDir, setTargetDir] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    // Auto-fill target directory from URL
    if (!targetDir || targetDir === url.split("/").pop()?.replace(".git", "")) {
      setTargetDir(value.split("/").pop()?.replace(".git", "") || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCloning(true);
    setProgress([]);
    setError(null);

    try {
      const response = await fetch("/api/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, targetDir }),
      });

      if (!response.ok) {
        throw new Error("Clone failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setIsCloning(false);
              // Trigger refresh immediately so new repo appears
              onComplete();
            } else if (data.startsWith("ERROR: ")) {
              setError(data.slice(7)); // Remove "ERROR: " prefix
              setIsCloning(false);
            } else {
              setProgress((prev) => [...prev, data]);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clone failed");
      setIsCloning(false);
    }
  };

  const handleClose = () => {
    if (!isCloning) {
      setUrl("");
      setTargetDir("");
      setProgress([]);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Clone Repository</h2>

        {!isCloning && progress.length === 0 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Repository URL *
              </label>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="git@github.com:username/repo.git or https://github.com/username/repo.git"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Target Directory *
              </label>
              <input
                type="text"
                required
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder="repo-name"
                className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be created in ~/GitHub/[username]/ (extracted from URL)
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Clone Repository
              </button>
            </div>
          </form>
        )}

        {(isCloning || progress.length > 0) && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {progress.map((line, i) => (
                <div key={i} className="text-gray-700">
                  {line}
                </div>
              ))}
              {isCloning && (
                <div className="text-blue-600 animate-pulse">Cloning...</div>
              )}
              {error && progress.length > 0 && (
                <div className="text-red-600 font-semibold mt-2">
                  Error: {error}
                </div>
              )}
            </div>

            {!isCloning && (
              <button
                onClick={handleClose}
                className={`w-full px-4 py-2 text-white rounded ${
                  error
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {error ? "Close" : "Done"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
