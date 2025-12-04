import { NextRequest, NextResponse } from "next/server";
import { readWorktreeConfig, writeWorktreeConfig } from "@/lib/worktree-config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoPath = searchParams.get("repoPath");

    if (!repoPath) {
      return NextResponse.json(
        { error: "Missing required parameter: repoPath" },
        { status: 400 }
      );
    }

    const config = await readWorktreeConfig(repoPath);
    return NextResponse.json({ config });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoPath, config } = body;

    if (!repoPath || !config) {
      return NextResponse.json(
        { error: "Missing required fields: repoPath, config" },
        { status: 400 }
      );
    }

    await writeWorktreeConfig(repoPath, config);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
