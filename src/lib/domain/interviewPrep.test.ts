import { it, expect } from "vitest";
import { draftPrepQuestions, interviewPrep } from "./interviewPrep";
import { demoData } from "./seed";
import type { InterviewQuestion } from "./types";
it("prepares for one job from its requirements: weakest matching questions first, gaps drafted", () => {
  const data = demoData();
  const skill = { ...data.skills[0], id: "s-py", name: "Python" };
  data.skills = [skill];
  const q = (id: string, question: string, extra: Partial<InterviewQuestion> = {}) =>
    ({
      ...data.interview_questions[0],
      id,
      question,
      skill_id: null,
      status: "New",
      confidence: 0,
      ...extra,
    }) as InterviewQuestion;
  data.interview_questions = [
    q("strong", "Python generators?", { skill_id: "s-py", status: "Strong", confidence: 4 }),
    q("weak", "How does the GIL affect you?", {
      skill_id: "s-py",
      status: "Learning",
      confidence: 1,
    }),
    q("text", "When would you choose Kubernetes over a VM?"),
    q("other", "Tell me about a conflict"),
  ];
  data.job_interviews = [
    {
      id: "late",
      user_id: "demo",
      created_at: "x",
      application_id: "job",
      stage: "Onsite",
      scheduled_at: "2026-11-20T05:00:00Z",
    },
    {
      id: "soon",
      user_id: "demo",
      created_at: "x",
      application_id: "job",
      stage: "Screen",
      scheduled_at: "2026-11-10T05:00:00Z",
    },
    { id: "elsewhere", user_id: "demo", created_at: "x", application_id: "other", stage: "Screen" },
  ];
  const gap = [
    { name: "Python", assessment: "Developing" as const, evidence: [] },
    { name: "Kubernetes", assessment: "Gap" as const, evidence: [] },
    { name: "Terraform", assessment: "Gap" as const, evidence: [] },
  ];
  const prep = interviewPrep(data, "job", gap);
  expect(prep.questions.map((x) => x.id)).toEqual(["text", "weak", "strong"]);
  expect(prep.uncovered).toEqual(["Terraform"]);
  expect(prep.interviews.map((i) => i.id)).toEqual(["soon", "late"]);
  const drafts = draftPrepQuestions(["Terraform", "Python"], gap, data);
  expect(drafts).toEqual([
    expect.objectContaining({
      question: "Explain Terraform and how you would use it in this role.",
      category: "Technical",
      status: "New",
      skill_id: null,
    }),
    expect.objectContaining({
      question:
        "Walk me through a project where you used Python. What was hard, and what did you change?",
      category: "Project",
      skill_id: "s-py",
    }),
  ]);
});
