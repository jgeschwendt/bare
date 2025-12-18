import { NextRequest } from "next/server";
import { execa } from "execa";

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();

    if (!path) {
      return new Response(
        JSON.stringify({ error: "Missing required field: path" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (message: string) => {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        };

        try {
          // Check if claude is already running in this directory
          send("Checking for existing Claude session...");
          let hasClaudeProcess = false;

          try {
            const result = await execa("lsof", ["-c", "node", "+D", path]);
            const lines = result.stdout.split('\n');
            hasClaudeProcess = lines.some((line: string) =>
              line.includes('cwd') && line.includes(path)
            );
          } catch (err: any) {
            // lsof returns non-zero even when it finds results sometimes
            if (err.stdout) {
              const lines = err.stdout.split('\n');
              hasClaudeProcess = lines.some((line: string) =>
                line.includes('cwd') && line.includes(path)
              );
            }
          }

          send("Opening VS Code...");
          await execa("code", [path]);
          await new Promise((resolve) => setTimeout(resolve, 500));

          if (hasClaudeProcess) {
            send("✓ Found existing Claude session - VS Code activated");
          } else {
            send("Launching new Claude session...");
            const script = `
              tell application "Visual Studio Code"
                activate
              end tell
              delay 0.5
              tell application "System Events"
                keystroke "\`" using {control down}
                delay 0.3
                keystroke "claude"
                delay 0.1
                keystroke return
              end tell
            `;

            await execa("osascript", ["-e", script]);
            send("✓ Claude launched");
          }

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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
