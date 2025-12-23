"use client";

import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@/ui/dialog";

interface AddRepoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function AddRepoDialog({
  isOpen,
  onClose,
  onComplete,
}: AddRepoDialogProps) {
  const [url, setUrl] = useState("");
  const [targetDir, setTargetDir] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (value: string) => {
    setUrl(value);
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
              onComplete();
            } else if (data.startsWith("ERROR: ")) {
              setError(data.slice(7));
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

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <div className="fixed inset-0 bg-black/50 z-50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <DialogPanel className="bg-white dark:bg-black/90 border border-black/10 dark:border-white/10 rounded-lg shadow-xl w-full max-w-lg p-6">
          <DialogTitle className="font-bold text-lg mb-4">
            Add Repository
          </DialogTitle>

        {!isCloning && progress.length === 0 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-4">
              <label className="block mb-2">
                <span className="text-sm font-medium">Repository URL</span>
              </label>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="git@github.com:user/repo.git"
                className="px-3 py-2 rounded border border-black/20 dark:border-white/20 w-full bg-transparent placeholder-black/40 dark:placeholder-white/40"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2">
                <span className="text-sm font-medium">Directory Name</span>
              </label>
              <input
                type="text"
                required
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder="repo-name"
                className="px-3 py-2 rounded border border-black/20 dark:border-white/20 w-full bg-transparent placeholder-black/40 dark:placeholder-white/40"
              />
              <label className="block mb-2">
                <span className="text-xs text-black/50 dark:text-white/50">Created in ~/GitHub/[username]/</span>
              </label>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 text-red-900 border border-red-200">
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 text-sm rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button type="submit" className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                Clone
              </button>
            </div>
          </form>
        )}

        {(isCloning || progress.length > 0) && (
          <div className="space-y-4">
            <div className="bg-black text-white/90 max-h-80 overflow-y-auto p-3 rounded font-mono text-xs">
              {progress.map((line, i) => (
                <pre key={i} className="text-xs">
                  <code>&gt; {line}</code>
                </pre>
              ))}
              {isCloning && (
                <pre className="text-xs">
                  <code>&gt; Cloning...</code>
                </pre>
              )}
              {error && progress.length > 0 && (
                <pre className="text-red-400 text-xs">
                  <code>✗ {error}</code>
                </pre>
              )}
            </div>

            {!isCloning && (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleClose}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    error
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {error ? "Close" : "Done"}
                </button>
              </div>
            )}
          </div>
        )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
