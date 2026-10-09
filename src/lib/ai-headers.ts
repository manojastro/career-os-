import { browserSupabase } from "./supabase";

/** JSON headers plus the caller's Cloud access token, so AI routes can act as the signed-in user. */
export async function aiHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const client = browserSupabase();
  if (client) {
    const { data } = await client.auth.getSession();
    if (data.session?.access_token) headers["Authorization"] = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

