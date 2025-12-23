import type { JSX } from "react";
import { Suspense } from "react";
import { Repositories } from "@/app/components/repositories";
import { Dashboard } from "@/app/components/dashboard";

export default function Home(): JSX.Element {
  return (
    <Dashboard>
      <Suspense
        fallback={
          <div className="text-center py-12 text-gray-500">
            Loading repositories...
          </div>
        }
      >
        <Repositories />
      </Suspense>
    </Dashboard>
  );
}
