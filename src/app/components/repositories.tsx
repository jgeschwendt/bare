import { getRepositories } from "@/lib/repos";
import { RepositoryList } from "./repository-list";

export async function Repositories() {
  const repositories = await getRepositories();
  return <RepositoryList initialRepositories={repositories} />;
}
