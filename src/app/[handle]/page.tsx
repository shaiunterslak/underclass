import { redirect } from "next/navigation";

// Catch-all for usernames: underclass.sh/shaiunterslak
// Works like X.com — any handle at root level starts a simulation
// We try LinkedIn first since that's our primary data source
export default async function HandleRedirect({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  // Skip known routes
  const reserved = ["simulate", "in", "s", "api", "_next", "favicon.ico", "sounds", "og-image.png", "hero-bg.jpg"];
  if (reserved.includes(handle) || handle.startsWith("_")) {
    redirect("/");
  }

  // Redirect to simulate with the handle — the research API will figure out who they are
  const linkedinUrl = `https://www.linkedin.com/in/${handle}`;
  redirect(`/simulate?url=${encodeURIComponent(linkedinUrl)}`);
}
