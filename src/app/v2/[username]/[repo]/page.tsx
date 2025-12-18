import { Suspense } from "react";
import { RepoDetailLoader } from "./components/repo-detail-loader";

interface PageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { username, repo } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-sm text-gray-400">Loading...</div>
        </div>
      }
    >
      <RepoDetailLoader username={username} repoName={repo} />
    </Suspense>
  );
}
