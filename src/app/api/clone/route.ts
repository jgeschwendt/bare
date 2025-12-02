import { NextRequest } from "next/server";
import { cloneRepository, detectRepositoryType, getRemoteUrl } from "@/lib/git";
import { addRepository } from "@/lib/repos";
import { log } from "@/lib/logger";
import { basename } from "path";

export async function POST(request: NextRequest) {
  const { url, targetDir } = await request.json();

  if (!url || !targetDir) {
    return new Response("Missing url or targetDir", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const startTime = Date.now();
        let lastStepTime = startTime;

        const send = (data: string) => {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        const sendTimed = (data: string) => {
          const now = Date.now();
          const stepDuration = ((now - lastStepTime) / 1000).toFixed(1);
          const totalDuration = ((now - startTime) / 1000).toFixed(1);
          const logMessage = `[CLONE] [+${stepDuration}s | ${totalDuration}s total] ${data}`;
          send(`[+${stepDuration}s | ${totalDuration}s total] ${data}`);
          log(logMessage);
          lastStepTime = now;
        };

        send("Starting clone...");
        log(`[CLONE] Starting clone: ${url} -> ${targetDir}`);
        lastStepTime = Date.now();

        const repoPath = await cloneRepository(url, targetDir, (line) => {
          send(line);
        });

        sendTimed("Clone complete!");
        send("Detecting repository type...");

        const type = await detectRepositoryType(repoPath);
        sendTimed(`Detected type: ${type}`);

        send("Getting remote URL...");
        const remoteUrl = await getRemoteUrl(repoPath);
        sendTimed("Got remote URL");

        send("Adding to registry...");
        await addRepository({
          name: basename(targetDir),
          path: repoPath,
          remoteUrl,
          type,
        });
        sendTimed("Repository added successfully!");

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        send(`✓ Complete! Total time: ${totalTime}s`);
        log(`[CLONE] ✓ Complete! Total time: ${totalTime}s`);
        send("[DONE]");
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(encoder.encode(`data: ERROR: ${message}\n\n`));
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
}
