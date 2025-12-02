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
import { log } from "@/lib/logger";

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

    // Return SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const startTime = Date.now();
        let lastStepTime = startTime;

        const send = (message: string) => {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        };

        const sendTimed = (message: string) => {
          const now = Date.now();
          const stepDuration = ((now - lastStepTime) / 1000).toFixed(1);
          const totalDuration = ((now - startTime) / 1000).toFixed(1);
          const logMessage = `[WORKTREE] [+${stepDuration}s | ${totalDuration}s total] ${message}`;
          send(`[+${stepDuration}s | ${totalDuration}s total] ${message}`);
          log(logMessage);
          lastStepTime = now;
        };

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        try {
          // Step 1: Update __main__ worktree
          send("Updating __main__ worktree...");
          log(`[WORKTREE] Starting worktree creation: ${repoPath}/${worktreeName}`);
          lastStepTime = Date.now();
          await updateMainWorktree(repoPath);
          await delay(300);
          sendTimed("✓ __main__ updated");
          await delay(300);

          // Step 2: Install dependencies in __main__
          send("Installing dependencies in __main__...");
          await installDependencies(repoPath);
          await delay(300);
          sendTimed("✓ Dependencies installed in __main__");
          await delay(300);

          // Step 3: Create new worktree
          send(`Creating worktree ${worktreeName}...`);
          const path = await addWorktree(repoPath, worktreeName, branch);
          await delay(300);
          sendTimed(`✓ Worktree created at ${path}`);
          await delay(300);

          // Step 4: Copy node_modules and install deltas
          send("Copying node_modules with hardlinks...");
          await installWorktreeDependencies(repoPath, worktreeName);
          await delay(300);
          sendTimed("✓ Dependencies installed in worktree");
          await delay(300);

          const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
          send(`✓ Worktree ready! Total time: ${totalTime}s`);
          log(`[WORKTREE] ✓ Worktree ready! Total time: ${totalTime}s`);
          await delay(500);

          send("[DONE]");
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          send(`ERROR: ${message}`);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
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
