import { getRepositories } from "@/lib/repos";
import { RepoDetailView } from "./repo-detail-view";
import { notFound } from "next/navigation";

interface RepoDetailLoaderProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export async function RepoDetailLoader({
  params,
}: RepoDetailLoaderProps) {
  const { username, repo: repoName } = await params;
  const repositories = await getRepositories();

  // Find the matching repository
  const repo = repositories.find((r) => {
    const pathParts = r.path.split("/");
    const githubIndex = pathParts.findIndex((p) => p === "GitHub");
    const repoUsername = githubIndex >= 0 ? pathParts[githubIndex + 1] : "";
    return repoUsername === username && r.name === repoName;
  });

  if (!repo) {
    notFound();
  }

  return <RepoDetailView repository={repo} />;
}
