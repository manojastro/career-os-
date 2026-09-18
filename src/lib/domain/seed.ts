import { AppData, emptyData, RowBase } from "./types";

const isoDay = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

const now = () => new Date().toISOString();
const row = (id: string): RowBase => ({ id, user_id: "demo", created_at: now() });

export function demoData(): AppData {
  const data = emptyData();
  data.goals = [
    { ...row("goal-career"), title: "Become job-ready for GenAI engineering", description: "Build the skills and proof for a production GenAI role.", goal_type: "career", parent_goal_id: null, target_date: isoDay(180), status: "active", reason: "Move into a role building reliable AI systems.", success_criteria: "Portfolio, interviews, and applications demonstrate production ability." },
    { ...row("goal-rag"), title: "Complete Production RAG", description: "Ship a secure, evaluated retrieval system.", goal_type: "quarter", parent_goal_id: "goal-career", target_date: isoDay(70), status: "active", reason: "RAG is a core capability for target roles.", success_criteria: "Deployed project with evaluation, observability, and an architecture write-up." },
    { ...row("goal-portfolio"), title: "Build portfolio project", description: "Create a public proof of end-to-end engineering.", goal_type: "quarter", parent_goal_id: "goal-career", target_date: isoDay(90), status: "active", reason: "Employers need concrete evidence.", success_criteria: "Working demo, repository, and concise case study." },
  ];
  data.milestones = [
    { ...row("mile-search"), goal_id: "goal-rag", title: "Hybrid retrieval working", due_date: isoDay(14), status: "in_progress", success_criteria: "Lexical and semantic results merged and measured." },
    { ...row("mile-eval"), goal_id: "goal-rag", title: "Evaluation suite and baseline", due_date: isoDay(35), status: "pending", success_criteria: "Repeatable answer and retrieval quality tests." },
    { ...row("mile-demo"), goal_id: "goal-portfolio", title: "Public demo and case study", due_date: isoDay(58), status: "pending", success_criteria: "Deployment URL, screenshots, and trade-off notes." },
  ];
  data.skills = [
    ["skill-python", "Python", "Applied", 4, 4, 4, 3, 3],
    ["skill-fastapi", "FastAPI", "Practicing", 3, 3, 2, 2, 2],
    ["skill-rag", "RAG", "Practicing", 4, 3, 3, 2, 2],
    ["skill-langgraph", "LangGraph", "Learning", 2, 2, 1, 1, 1],
    ["skill-docker", "Docker", "Practicing", 3, 3, 2, 2, 2],
    ["skill-k8s", "Kubernetes", "Learning", 2, 1, 0, 0, 1],
    ["skill-azure", "Azure AI", "Learning", 2, 1, 0, 0, 1],
  ].map(([id, name, status, knowledge, hands_on, project_proof, production, interview]) => ({
    ...row(String(id)), name: String(name), status: status as AppData["skills"][number]["status"], category: "Engineering",
    knowledge: Number(knowledge), hands_on: Number(hands_on), project_proof: Number(project_proof), production: Number(production), interview: Number(interview), last_activity: isoDay(-2),
  }));
  data.skill_topics = ["Fundamentals", "Embeddings", "Chunking", "Vector Databases", "Hybrid Search", "Reranking", "Evaluation", "Security", "Observability"].map((title, i) => ({
    ...row(`topic-rag-${i}`), skill_id: "skill-rag", parent_topic_id: null, title,
    status: (i < 3 ? "Applied" : i < 5 ? "Practicing" : "Not Started") as AppData["skill_topics"][number]["status"],
  }));
  data.projects = [
    { ...row("project-rag"), name: "Permission-Aware Enterprise RAG", description: "Secure retrieval across internal documents with measurable answer quality.", problem: "Naive retrieval can reveal documents to the wrong person.", business_value: "Trusted answers with a clear permission boundary.", architecture: "Ingestion → ACL-aware index → hybrid retrieval → rerank → answer with citations", technologies: ["Python", "FastAPI", "PostgreSQL", "Docker"], github_url: "", deployment_url: "", status: "Building", start_date: isoDay(-25), target_date: isoDay(55) },
    { ...row("project-release"), name: "Autonomous Release Reliability Engineer", description: "An agent that investigates release risk and proposes safe remediation.", problem: "Release failures are slow to diagnose.", business_value: "Shorter incident triage with accountable recommendations.", architecture: "Telemetry → diagnosis tools → grounded proposal → human approval", technologies: ["LangGraph", "Python", "Azure AI"], github_url: "", deployment_url: "", status: "Planning", start_date: isoDay(-5), target_date: isoDay(85) },
  ];
  data.tasks = [
    ["task-hybrid", "Implement hybrid search and reciprocal rank fusion", "Build", "today", "high", 90, "skill-rag", "project-rag", "goal-rag", "mile-search", 1],
    ["task-portfolio", "Write the RAG architecture decision", "Document", "today", "high", 60, "skill-rag", "project-rag", "goal-portfolio", null, 2],
    ["task-interview", "Practice retrieval system design questions", "Interview", "today", "medium", 45, "skill-rag", null, "goal-career", null, 3],
    ["task-followup", "Follow up with Priya about platform roles", "Network", "today", "medium", 20, null, null, "goal-career", null, 4],
    ["task-rerank", "Compare reranking approaches", "Learn", "week", "medium", 75, "skill-rag", "project-rag", "goal-rag", "mile-search", 5],
    ["task-eval", "Define retrieval evaluation dataset", "Build", "week", "medium", 120, "skill-rag", "project-rag", "goal-rag", "mile-eval", 6],
    ["task-docker", "Containerize the retrieval API", "Build", "month", "medium", 120, "skill-docker", "project-rag", "goal-rag", null, 7],
    ["task-k8s", "Review Kubernetes deployment basics", "Learn", "backlog", "low", 90, "skill-k8s", null, "goal-career", null, 8],
  ].map(([id, title, type, status, priority, minutes, skill_id, project_id, goal_id, milestone_id, sort_order]) => ({
    ...row(String(id)), title: String(title), description: "", type: type as AppData["tasks"][number]["type"], status: status as AppData["tasks"][number]["status"], priority: priority as AppData["tasks"][number]["priority"],
    estimated_minutes: Number(minutes), actual_minutes: 0, due_date: status === "today" ? isoDay() : null, scheduled_date: status === "today" ? isoDay() : null,
    scheduled_start: null, scheduled_end: null, skill_id: skill_id ? String(skill_id) : null, project_id: project_id ? String(project_id) : null,
    goal_id: goal_id ? String(goal_id) : null, milestone_id: milestone_id ? String(milestone_id) : null, application_id: null, contact_id: null,
    completed_at: null, sort_order: Number(sort_order), tags: [], recurrence: null, evidence_required: false,
  }));
  data.contacts = [
    { ...row("contact-priya"), name: "Priya Shah", company: "Northstar AI", role: "Engineering Manager", linkedin_url: "", email: "", location: "Bengaluru", relationship_stage: "Warm", topics: ["GenAI", "Platform"], notes: "Discussed production evaluation practices.", date_connected: isoDay(-40), last_interaction: isoDay(-12), next_followup: isoDay(-1) },
    { ...row("contact-rahul"), name: "Rahul Mehta", company: "Vector Labs", role: "Staff Engineer", linkedin_url: "", email: "", location: "Remote", relationship_stage: "Connected", topics: ["RAG", "Search"], notes: "Shared a retrieval benchmarking article.", date_connected: isoDay(-8), last_interaction: isoDay(-8), next_followup: isoDay(3) },
  ];
  data.interview_questions = [
    { ...row("question-rag"), question: "How would you evaluate a production RAG system?", answer: "Cover retrieval recall, answer faithfulness, latency, and human review.", category: "AI/LLM", difficulty: "Hard", status: "Learning", confidence: 2, skill_id: "skill-rag", last_practiced: isoDay(-5), practice_count: 2 },
    { ...row("question-cache"), question: "Design a cache for a high-traffic API.", answer: "Discuss invalidation, consistency, and observability.", category: "System Design", difficulty: "Medium", status: "Practiced", confidence: 3, skill_id: null, last_practiced: isoDay(-3), practice_count: 3 },
    { ...row("question-project"), question: "Tell me about a difficult architecture trade-off.", answer: "Use the RAG permission boundary as a STAR story.", category: "Behavioral", difficulty: "Medium", status: "New", confidence: 1, skill_id: null, last_practiced: null, practice_count: 0 },
  ];
  data.interview_stories = [{ ...row("story-permission"), title: "Choosing an ACL-aware retrieval design", situation: "A retrieval assistant needed to serve sensitive internal documents.", task: "Prevent unauthorized context from reaching generation.", action: "Enforced access filters in retrieval and added tests for cross-tenant leakage.", result: "The design produced attributable answers without crossing document permissions.", lessons: "Authorization belongs in retrieval, not just the UI.", project_id: "project-rag", tags: ["architecture", "security"] }];
  data.job_applications = [
    { ...row("job-northstar"), company: "Northstar AI", role: "GenAI Engineer", location: "Bengaluru", work_type: "Hybrid", job_url: "", job_description: "Build reliable retrieval applications with Python, vector search, evaluation, and cloud deployment.", salary_range: "", date_found: isoDay(-6), date_applied: isoDay(-3), status: "Applied", recruiter: "", recruiter_linkedin: "", resume_version: "GenAI v2", notes: "Tailored portfolio section.", followup_date: isoDay(4), priority: "high" },
    { ...row("job-vector"), company: "Vector Labs", role: "AI Platform Engineer", location: "Remote", work_type: "Remote", job_url: "", job_description: "Python, Kubernetes, observability, LLM evaluation, and distributed systems.", salary_range: "", date_found: isoDay(-2), date_applied: null, status: "Saved", recruiter: "", recruiter_linkedin: "", resume_version: "", notes: "Need stronger Kubernetes evidence.", followup_date: null, priority: "medium" },
  ];
  data.planner_blocks = [
    { ...row("block-rag"), task_id: "task-hybrid", title: "Hybrid retrieval", block_date: isoDay(), start_time: "07:00", end_time: "08:30" },
    { ...row("block-project"), task_id: "task-portfolio", title: "Architecture decision", block_date: isoDay(), start_time: "18:30", end_time: "19:30" },
    { ...row("block-interview"), task_id: "task-interview", title: "Interview practice", block_date: isoDay(), start_time: "21:00", end_time: "21:45" },
  ];
  data.resources = [{ ...row("resource-eval"), title: "RAG evaluation checklist", url: "https://example.com/rag-evaluation", source_type: "Article", skill_id: "skill-rag", project_id: "project-rag", status: "To Review", priority: "medium", notes: "Compare metrics with our baseline." }];
  data.evidence = [{ ...row("evidence-architecture"), title: "Permission boundary design", kind: "architecture", url: "", description: "Documented ACL-aware retrieval design and trade-offs.", skill_id: "skill-rag", project_id: "project-rag", goal_id: "goal-rag" }];
  data.activity_log = [{ ...row("activity-seed"), entity_type: "project", entity_id: "project-rag", action: "updated", summary: "Started permission-aware retrieval architecture", occurred_at: new Date(Date.now() - 86400000).toISOString(), metadata: {} }];
  return data;
}
