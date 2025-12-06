import { NextRequest, NextResponse } from "next/server";
import { listRemotes, addRemote, removeRemote } from "@/lib/git";

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

    const remotes = await listRemotes(repoPath);
    return NextResponse.json({ remotes });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoPath, name, url } = body;

    if (!repoPath || !name || !url) {
      return NextResponse.json(
        { error: "Missing required fields: repoPath, name, url" },
        { status: 400 }
      );
    }

    await addRemote(repoPath, name, url);

    // Fetch from new remote
    const { spawn } = await import("child_process");
    spawn("git", ["fetch", name], { cwd: repoPath });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoPath = searchParams.get("repoPath");
    const name = searchParams.get("name");

    if (!repoPath || !name) {
      return NextResponse.json(
        { error: "Missing required parameters: repoPath, name" },
        { status: 400 }
      );
    }

    await removeRemote(repoPath, name);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
