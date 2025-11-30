import type { JSX } from "react";
import { getRepositories } from "@/lib/repos";
import { RepositoryList } from "@/components/repository-list";

export default async function Home(): Promise<JSX.Element> {
  const repositories = await getRepositories();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bare - Worktree Manager</h1>
            <p className="text-gray-600">
              Manage multiple git repositories with worktrees
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Add Repository
          </button>
        </div>

        <RepositoryList initialRepositories={repositories} />
      </div>
    </main>
  );
}
