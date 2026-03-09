export interface WorkHistoryEntry {
  title: string;
  company: string;
  location: string | null;
  from: string | null;
  to: string | null;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  from: string | null;
  to: string | null;
}

export interface CompanyInfo {
  name: string;
  description: string;
  coFounders: string;
  details: string;
}

export interface PersonProfile {
  name: string;
  headline: string;
  location: string;
  summary: string;
  profileImageUrl: string;
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
  companies: CompanyInfo[];
  narrativeContext: string;
  linkedinUrl: string;
  sources: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExaResult = { url?: string; title?: string; text?: string; summary?: string; entities?: any[]; image?: string };

async function exaSearch(apiKey: string, body: Record<string, unknown>): Promise<ExaResult[]> {
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error("Exa search error:", e);
    return [];
  }
}

async function exaAnswer(apiKey: string, query: string): Promise<string> {
  try {
    const res = await fetch("https://api.exa.ai/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ query, text: true, model: "exa" }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.answer || "";
  } catch (e) {
    console.error("Exa answer error:", e);
    return "";
  }
}

export interface PersonCandidate {
  name: string;
  headline: string;
  location: string;
  profileImageUrl: string;
  linkedinUrl: string;
}

export async function findCandidates(linkedinUrl: string): Promise<PersonCandidate[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  const cleanUrl = linkedinUrl.replace(/\/$/, "");
  const slug = cleanUrl.split("/in/")[1]?.replace(/\//g, "") || "";
  const nameFromUrl = slug
    .replace(/-/g, " ")
    .replace(/\d+/g, "")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // Search for the exact URL + name-based search
  const results = await exaSearch(apiKey, {
    query: `${nameFromUrl} linkedin`,
    category: "people",
    type: "auto",
    numResults: 5,
    contents: { text: { maxCharacters: 500 } },
  });

  // Also try exact URL search
  const urlResults = await exaSearch(apiKey, {
    query: cleanUrl,
    type: "auto",
    numResults: 3,
    contents: { text: { maxCharacters: 500 } },
  });

  const allResults = [...urlResults, ...results];
  const seen = new Set<string>();
  const candidates: PersonCandidate[] = [];

  for (const r of allResults) {
    const url = r.url || "";
    const rSlug = url.split("/in/")[1]?.replace(/\//g, "") || url;
    if (seen.has(rSlug) || !r.title) continue;
    seen.add(rSlug);

    const entity = r.entities?.[0];
    const props = entity?.properties || {};

    candidates.push({
      name: props.name || r.title?.split(/[|–-]/)[0]?.trim() || "",
      headline: r.title || "",
      location: props.location || "",
      profileImageUrl: r.image || props.imageUrl || props.image || "",
      linkedinUrl: url.includes("linkedin.com") ? url : "",
    });
  }

  return candidates.slice(0, 5);
}

export async function researchPerson(linkedinUrl: string): Promise<PersonProfile> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error("EXA_API_KEY not set");

  const cleanUrl = linkedinUrl.replace(/\/$/, "");
  const slug = cleanUrl.split("/in/")[1]?.replace(/\//g, "") || "";
  const nameFromUrl = slug
    .replace(/-/g, " ")
    .replace(/\d+/g, "")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  let resolvedName = nameFromUrl;
  let headline = "";
  let location = "";
  let profileImageUrl = "";
  let workHistory: WorkHistoryEntry[] = [];
  let education: EducationEntry[] = [];
  const companies: CompanyInfo[] = [];
  const sources: string[] = [];

  // ── Step 1: Exact URL search first ──────────
  const urlResults = await exaSearch(apiKey, {
    query: cleanUrl,
    type: "auto",
    numResults: 3,
    contents: { text: { maxCharacters: 2000 } },
  });

  // ── Step 2: People search — structured entity data ──────────
  const peopleResults = await exaSearch(apiKey, {
    query: `${nameFromUrl} ${cleanUrl}`,
    category: "people",
    type: "auto",
    numResults: 3,
    contents: { text: { maxCharacters: 2000 } },
  });

  // Prefer exact URL match, then slug match, then first result
  const allResults = [...urlResults, ...peopleResults];
  const exactMatch = allResults.find((r) => r.url?.includes(`/in/${slug}`));
  const match = exactMatch ||
    allResults.find((r) => r.url?.includes("linkedin.com") && r.url?.includes(slug)) ||
    peopleResults[0];

  if (match) {
    if (match.title) {
      headline = match.title;
      const titleMatch = match.title.match(/^([^|]+)\|/);
      if (titleMatch) {
        const parts = titleMatch[1].split(/[-–]/);
        if (parts[0]) {
          const extracted = parts[0].trim();
          if (extracted.length > 1 && extracted.length < 50) resolvedName = extracted;
        }
      }
    }

    // Extract profile image
    if (match.image) {
      profileImageUrl = match.image;
    }

    const entity = match.entities?.[0];
    if (entity?.properties) {
      const props = entity.properties;
      if (props.name) resolvedName = props.name;
      if (props.location) location = props.location;
      if (props.imageUrl && !profileImageUrl) profileImageUrl = props.imageUrl;
      if (props.image && !profileImageUrl) profileImageUrl = props.image;

      if (props.workHistory) {
        workHistory = props.workHistory.map(
          (w: { title: string; company: { name: string }; location: string | null; dates: { from: string | null; to: string | null } }) => ({
            title: w.title,
            company: w.company?.name || "Unknown",
            location: w.location,
            from: w.dates?.from,
            to: w.dates?.to,
          })
        );
      }

      if (props.educationHistory) {
        education = props.educationHistory.map(
          (e: { degree: string; institution: { name: string }; dates: { from: string | null; to: string | null } }) => ({
            degree: e.degree,
            institution: e.institution?.name || "Unknown",
            from: e.dates?.from,
            to: e.dates?.to,
          })
        );
      }
    }

    if (match.url) sources.push(match.url);
  }

  // ── Step 2: Deep company research (parallel) ──────────────────
  const recentCompanies = workHistory
    .filter((w) => !w.to || new Date(w.to) > new Date("2020-01-01"))
    .map((w) => w.company)
    .filter((name) => name !== "Unknown")
    .slice(0, 3);

  const companySearches = recentCompanies.map(async (companyName) => {
    const info: CompanyInfo = { name: companyName, description: "", coFounders: "", details: "" };

    // Use Exa answer for precise questions — avoids regex garbage
    const [aboutAnswer, founderAnswer] = await Promise.all([
      exaAnswer(apiKey, `What is ${companyName} where ${resolvedName} works? What does the company do? One paragraph.`),
      exaAnswer(apiKey, `Who are the co-founders and key team members of ${companyName} (the company where ${resolvedName} works)? List their names and roles.`),
    ]);

    info.description = aboutAnswer.slice(0, 500);
    info.coFounders = founderAnswer.slice(0, 500);

    return info;
  });

  const companyInfos = await Promise.all(companySearches);
  companies.push(...companyInfos.filter((c) => c.description || c.coFounders));

  // ── Step 3: Narrative context — articles, podcasts, interviews ──
  let narrativeContext = "";
  const contentResults = await exaSearch(apiKey, {
    query: `${resolvedName} career startup founder background interview`,
    type: "auto",
    numResults: 5,
    excludeDomains: ["linkedin.com"],
    contents: { text: { maxCharacters: 1500 }, summary: true },
  });

  for (const result of contentResults) {
    if (result.summary) {
      narrativeContext += `${result.summary}\n\n`;
    } else if (result.text) {
      narrativeContext += `[${result.title || "Source"}]: ${result.text.slice(0, 500)}\n\n`;
    }
    if (result.url) sources.push(result.url);
  }

  // ── Step 4: Recent news enrichment ──────────────────────────
  const enrichResults = await exaSearch(apiKey, {
    query: `"${resolvedName}" ${recentCompanies[0] || ""} 2024 2025`,
    type: "auto",
    numResults: 3,
    excludeDomains: ["linkedin.com"],
    contents: { summary: true },
  });

  for (const r of enrichResults) {
    if (r.summary) narrativeContext += `[Recent]: ${r.summary}\n\n`;
    if (r.url) sources.push(r.url);
  }

  // ── Build final profile ──────────────────────────────────────
  const workSummary = workHistory
    .slice(0, 5)
    .map((w) => {
      const dates = [w.from?.slice(0, 4), w.to?.slice(0, 4) || "Present"].filter(Boolean).join("–");
      return `${w.title} at ${w.company} (${dates})`;
    })
    .join("; ");

  const eduSummary = education.map((e) => `${e.degree} from ${e.institution}`).join("; ");

  const companySummary = companies
    .map((c) => {
      const parts = [`${c.name}`];
      if (c.description) parts.push(c.description.slice(0, 200));
      if (c.coFounders) parts.push(`Team/Founders: ${c.coFounders.slice(0, 200)}`);
      return parts.join(" — ");
    })
    .join("\n");

  const summary = [
    `${resolvedName}`,
    location ? `Based in ${location}` : "",
    workSummary ? `Career: ${workSummary}` : "",
    eduSummary ? `Education: ${eduSummary}` : "",
    companySummary ? `\nIMPORTANT - Company & team details (use these exact names, do NOT invent team members):\n${companySummary}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  return {
    name: resolvedName,
    headline: headline || `${resolvedName}`,
    location,
    summary,
    profileImageUrl,
    workHistory,
    education,
    companies,
    narrativeContext: narrativeContext.slice(0, 6000) || summary,
    linkedinUrl: cleanUrl,
    sources: [...new Set(sources)],
  };
}

/**
 * Find a person by handle/username/name — searches Exa for the person,
 * finds their LinkedIn profile, then does full research.
 */
export async function findPersonByHandle(handle: string): Promise<PersonProfile> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error("EXA_API_KEY not set");

  // Clean up the handle — could be "shaiunterslak", "shai-unterslak", "Shai Unterslak"
  const searchName = handle
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();

  // Search for this person on LinkedIn via Exa
  const results = await exaSearch(apiKey, {
    query: `${searchName} site:linkedin.com/in/`,
    type: "auto",
    numResults: 5,
    contents: { text: { maxCharacters: 500 } },
  });

  // Find the best LinkedIn match
  const linkedinResult = results.find((r) => r.url?.includes("linkedin.com/in/"));

  if (linkedinResult?.url) {
    // Found their LinkedIn — do full research
    return researchPerson(linkedinResult.url);
  }

  // No LinkedIn found — try a broader people search
  const peopleResults = await exaSearch(apiKey, {
    query: searchName,
    category: "people",
    type: "auto",
    numResults: 3,
    contents: { text: { maxCharacters: 2000 } },
  });

  if (peopleResults.length > 0) {
    const best = peopleResults.find((r) => r.url?.includes("linkedin.com")) || peopleResults[0];
    if (best?.url?.includes("linkedin.com")) {
      return researchPerson(best.url);
    }

    // Build a basic profile from what we found
    return {
      name: best?.title?.split("|")[0]?.trim() || searchName,
      headline: best?.title || searchName,
      location: "",
      summary: best?.text?.slice(0, 500) || "",
      profileImageUrl: best?.image || "",
      workHistory: [],
      education: [],
      companies: [],
      narrativeContext: best?.text || "",
      linkedinUrl: best?.url || "",
      sources: peopleResults.filter((r) => r.url).map((r) => r.url!),
    };
  }

  // Last resort — return minimal profile with just the name
  return {
    name: searchName,
    headline: searchName,
    location: "",
    summary: "",
    profileImageUrl: "",
    workHistory: [],
    education: [],
    companies: [],
    narrativeContext: "",
    linkedinUrl: "",
    sources: [],
  };
}
