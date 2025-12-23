"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Repository } from "@/lib/types";
import { NavbarV2 } from "./navbar-v2";
import { AddRepoDialog } from "./add-repo-dialog";
import { OverviewDashboard } from "./overview-dashboard";

interface DashboardV2Props {
  repositories: Repository[];
}

export function DashboardV2({ repositories }: DashboardV2Props) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <NavbarV2
          repositories={repositories}
          onAddRepo={() => setIsAddDialogOpen(true)}
        />

        <div className="flex flex-1 overflow-hidden">
          <OverviewDashboard repositories={repositories} />
        </div>
      </div>

      <AddRepoDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onComplete={() => {
          router.refresh();
          setIsAddDialogOpen(false);
        }}
      />
    </>
  );
}
