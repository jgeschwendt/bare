import { NextRequest } from "next/server";
import { cloneRepository, detectRepositoryType, getRemoteUrl } from "@/lib/git";
import { addRepository } from "@/lib/repos";
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
        const send = (data: string) => {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        send("Starting clone...");

        const repoPath = await cloneRepository(url, targetDir, (line) => {
          send(line);
        });

        send("Clone complete!");
        send("Detecting repository type...");

        const type = await detectRepositoryType(repoPath);
        send(`Detected type: ${type}`);

        send("Getting remote URL...");
        const remoteUrl = await getRemoteUrl(repoPath);

        send("Adding to registry...");
        await addRepository({
          name: basename(targetDir),
          path: repoPath,
          remoteUrl,
          type,
        });

        send("Repository added successfully!");
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
