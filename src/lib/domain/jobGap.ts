import { AppData } from "./types";

export interface JobGap {
  name: string;
  assessment: "Strong" | "Developing" | "Gap" | "Unknown";
  evidence: string[];
}

const knownTerms = ["Python", "FastAPI", "RAG", "LangGraph", "Docker", "Kubernetes", "Azure AI", "AWS", "GCP", "Terraform", "PostgreSQL", "React", "TypeScript", "LLM evaluation", "vector search", "observability", "distributed systems", "CI/CD"];

export function analyzeJobDescription(description: string, data: AppData): JobGap[] {
  const terms = [...new Set([...knownTerms, ...data.skills.map((skill) => skill.name)])];
  return assessRequirements(terms.filter((term) => description.toLowerCase().includes(term.toLowerCase())), data);
}

export function assessRequirements(names: string[], data: AppData): JobGap[] {
  return [...new Set(names.map((item) => item.trim()).filter(Boolean))].map((name) => {
    const skill = data.skills.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (!skill) return { name, assessment: "Gap" as const, evidence: [] };
    const evidence = [
      ...data.evidence.filter((item) => item.skill_id === skill.id).map((item) => item.title),
      ...data.tasks.filter((item) => item.skill_id === skill.id && item.status === "completed").map((item) => item.title),
    ].slice(0, 4);
    const assessment = skill.status === "Not Started" ? "Unknown" :
      (skill.status === "Applied" || skill.status === "Interview Ready") && evidence.length > 0 ? "Strong" : "Developing";
    return { name, assessment, evidence };
  });
}
