import { NextRequest, NextResponse } from "next/server";
import {
  listWorktrees,
  listBranches,
  addWorktree,
  removeWorktree,
  updateMainWorktree,
  installDependencies,
  installWorktreeDependencies,
} from "@/lib/git";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoPath = searchParams.get("repoPath");
    const action = searchParams.get("action");

    if (!repoPath) {
      return NextResponse.json(
        { error: "Missing required parameter: repoPath" },
        { status: 400 }
      );
    }

    if (action === "branches") {
      const branches = await listBranches(repoPath);
      return NextResponse.json({ branches });
    }

    const worktrees = await listWorktrees(repoPath);
    return NextResponse.json({ worktrees });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoPath, branch, worktreeName } = body;

    if (!repoPath || !worktreeName) {
      return NextResponse.json(
        { error: "Missing required fields: repoPath, worktreeName" },
        { status: 400 }
      );
    }

    // Step 1: Update __main__ worktree
    await updateMainWorktree(repoPath);

    // Step 2: Install dependencies in __main__
    await installDependencies(repoPath);

    // Step 3: Create new worktree (branch optional - creates new branch from main if not specified)
    const path = await addWorktree(repoPath, worktreeName, branch);

    // Step 4: Copy node_modules from __main__ and install deltas
    await installWorktreeDependencies(repoPath, worktreeName);

    return NextResponse.json({ path }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoPath = searchParams.get("repoPath");
    const worktreeName = searchParams.get("worktreeName");

    if (!repoPath || !worktreeName) {
      return NextResponse.json(
        { error: "Missing required parameters: repoPath, worktreeName" },
        { status: 400 }
      );
    }

    await removeWorktree(repoPath, worktreeName);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
