import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, app } = body;

    if (!path || !app) {
      return NextResponse.json(
        { error: "Missing required fields: path, app" },
        { status: 400 }
      );
    }

    return new Promise((resolve) => {
      let command: string;
      let args: string[];

      switch (app) {
        case "vscode":
          command = "open";
          args = ["-a", "Visual Studio Code", path];
          break;
        case "terminal":
          command = "open";
          args = ["-a", "Terminal", path];
          break;
        default:
          resolve(
            NextResponse.json(
              { error: `Unknown app: ${app}` },
              { status: 400 }
            )
          );
          return;
      }

      const proc = spawn(command, args);

      proc.on("exit", (code) => {
        if (code === 0) {
          resolve(NextResponse.json({ success: true }));
        } else {
          resolve(
            NextResponse.json(
              { error: `Failed to open ${app}` },
              { status: 500 }
            )
          );
        }
      });

      proc.on("error", (error) => {
        resolve(
          NextResponse.json(
            { error: error.message },
            { status: 500 }
          )
        );
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
