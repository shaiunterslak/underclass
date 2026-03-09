import { redirect } from "next/navigation";

// Catch paths like /shaiunterslak/status/203082... or /shaiunterslak/anything
// These come from viral URL replacement (x.com/user/status/123 → underclass.sh/user/status/123)
// Strip everything after the handle and start a simulation
export default async function HandleSubpathRedirect({
  params,
}: {
  params: Promise<{ handle: string; rest: string[] }>;
}) {
  const { handle } = await params;

  const reserved = ["simulate", "in", "s", "api", "_next"];
  if (reserved.includes(handle) || handle.startsWith("_") || handle.includes(".")) {
    redirect("/");
  }

  // Just use the handle — ignore /status/id, /posts/id, etc.
  redirect(`/simulate?handle=${encodeURIComponent(handle)}`);
}
