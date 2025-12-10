import { NextRequest, NextResponse } from "next/server";
import { execa } from "execa";

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

    let args: string[];

    switch (app) {
      case "vscode":
        args = ["-a", "Visual Studio Code", path];
        break;
      case "terminal":
        args = ["-a", "Terminal", path];
        break;
      default:
        return NextResponse.json(
          { error: `Unknown app: ${app}` },
          { status: 400 }
        );
    }

    await execa("open", args);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
