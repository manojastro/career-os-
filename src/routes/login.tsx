import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Link, useRouter } from "@/lib/router-compat";
import { Button, Field } from "@/components/ui";
import { authSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Career OS" },
      { name: "description", content: "Sign in to your private Career OS workspace." },
      { property: "og:title", content: "Sign in · Career OS" },
      { property: "og:description", content: "Sign in to your private Career OS workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const { enterDemo, exitDemo, demo } = useStore();
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "update">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = authSupabase().auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = authSupabase();
      if (mode === "reset") {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/login",
        });
        setMessage(
          result.error
            ? "Could not request password recovery. Try again later."
            : "If an account exists, check its inbox for the recovery link.",
        );
        setBusy(false);
        return;
      }
      if (mode === "update") {
        const result = await supabase.auth.updateUser({ password });
        setMessage(
          result.error
            ? "Could not update your password. Use a fresh recovery link."
            : "Password updated. You can sign in with the new password.",
        );
        if (!result.error) setMode("login");
        setBusy(false);
        return;
      }
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { data: { display_name: name }, emailRedirectTo: window.location.origin },
            });
      if (result.error) {
        setMessage(result.error.message);
        setBusy(false);
        return;
      }
      // Leave the local sample workspace as soon as auth succeeds, including the
      // email-confirmation path where no session exists yet. Sample records stay
      // on this device and are never copied into the account.
      exitDemo();
      if (!result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
        setBusy(false);
        return;
      }
      const userId = result.data.session.user.id;
      await supabase
        .from("profiles")
        .upsert(
          { id: userId, display_name: name || email.split("@")[0] },
          { onConflict: "id", ignoreDuplicates: true },
        );
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", userId)
        .maybeSingle();
      router.push(profile?.onboarded_at ? "/" : "/setup");
      setBusy(false);
    } catch {
      setMessage("Authentication is temporarily unavailable. Your workspace was not changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="section" style={{ width: "min(100%,410px)", padding: 26 }}>
        <div className="row" style={{ marginBottom: 25 }}>
          <span className="brand-mark" style={{ background: "var(--sidebar)" }}>
            C
          </span>
          <strong>CAREER OS</strong>
        </div>
        <h1 style={{ fontSize: 23, margin: "0 0 5px" }}>
          {mode === "login" ? "Welcome back" : "Create your workspace"}
        </h1>
        <p className="small muted" style={{ margin: "0 0 25px" }}>
          Your work, learning, and career evidence in one private place.
        </p>
        {demo && (
          <p className="small muted" style={{ margin: "-15px 0 20px" }}>
            You are browsing the sample workspace. Signing in starts a private, empty workspace —
            sample records stay on this device.
          </p>
        )}
        {(mode === "reset" || mode === "update") && (
          <p>{mode === "reset" ? "Request a password recovery link." : "Choose a new password."}</p>
        )}
        <form onSubmit={(event) => void submit(event)} className="stack" style={{ gap: 15 }}>
          {mode === "signup" && (
            <Field label="Name" name="auth-name">
              <input
                id="auth-name"
                className="input"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
          )}
          <Field label="Email" name="auth-email">
            <input
              id="auth-email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          {mode !== "reset" && (
            <Field label="Password" name="auth-password">
              <input
                id="auth-password"
                className="input"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          )}
          {message && (
            <p className="error" role="alert">
              {message}
            </p>
          )}
          <Button variant="primary" disabled={busy} type="submit" style={{ width: "100%" }}>
            {busy
              ? "Please wait…"
              : mode === "reset"
                ? "Send recovery link"
                : mode === "update"
                  ? "Save password"
                  : mode === "login"
                    ? "Sign in"
                    : "Create account"}
          </Button>
        </form>
        <button
          className="link small"
          onClick={() => {
            setMode("reset");
            setMessage("");
          }}
        >
          Forgot password?
        </button>
        <div className="small muted" style={{ marginTop: 20, textAlign: "center" }}>
          {mode === "login" ? "New to Career OS?" : "Already have an account?"}{" "}
          <button
            className="link"
            style={{ border: 0, background: "none" }}
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </div>
        <div className="small muted" style={{ marginTop: 14, textAlign: "center" }}>
          Just looking?{" "}
          <button
            className="link"
            style={{ border: 0, background: "none" }}
            onClick={() => {
              enterDemo();
              router.push("/");
            }}
          >
            Explore the sample workspace
          </button>
          . Sample data stays on this device and is never copied into an account.
        </div>
        <div className="small muted" style={{ marginTop: 14, textAlign: "center" }}>
          <Link href="/" className="link">
            Back to Career OS
          </Link>
        </div>
      </div>
    </main>
  );
}
