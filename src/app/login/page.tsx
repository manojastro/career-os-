"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Field } from "@/components/ui";
import { browserSupabase, hostedMode } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const supabase = browserSupabase();
    if (!supabase) return;
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: window.location.origin } });
    if (result.error) { setMessage(result.error.message); setBusy(false); return; }
    if (!result.data.session) { setMessage("Check your email to confirm your account, then sign in."); setBusy(false); return; }
    const { data: profile } = await supabase.from("profiles").select("onboarded_at").eq("id", result.data.session.user.id).maybeSingle();
    router.push(profile?.onboarded_at ? "/" : "/setup"); router.refresh();
    setBusy(false);
  };

  if (!hostedMode) return <main className="empty" style={{ paddingTop: "18vh" }}><strong>Demo mode is ready</strong><p>No credentials are configured. Explore the local demo workspace.</p><Link href="/" className="btn btn-primary">Open Career OS</Link></main>;
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}><div className="section" style={{ width: "min(100%,410px)", padding: 26 }}><div className="row" style={{ marginBottom: 25 }}><span className="brand-mark" style={{ background: "var(--sidebar)" }}>C</span><strong>CAREER OS</strong></div><h1 style={{ fontSize: 23, margin: "0 0 5px" }}>{mode === "login" ? "Welcome back" : "Create your workspace"}</h1><p className="small muted" style={{ margin: "0 0 25px" }}>Your work, learning, and career evidence in one private place.</p><form onSubmit={(event) => void submit(event)} className="stack" style={{ gap: 15 }}>
    {mode === "signup" && <Field label="Name" name="auth-name"><input id="auth-name" className="input" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} /></Field>}
    <Field label="Email" name="auth-email"><input id="auth-email" className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
    <Field label="Password" name="auth-password"><input id="auth-password" className="input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
    {(message || searchParams.get("confirmation") === "failed") && <p className="error" role="alert">{message || "The confirmation link is invalid or expired. Please sign in or request a new link."}</p>}<Button variant="primary" disabled={busy} type="submit" style={{ width: "100%" }}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
  </form><div className="small muted" style={{ marginTop: 20, textAlign: "center" }}>{mode === "login" ? "New to Career OS?" : "Already have an account?"} <button className="link" style={{ border: 0, background: "none" }} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></div></div></main>;
}

export default function LoginPage() {
  return <Suspense fallback={<main className="empty">Loading sign in…</main>}><LoginContent /></Suspense>;
}
