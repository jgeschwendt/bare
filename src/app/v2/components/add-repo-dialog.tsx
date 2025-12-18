"use client";

import { useState } from "react";

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

  if (!isOpen) return null;

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box w-full max-w-lg">
        <h3 className="font-bold text-lg mb-4">Add Repository</h3>

        {!isCloning && progress.length === 0 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Repository URL</span>
              </label>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="git@github.com:user/repo.git"
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Directory Name</span>
              </label>
              <input
                type="text"
                required
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder="repo-name"
                className="input input-bordered w-full"
              />
              <label className="label">
                <span className="label-text-alt">Created in ~/GitHub/[username]/</span>
              </label>
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            <div className="modal-action">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Clone
              </button>
            </div>
          </form>
        )}

        {(isCloning || progress.length > 0) && (
          <div className="space-y-4">
            <div className="mockup-code max-h-80 overflow-y-auto">
              {progress.map((line, i) => (
                <pre key={i} data-prefix=">" className="text-xs">
                  <code>{line}</code>
                </pre>
              ))}
              {isCloning && (
                <pre data-prefix=">" className="text-xs">
                  <code>Cloning...</code>
                </pre>
              )}
              {error && progress.length > 0 && (
                <pre data-prefix="✗" className="text-error text-xs">
                  <code>{error}</code>
                </pre>
              )}
            </div>

            {!isCloning && (
              <div className="modal-action">
                <button
                  onClick={handleClose}
                  className={`btn ${error ? "btn-error" : "btn-success"}`}
                >
                  {error ? "Close" : "Done"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
