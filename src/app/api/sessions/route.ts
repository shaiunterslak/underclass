import { NextResponse } from "next/server";
import { createSession, getSession, initDb } from "@/lib/db";

// POST — save a session
export async function POST(req: Request) {
  try {
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    await initDb();

    const { linkedinUrl, personName, profileData, messages, finalPul } = await req.json();

    if (!linkedinUrl || !messages) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = await createSession({
      linkedinUrl,
      personName: personName || "",
      profileData: profileData || {},
      messages,
      finalPul,
    });

    const shareUrl = `https://underclass.sh/s/${id}`;

    return NextResponse.json({ id, shareUrl });
  } catch (error) {
    console.error("Session create error:", error);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}

// GET — load a session
export async function GET(req: Request) {
  try {
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    await initDb();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    const session = await getSession(id);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("Session load error:", error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
