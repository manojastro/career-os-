"use client";

import { PageHeading, Section } from "@/components/ui";
import { DashboardPage } from "./dashboard/DashboardPage";
import { TodayPage } from "./today/TodayPage";
import { TasksPage } from "./tasks/TasksPage";
import { PlannerPage } from "./planner/PlannerPage";
import { GoalsPage } from "./goals/GoalsPage";
import { SkillsPage } from "./skills/SkillsPage";
import { ProjectsPage } from "./projects/ProjectsPage";
import { DailyLogPage } from "./daily-log/DailyLogPage";

export function PageRouter({ section, openCapture, openTask }: { section: string; openCapture: () => void; openTask: () => void }) {
  switch (section) {
    case "dashboard": return <DashboardPage openCapture={openCapture} />;
    case "today": return <TodayPage openTask={openTask} />;
    case "tasks": return <TasksPage openTask={openTask} />;
    case "planner": return <PlannerPage />;
    case "goals": return <GoalsPage />;
    case "skills": return <SkillsPage />;
    case "projects": return <ProjectsPage />;
    case "daily-log": return <DailyLogPage />;
    default: return <><PageHeading title={section.replaceAll("-", " ")} subtitle="This workspace is being connected to your career records." /><Section title="Coming together"><div className="empty">More tools will appear here.</div></Section></>;
  }
}
