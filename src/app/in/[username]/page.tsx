import { redirect } from "next/navigation";

export default async function LinkedInRedirect({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const linkedinUrl = `https://www.linkedin.com/in/${username}`;
  redirect(`/simulate?url=${encodeURIComponent(linkedinUrl)}`);
}
