import type { JSX } from "react";
import { Suspense } from "react";
import { RepositoriesLoader } from "./components/repositories-loader";

export default function HomeV2(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-sm opacity-40">Loading...</div>
        </div>
      }
    >
      <RepositoriesLoader />
    </Suspense>
  );
}
