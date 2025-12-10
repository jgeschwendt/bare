import { NextRequest, NextResponse } from "next/server";
import { execa } from "execa";

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();

    if (!path) {
      return NextResponse.json(
        { error: "Missing required field: path" },
        { status: 400 }
      );
    }

    // Open in VS Code using 'code' CLI
    await execa("code", [path]);

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

    await execa("osascript", ["-e", script]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
