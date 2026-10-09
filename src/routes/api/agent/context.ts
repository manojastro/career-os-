import { createFileRoute } from "@tanstack/react-router";
import { agentJson, verifyAgentToken } from "@/lib/agent-auth.server";

// Authoritative owner context for the worker. Every section is filtered by the bound owner's user_id.
const SECTIONS: Record<string, { table: string; cols: string }> = {
  feedback: { table: "feedback", cols: "id,target_type,target_id,action,note,source,created_at,updated_at" },
  study_tasks: { table: "study_tasks", cols: "id,title,detail,skill_id,resource_url,estimated_minutes,due_date,priority,status,is_inference,dedupe_key,source,created_at,updated_at" },
  study_history: { table: "study_history", cols: "id,study_task_id,skill_id,minutes,notes,occurred_at,source,created_at,updated_at" },
  job_applications: { table: "job_applications", cols: "id,company,role,location,work_type,job_url,status,priority,date_found,date_applied,followup_date,resume_version,notes,created_at,updated_at" },
  job_leads: { table: "job_leads", cols: "id,company_id,company,title,location,work_type,official_url,source_url,verified_at,status,application_id,dedupe_key,created_at,updated_at" },
  contacts: { table: "contacts", cols: "id,name,company,role,linkedin_url,location,relationship_stage,topics,notes,last_interaction,next_followup,created_at,updated_at" },
  outreach: { table: "outreach", cols: "id,contact_id,recipient,channel,subject,draft,reason,status,is_inference,source_url,verified_at,sent_at,response_received_at,response_notes,dedupe_key,created_at,updated_at" },
  projects: { table: "projects", cols: "id,name,description,status,technologies,github_url,deployment_url,start_date,target_date,created_at,updated_at" },
  project_tasks: { table: "project_tasks", cols: "id,project_id,title,kind,detail,evidence_url,due_date,status,is_inference,dedupe_key,created_at,updated_at" },
  source_documents: { table: "source_documents", cols: "id,title,kind,url,storage_path,summary,status,dedupe_key,source,created_at,updated_at" },
  agent_runs: { table: "agent_runs", cols: "id,workflow,idempotency_key,status,started_at,finished_at,next_run_at,error,usage,delivery,created_at,updated_at" },
  interview_questions: { table: "interview_questions", cols: "id,question,answer,category,difficulty,status,confidence,skill_id,last_practiced,practice_count,recommendation_id,created_at,updated_at" },
  interview_practice: { table: "interview_practice", cols: "id,question_id,practiced_at,confidence,answer,weaknesses,notes,recommendation_id,created_at,updated_at" },
};

export const Route = createFileRoute("/api/agent/context")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = verifyAgentToken(request);
        if (denied) return denied;
        const params = new URL(request.url).searchParams;
        const limit = Math.min(200, Math.max(1, Number(params.get("limit") ?? 100) || 100));
        const before = params.get("before");
        if (before && Number.isNaN(Date.parse(before))) return agentJson({ error: "invalid_cursor" }, 400);
        const requested = (params.get("sections") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const unknown = requested.filter((s) => !(s in SECTIONS));
        if (unknown.length) return agentJson({ error: "invalid_sections", unknown }, 400);
        const names = requested.length ? requested : Object.keys(SECTIONS);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: owner, error: ownerErr } = await supabaseAdmin.from("agent_owner").select("user_id").eq("singleton", true).maybeSingle();
        if (ownerErr) return agentJson({ error: "context_unavailable" }, 500);
        if (!owner?.user_id) return agentJson({ error: "agent_owner_not_bound" }, 409);
        const uid = owner.user_id;

        const { data: prefs } = await supabaseAdmin.from("career_preferences")
          .select("id,target_roles,locations,work_types,min_salary,avoid_companies,focus_skills,briefing_time,timezone,study_minutes,research_sources,agent_paused,paused_workflows,notes,updated_at")
          .eq("user_id", uid).is("deleted_at", null).maybeSingle();

        const sections: Record<string, { items: unknown[]; next_before: string | null }> = {};
        for (const name of names) {
          const { table, cols } = SECTIONS[name];
          let q = supabaseAdmin.from(table as never).select(cols).eq("user_id", uid).is("deleted_at", null)
            .order("updated_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
          if (before) q = q.lt("updated_at", new Date(before).toISOString());
          const { data, error } = await q;
          if (error) return agentJson({ error: "context_unavailable", section: name }, 500);
          const rows = (data ?? []) as unknown as Array<{ updated_at: string }>;
          const more = rows.length > limit;
          const items = more ? rows.slice(0, limit) : rows;
          sections[name] = { items, next_before: more ? items[items.length - 1].updated_at : null };
        }
        return agentJson({
          generated_at: new Date().toISOString(),
          timezone: "Asia/Kolkata",
          limit,
          preferences: prefs ?? { briefing_time: "07:00", timezone: "Asia/Kolkata", study_minutes: 45, research_sources: [], agent_paused: false, paused_workflows: [] },
          sections,
        });
      },
    },
  },
});

