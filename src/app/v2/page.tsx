import type { JSX } from "react";
import { Suspense } from "react";
import { RepositoriesLoader } from "./components/repositories-loader";

export default function HomeV2(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-sm text-gray-400">Loading...</div>
        </div>
      }
    >
      <RepositoriesLoader />
    </Suspense>
  );
}
