import { NextResponse } from "next/server";
import { researchPerson, findPersonByHandle, findCandidates } from "@/lib/exa";

export async function POST(req: Request) {
  try {
    const { url, handle, candidates: wantCandidates } = await req.json();

    if (!url && !handle) {
      return NextResponse.json({ error: "URL or handle is required" }, { status: 400 });
    }

    // Candidates mode: return multiple options for disambiguation
    if (wantCandidates) {
      const linkedinUrl = url || `https://www.linkedin.com/in/${handle}`;
      const results = await findCandidates(linkedinUrl);
      return NextResponse.json({ candidates: results });
    }

    // If we have a direct LinkedIn URL, use it
    if (url && url.includes("linkedin.com")) {
      const profile = await researchPerson(url);
      return NextResponse.json(profile);
    }

    // If we have a handle/name, search for the person first
    if (handle || url) {
      const query = handle || url;
      const profile = await findPersonByHandle(query);
      return NextResponse.json(profile);
    }

    return NextResponse.json({ error: "Could not resolve profile" }, { status: 400 });
  } catch (error) {
    console.error("Research error:", error);
    return NextResponse.json(
      { error: "Failed to research profile" },
      { status: 500 }
    );
  }
}
