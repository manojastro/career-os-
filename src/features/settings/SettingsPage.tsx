import { useEffect, useState } from "react";
import { useRouter } from "@/lib/router-compat";
import { Button, Field, PageHeading, Section } from "@/components/ui";
import { useStore } from "@/lib/store";
import { browserSupabase } from "@/lib/supabase";
import { LearningSettings } from "@/features/learning-manager/LearningManager";

export function SettingsPage() {
  const { hosted, user, resetDemo, signOut, exitDemo, refresh } = useStore();
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [hours, setHours] = useState(10);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!hosted || !user) return;
    const supabase = browserSupabase()!;
    void supabase
      .from("profiles")
      .select("career_target,weekly_hours")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTarget(data.career_target);
          setHours(data.weekly_hours);
        }
      });
  }, [hosted, user]);
  const save = async () => {
    if (!Number.isInteger(hours) || hours < 0 || hours > 168) {
      setMessage("Weekly hours must be a whole number from 0 to 168.");
      return;
    }
    if (!hosted || !user) {
      setMessage("Profile settings require a Supabase account. Demo changes stay in this browser.");
      return;
    }
    const { error } = await browserSupabase()!
      .from("profiles")
      .update({ career_target: target, weekly_hours: hours })
      .eq("id", user.id)
      .select("id")
      .single();
    setMessage(error ? error.message : "Settings saved.");
    if (!error) await refresh({ silent: true });
  };
  return (
    <>
      <PageHeading
        title="Settings"
        subtitle="Keep your workspace private and tuned to your available time."
      />
      <div className="grid-main">
        <div className="stack">
          <Section title="Career profile">
            <div className="section-body form-grid">
              <Field label="Career target" name="settings-target" full>
                <input
                  id="settings-target"
                  className="input"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  placeholder="GenAI engineer"
                />
              </Field>
              <Field label="Hours available each week" name="settings-hours">
                <input
                  id="settings-hours"
                  type="number"
                  min={0}
                  max={168}
                  className="input"
                  value={hours}
                  onChange={(event) => setHours(Number(event.target.value))}
                />
              </Field>
              <div className="full row-between">
                <span className="small muted" role="status">
                  {message}
                </span>
                <Button variant="primary" onClick={() => void save()}>
                  Save settings
                </Button>
              </div>
            </div>
          </Section>
          <Section title="Keyboard shortcuts">
            <div className="section-body small stack" style={{ gap: 9 }}>
              {[
                ["C", "Quick capture"],
                ["T", "New task"],
                ["N", "Quick note / capture"],
                ["/", "Search"],
                ["Ctrl/Cmd + K", "AI Copilot"],
                ["Esc", "Close dialog"],
              ].map(([key, label]) => (
                <div className="row-between" key={key}>
                  <span>{label}</span>
                  <span className="kbd" style={{ marginLeft: 0 }}>
                    {key}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
        <div className="stack">
          <LearningSettings />
          <Section title="Data mode">
            <div className="section-body">
              <strong className="small">
                {hosted ? "Private Supabase workspace" : "Local demo workspace"}
              </strong>
              <p className="small muted">
                {hosted
                  ? "Records are scoped to your account by Row Level Security."
                  : "Demo data stays in this browser. Add Supabase credentials to enable private hosted accounts."}
              </p>
              {hosted && user && <div className="small muted">Signed in as {user.email}</div>}
              {!hosted && (
                <div className="row" style={{ gap: 9, flexWrap: "wrap" }}>
                  <Button
                    variant="primary"
                    onClick={() => {
                      exitDemo();
                      router.push("/login");
                    }}
                  >
                    Create account / Sign in
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (
                        window.confirm("Reset all local demo changes to the original sample data?")
                      )
                        resetDemo();
                    }}
                  >
                    Reset demo data
                  </Button>
                </div>
              )}
            </div>
          </Section>
          {hosted && (
            <Section title="Account">
              <div className="section-body">
                <Button
                  onClick={() => {
                    void signOut().then(() => router.push("/login"));
                  }}
                >
                  Sign out
                </Button>
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
