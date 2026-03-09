import type { Metadata } from "next";
import { getSession } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const APP_URL = "https://underclass.sh";

  try {
    const session = await getSession(id);
    if (!session) {
      return { title: "Session not found — underclass" };
    }

    const name = session.personName || "Someone";
    const pul = session.finalPul ?? 50;
    const outcome = pul <= 20 ? "elite" : pul <= 60 ? "survived" : "underclass";
    const outcomeText = outcome === "elite"
      ? `made it to the elite (PUL: ${pul}%)`
      : outcome === "survived"
        ? `barely survived (PUL: ${pul}%)`
        : `fell into the underclass (PUL: ${pul}%)`;

    const title = `${name} ${outcomeText} — underclass`;
    const description = `${name}'s AI future simulation. Final score: ${pul}% Permanent Underclass Likelihood. Will you survive?`;
    const ogImage = `${APP_URL}/api/og?name=${encodeURIComponent(name)}&pul=${pul}&outcome=${outcome}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `${APP_URL}/s/${id}`,
        siteName: "underclass",
        images: [{ url: ogImage, width: 1200, height: 630 }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {
      title: "underclass — will you survive the age of AI?",
    };
  }
}

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
