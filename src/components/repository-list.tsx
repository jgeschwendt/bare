"use client";

import { useState } from "react";
import type { Repository } from "@/lib/types";
import { RepositoryCard } from "./repository-card";

interface RepositoryListProps {
  initialRepositories: Repository[];
}

export function RepositoryList({
  initialRepositories,
}: RepositoryListProps) {
  const [repositories, setRepositories] =
    useState<Repository[]>(initialRepositories);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/repos?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete repository");
      }

      setRepositories(repositories.filter((repo) => repo.id !== id));
    } catch (error) {
      console.error("Error deleting repository:", error);
      alert("Failed to delete repository");
    }
  };

  if (repositories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No repositories yet.</p>
        <p className="text-sm mt-2">Add a repository to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {repositories.map((repo) => (
        <RepositoryCard
          key={repo.id}
          repository={repo}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
