import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(request: NextRequest) {
  return new Promise(async (resolve) => {
    try {
      const { path } = await request.json();

      if (!path) {
        resolve(
          NextResponse.json(
            { error: "Missing required field: path" },
            { status: 400 }
          )
        );
        return;
      }

      // Open in VS Code using 'code' CLI
      const vscode = spawn("code", [path]);

      vscode.on("error", (error) => {
        resolve(
          NextResponse.json(
            { error: `Failed to open VS Code: ${error.message}` },
            { status: 500 }
          )
        );
      });

      vscode.on("exit", (code) => {
        if (code !== 0) {
          resolve(
            NextResponse.json(
              { error: `VS Code exited with code ${code}` },
              { status: 500 }
            )
          );
          return;
        }

        // Use AppleScript to activate VS Code and open integrated terminal with claude
        // Wait a moment for VS Code to open, then send keystrokes
        // VS Code's terminal starts in the opened directory, so no cd needed
        const script = `
          delay 0.5
          tell application "Visual Studio Code"
            activate
          end tell
          delay 0.3
          tell application "System Events"
            keystroke "\`" using {control down}
            delay 0.3
            keystroke "claude"
            delay 0.1
            keystroke return
          end tell
        `;

        const terminal = spawn("osascript", ["-e", script]);

        terminal.on("error", (error) => {
          resolve(
            NextResponse.json(
              { error: `Failed to open terminal: ${error.message}` },
              { status: 500 }
            )
          );
        });

        terminal.on("exit", (terminalCode) => {
          if (terminalCode === 0) {
            resolve(NextResponse.json({ success: true }));
          } else {
            resolve(
              NextResponse.json(
                { error: `Terminal command exited with code ${terminalCode}` },
                { status: 500 }
              )
            );
          }
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      resolve(
        NextResponse.json({ error: message }, { status: 500 })
      );
    }
  });
}
