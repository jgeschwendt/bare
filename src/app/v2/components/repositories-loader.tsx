import { getRepositories } from "@/lib/repos";
import { DashboardV2 } from "./dashboard-v2";

export async function RepositoriesLoader() {
  const repositories = await getRepositories();
  return <DashboardV2 repositories={repositories} />;
}
