import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEMO_FLAG = "career-os-demo-mode";

export const hostedMode = true;

export function demoMode(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(DEMO_FLAG) === "1";
}

export function setDemoMode(on: boolean) {
  if (typeof localStorage === "undefined") return;
  if (on) localStorage.setItem(DEMO_FLAG, "1");
  else localStorage.removeItem(DEMO_FLAG);
}

/** Returns the Cloud client, or null while the local demo workspace is active. */
export function browserSupabase() {
  if (demoMode()) return null;
  return supabase as unknown as SupabaseClient;
}

/** Auth client that always works, even if the local demo workspace is active. */
export function authSupabase() {
  return supabase as unknown as SupabaseClient;
}

