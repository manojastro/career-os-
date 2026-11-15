import { mondayOf } from "./insights";
import { APPLICATION_STAGES, AppData, ApplicationStatus } from "./types";

const CLOSED: ApplicationStatus[] = ["Offer", "Rejected", "Withdrawn"];
const RESPONDED: ApplicationStatus[] = [
  "Recruiter Contact",
  "Screening",
  "Technical Interview",
  "Hiring Manager",
  "Final Round",
  "Offer",
  "Rejected",
];
const INTERVIEWED: ApplicationStatus[] = [
  "Screening",
  "Technical Interview",
  "Hiring Manager",
  "Final Round",
  "Offer",
];
const STALE_DAYS = 14;
const days = (from: string, to: string) =>
  Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000);

/**
 * Search health from current stages, applied dates and recorded interviews. Stage history is
 * not stored, so an application rejected after interviewing counts as interviewed only when an
 * interview was recorded; time spent in each stage cannot be measured.
 */
export function jobSearchStats(data: AppData, today: string) {
  const apps = data.job_applications.filter((app) => !app.deleted_at);
  const interviewed = new Set(
    (data.job_interviews ?? []).map((row) => String(row["application_id"])),
  );
  const appliedIndex = APPLICATION_STAGES.indexOf("Applied");
  const applied = apps.filter(
    (app) =>
      !!app.date_applied ||
      (!CLOSED.includes(app.status) && APPLICATION_STAGES.indexOf(app.status) >= appliedIndex) ||
      app.status === "Offer",
  );
  const responded = applied.filter(
    (app) => RESPONDED.includes(app.status) || interviewed.has(app.id),
  ).length;
  const reachedInterview = applied.filter(
    (app) => INTERVIEWED.includes(app.status) || interviewed.has(app.id),
  ).length;
  const rate = (n: number) => (applied.length ? n / applied.length : null);
  const week = mondayOf(new Date(today + "T12:00:00"));
  return {
    byStage: Object.fromEntries(
      APPLICATION_STAGES.map((stage) => [stage, apps.filter((app) => app.status === stage).length]),
    ) as Record<ApplicationStatus, number>,
    active: apps.filter((app) => !CLOSED.includes(app.status)).length,
    applied: applied.length,
    responded,
    interviewed: reachedInterview,
    offers: apps.filter((app) => app.status === "Offer").length,
    responseRate: rate(responded),
    interviewRate: rate(reachedInterview),
    appliedThisWeek: apps.filter((app) => app.date_applied && app.date_applied >= week).length,
    waiting: apps
      .filter(
        (app) =>
          app.status === "Applied" &&
          app.date_applied &&
          days(app.date_applied, today) >= STALE_DAYS,
      )
      .map((app) => ({
        id: app.id,
        label: `${app.company} · ${app.role}`,
        days: days(app.date_applied!, today),
      }))
      .sort((a, b) => b.days - a.days),
    followupsDue: apps
      .filter(
        (app) => !CLOSED.includes(app.status) && app.followup_date && app.followup_date <= today,
      )
      .map((app) => ({
        id: app.id,
        label: `${app.company} · ${app.role}`,
        date: app.followup_date!,
      })),
  };
}
