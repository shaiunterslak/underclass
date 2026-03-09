import { neon } from "@neondatabase/serverless";

function getDb() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("POSTGRES_URL or DATABASE_URL not set");
  return neon(url);
}

// Initialize the database schema (run once)
export async function initDb() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      linkedin_url TEXT NOT NULL,
      person_name TEXT,
      profile_data JSONB,
      messages JSONB NOT NULL DEFAULT '[]',
      final_pul INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC)
  `;
}

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export interface SessionData {
  id: string;
  linkedinUrl: string;
  personName: string;
  profileData: Record<string, unknown>;
  messages: Record<string, unknown>[];
  finalPul?: number;
  createdAt: string;
}

export async function createSession(data: {
  linkedinUrl: string;
  personName: string;
  profileData: Record<string, unknown>;
  messages: Record<string, unknown>[];
  finalPul?: number;
}): Promise<string> {
  const sql = getDb();
  const id = generateId();

  await sql`
    INSERT INTO sessions (id, linkedin_url, person_name, profile_data, messages, final_pul)
    VALUES (${id}, ${data.linkedinUrl}, ${data.personName}, ${JSON.stringify(data.profileData)}, ${JSON.stringify(data.messages)}, ${data.finalPul || null})
  `;

  return id;
}

export async function getSession(id: string): Promise<SessionData | null> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, linkedin_url, person_name, profile_data, messages, final_pul, created_at
    FROM sessions WHERE id = ${id}
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    linkedinUrl: row.linkedin_url,
    personName: row.person_name,
    profileData: row.profile_data as Record<string, unknown>,
    messages: row.messages as Record<string, unknown>[],
    finalPul: row.final_pul,
    createdAt: row.created_at,
  };
}

// Get recent sessions for the landing page marquee
export async function getRecentSessions(limit = 20): Promise<Array<{
  id: string;
  personName: string;
  finalPul: number | null;
}>> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, person_name, final_pul
    FROM sessions
    WHERE person_name IS NOT NULL AND person_name != ''
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: r.id,
    personName: r.person_name,
    finalPul: r.final_pul,
  }));
}

export async function updateSession(id: string, data: {
  messages: Record<string, unknown>[];
  finalPul?: number;
}): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE sessions
    SET messages = ${JSON.stringify(data.messages)}::jsonb,
        final_pul = ${data.finalPul || null},
        updated_at = NOW()
    WHERE id = ${id}
  `;
}
