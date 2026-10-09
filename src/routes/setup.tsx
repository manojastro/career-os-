import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRouter } from "@/lib/router-compat";
import { Button, Field } from "@/components/ui";
import { useStore } from "@/lib/store";
import { browserSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "First-run setup · Career OS" },
      { name: "description", content: "Add a career target, skills, goals and projects — or skip and start straight away." },
      { property: "og:title", content: "First-run setup · Career OS" },
      { property: "og:description", content: "Add a career target, skills, goals and projects — or skip and start straight away." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SetupPage,
});

const steps = ["Career target", "Top skills", "Current goals", "Active projects", "Weekly availability"];

function SetupPage() {
  const router = useRouter();
  const { user, data, add } = useStore();
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState("");
  const [skills, setSkills] = useState("");
  const [goals, setGoals] = useState("");
  const [projects, setProjects] = useState("");
  const [hours, setHours] = useState(10);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = async (skip = false) => {
    setBusy(true);
    setError("");
    try {
      if (!skip) {
        for (const name of skills.split(",").map((item) => item.trim()).filter(Boolean)) {
          if (!data.skills.some((item) => item.name.toLowerCase() === name.toLowerCase()))
            await add("skills", { name, status: "Learning", category: "", knowledge: 0, hands_on: 0, project_proof: 0, production: 0, interview: 0, last_activity: null });
        }
        for (const title of goals.split("\n").map((item) => item.trim()).filter(Boolean)) {
          if (!data.goals.some((item) => item.title.toLowerCase() === title.toLowerCase()))
            await add("goals", { title, description: "", goal_type: "quarter", parent_goal_id: null, target_date: null, status: "active", reason: "", success_criteria: "" });
        }
        for (const name of projects.split("\n").map((item) => item.trim()).filter(Boolean)) {
          if (!data.projects.some((item) => item.name.toLowerCase() === name.toLowerCase()))
            await add("projects", {
              name, description: "", problem: "", business_value: "", architecture: "", technologies: [],
              github_url: "", deployment_url: "", status: "Planning", start_date: null, target_date: null,
            });
        }
      }
      const supabase = browserSupabase();
      if (supabase && user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: user.id, career_target: target, weekly_hours: hours, onboarded_at: new Date().toISOString() }, { onConflict: "id" });
        if (profileError) throw profileError;
      }
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not finish setup.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="section" style={{ width: "min(100%,560px)", padding: 25 }}>
        <div className="row-between small muted">
          <strong>CAREER OS</strong>
          <span>Step {step + 1} of {steps.length}</span>
        </div>
        <div className="progress-track" style={{ margin: "14px 0 28px" }}>
          <div className="progress-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <h1 style={{ fontSize: 23, marginBottom: 5 }}>{steps[step]}</h1>
        <p className="small muted" style={{ marginBottom: 20 }}>
          A few starting points make your dashboard useful from day one. You can edit everything later.
        </p>
        {step === 0 && (
          <Field label="What role are you working toward?" name="career-target">
            <input id="career-target" className="input" placeholder="GenAI engineer" value={target} onChange={(event) => setTarget(event.target.value)} />
          </Field>
        )}
        {step === 1 && (
          <Field label="Skills, separated by commas" name="career-skills">
            <textarea id="career-skills" className="textarea" placeholder="Python, RAG, FastAPI" value={skills} onChange={(event) => setSkills(event.target.value)} />
          </Field>
        )}
        {step === 2 && (
          <Field label="One goal per line" name="career-goals">
            <textarea id="career-goals" className="textarea" placeholder="Build a production RAG system" value={goals} onChange={(event) => setGoals(event.target.value)} />
          </Field>
        )}
        {step === 3 && (
          <Field label="One project per line" name="career-projects">
            <textarea id="career-projects" className="textarea" placeholder="Permission-aware enterprise RAG" value={projects} onChange={(event) => setProjects(event.target.value)} />
          </Field>
        )}
        {step === 4 && (
          <Field label="Hours available each week" name="career-hours">
            <input id="career-hours" type="number" min={0} max={168} className="input" value={hours} onChange={(event) => setHours(Number(event.target.value))} />
          </Field>
        )}
        {error && <p className="error">{error}</p>}
        <div className="form-actions" style={{ justifyContent: "space-between", marginTop: 25 }}>
          <Button variant="quiet" onClick={() => void finish(true)} disabled={busy}>Skip setup</Button>
          <div className="row">
            {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
            <Button variant="primary" disabled={busy} onClick={() => (step === steps.length - 1 ? void finish() : setStep(step + 1))}>
              {step === steps.length - 1 ? "Start dashboard" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

