"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Repository } from "@/lib/types";
import { WorktreeSidebar } from "@/app/v2/components/worktree-sidebar";
import { RepositoryViewV2 } from "@/app/v2/components/repository-view-v2";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";

interface RepoDetailViewProps {
  repository: Repository;
}

export function RepoDetailView({ repository }: RepoDetailViewProps) {
  const router = useRouter();

  const extractUsername = (path: string): string => {
    const pathParts = path.split("/");
    const githubIndex = pathParts.findIndex((p) => p === "GitHub");
    return githubIndex >= 0 ? pathParts[githubIndex + 1] : "unknown";
  };

  const username = extractUsername(repository.path);

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 min-h-12 h-12 px-3 flex items-center">
        <div className="w-full flex items-center gap-3">
          <Link
            href="/v2"
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Back to overview"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </Link>

          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23 2.5L12 21.5L1 2.5H23Z" />
          </svg>

          <svg className="h-5 opacity-50" viewBox="0 0 15 24" fill="currentColor">
            <path d="M13.5 2.5L2.5 21.5H1L12 2.5H13.5Z" />
          </svg>

          <span className="text-sm font-medium">{username}</span>

          <svg className="h-5 opacity-50" viewBox="0 0 15 24" fill="currentColor">
            <path d="M13.5 2.5L2.5 21.5H1L12 2.5H13.5Z" />
          </svg>

          <span className="text-sm font-medium">{repository.name}</span>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden w-full">
        <WorktreeSidebar repoPath={repository.path} />

        <div className="flex-1 overflow-y-auto w-full">
          <div className="w-full px-6 py-8">
            <RepositoryViewV2 repository={repository} />
          </div>
        </div>
      </div>
    </div>
  );
}
