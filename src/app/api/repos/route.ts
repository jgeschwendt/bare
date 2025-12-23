import { NextRequest, NextResponse } from "next/server";
import {
  getRepositories,
  addRepository,
  removeRepository,
  updateRepository,
} from "@/lib/repos";

export async function GET() {
  try {
    const repos = await getRepositories();
    return NextResponse.json(repos);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to get repositories: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, path, remoteUrl, type } = body;

    if (!name || !path) {
      return NextResponse.json(
        { error: "Missing required fields: name, path" },
        { status: 400 }
      );
    }

    const repo = await addRepository({
      name,
      path,
      remoteUrl,
      type,
    });

    return NextResponse.json(repo, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const repo = await updateRepository(id, body);
    return NextResponse.json(repo);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

    await removeRepository(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
