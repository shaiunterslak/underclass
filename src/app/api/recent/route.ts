import { NextResponse } from "next/server";
import { getRecentSessions, initDb } from "@/lib/db";

export async function GET() {
  try {
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      return NextResponse.json({ sessions: [] });
    }

    await initDb();
    const sessions = await getRecentSessions(30);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Recent sessions error:", error);
    return NextResponse.json({ sessions: [] });
  }
}
