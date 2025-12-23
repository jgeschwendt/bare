import { Suspense } from "react";
import { RepoDetailLoader } from "./components/repo-detail-loader";

interface PageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default function RepoDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-sm opacity-40">Loading...</div>
        </div>
      }
    >
      <RepoDetailLoader params={params} />
    </Suspense>
  );
}
