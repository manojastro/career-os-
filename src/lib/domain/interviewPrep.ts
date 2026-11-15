import type { JobGap } from "./jobGap";
import type { AppData, InterviewQuestion } from "./types";

const RANK: Record<InterviewQuestion["status"], number> = {
  New: 0,
  Learning: 1,
  Practiced: 2,
  Strong: 3,
};
const mentions = (text: string, name: string) =>
  new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i").test(
    text,
  );
const skillFor = (data: AppData, name: string) =>
  data.skills.find((skill) => skill.name.toLowerCase() === name.toLowerCase());

/**
 * Interview prep for one application. Questions link to a job through its requirements: the
 * matching skill or the requirement named in the question text. Weakest questions come first.
 */
export function interviewPrep(data: AppData, applicationId: string, gap: JobGap[]) {
  const found = new Map<string, InterviewQuestion>();
  const uncovered: string[] = [];
  for (const { name } of gap) {
    const skill = skillFor(data, name);
    const matches = data.interview_questions.filter(
      (q) => !q.deleted_at && ((skill && q.skill_id === skill.id) || mentions(q.question, name)),
    );
    if (!matches.length) uncovered.push(name);
    for (const q of matches) found.set(q.id, q);
  }
  return {
    questions: [...found.values()].sort(
      (a, b) =>
        RANK[a.status] - RANK[b.status] ||
        a.confidence - b.confidence ||
        a.question.localeCompare(b.question),
    ),
    uncovered,
    interviews: (data.job_interviews ?? [])
      .filter((row) => row["application_id"] === applicationId && !row.deleted_at)
      .sort((a, b) =>
        String(a["scheduled_at"] ?? "~").localeCompare(String(b["scheduled_at"] ?? "~")),
      ),
  };
}

/** Plain practice prompts for uncovered requirements; the owner reviews them before saving. */
export function draftPrepQuestions(names: string[], gap: JobGap[], data: AppData) {
  return names.map((name) => {
    const known = ["Strong", "Developing"].includes(
      gap.find((g) => g.name === name)?.assessment ?? "",
    );
    return {
      question: known
        ? `Walk me through a project where you used ${name}. What was hard, and what did you change?`
        : `Explain ${name} and how you would use it in this role.`,
      answer: "",
      category: (known ? "Project" : "Technical") as InterviewQuestion["category"],
      difficulty: "Medium" as const,
      status: "New" as const,
      confidence: 0,
      skill_id: skillFor(data, name)?.id ?? null,
      last_practiced: null,
      practice_count: 0,
    };
  });
}
