"use client";

import { useState } from "react";

interface AddRepositoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (repo: {
    name: string;
    path: string;
    remoteUrl?: string;
    type?: string;
  }) => void;
}

export function AddRepositoryDialog({
  isOpen,
  onClose,
  onAdd,
}: AddRepositoryDialogProps) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [type, setType] = useState<string>("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePathChange = (value: string) => {
    setPath(value);
    // Auto-fill name from path
    if (!name || name === path.split("/").pop()) {
      setName(value.split("/").pop() || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onAdd({
        name,
        path,
        remoteUrl: remoteUrl || undefined,
        type: type || undefined,
      });

      // Reset form
      setPath("");
      setName("");
      setRemoteUrl("");
      setType("standard");
      onClose();
    } catch (error) {
      console.error("Failed to add repository:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Add Repository</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Repository Path *
            </label>
            <input
              type="text"
              required
              value={path}
              onChange={(e) => handlePathChange(e.target.value)}
              placeholder="/Users/username/projects/my-repo"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-repo"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Remote URL (optional)
            </label>
            <input
              type="text"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="git@github.com:username/repo.git"
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="standard">Standard</option>
              <option value="turborepo">Turborepo</option>
              <option value="nx">Nx</option>
              <option value="lerna">Lerna</option>
              <option value="workspace">Workspace</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Repository"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
