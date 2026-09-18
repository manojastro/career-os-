import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

const otpTypes = new Set<EmailOtpType>(["email", "signup", "invite", "recovery", "magiclink", "email_change"]);

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (!url || !key || !token || !type || !otpTypes.has(type)) {
    return NextResponse.redirect(new URL("/login?confirmation=failed", request.url));
  }

  let response = NextResponse.redirect(new URL("/setup", request.url));
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type });
  if (error) response = NextResponse.redirect(new URL("/login?confirmation=failed", request.url));
  return response;
}
