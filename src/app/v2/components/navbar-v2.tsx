"use client";

import type { Repository } from "@/lib/types";

interface NavbarV2Props {
  repositories: Repository[];
  onAddRepo: () => void;
}

export function NavbarV2({ repositories, onAddRepo }: NavbarV2Props) {
  const repoCount = repositories.length;

  return (
    <nav className="navbar bg-base-300 border-b border-base-100 min-h-12 h-12 px-3">
      <div className="flex-1 flex items-center gap-3">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23 2.5L12 21.5L1 2.5H23Z" />
        </svg>

        <svg className="h-5 opacity-50" viewBox="0 0 15 24" fill="currentColor">
          <path d="M13.5 2.5L2.5 21.5H1L12 2.5H13.5Z" />
        </svg>

        <span className="text-sm font-medium">
          {repoCount === 0
            ? "No repositories"
            : `${repoCount} ${repoCount === 1 ? "repository" : "repositories"}`}
        </span>
      </div>

      <button onClick={onAddRepo} className="btn btn-sm btn-outline">
        + Add Repo
      </button>
    </nav>
  );
}
