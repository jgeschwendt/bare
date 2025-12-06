import { NextRequest, NextResponse } from "next/server";
import { updateMainWorktree, installDependencies } from "@/lib/git";
import { readWorktreeConfig } from "@/lib/worktree-config";
import { log } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoPath } = body;

    if (!repoPath) {
      return NextResponse.json(
        { error: "Missing required field: repoPath" },
        { status: 400 }
      );
    }

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
          const logMessage = `[UPDATE-MAIN] [+${stepDuration}s | ${totalDuration}s total] ${message}`;
          send(`[+${stepDuration}s | ${totalDuration}s total] ${message}`);
          log(logMessage);
          lastStepTime = now;
        };

        try {
          // Get config to determine upstream remote
          const config = await readWorktreeConfig(repoPath);
          const upstreamRemote = config.upstreamRemote || "origin";

          // Step 1: Update __main__ worktree
          send(`Updating __main__ from ${upstreamRemote}/main...`);
          log(`[UPDATE-MAIN] Starting update for: ${repoPath}`);
          lastStepTime = Date.now();
          await updateMainWorktree(repoPath, upstreamRemote);
          sendTimed("✓ __main__ updated");

          // Step 2: Install dependencies in __main__
          send("Installing dependencies in __main__...");
          await installDependencies(repoPath);
          sendTimed("✓ Dependencies installed");

          const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
          send(`✓ Update complete! Total time: ${totalTime}s`);
          log(`[UPDATE-MAIN] ✓ Complete! Total time: ${totalTime}s`);

          send("[DONE]");
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          send(`ERROR: ${message}`);
          log(`[UPDATE-MAIN] ERROR: ${message}`);
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
