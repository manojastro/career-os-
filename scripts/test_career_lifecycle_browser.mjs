import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.CONTROL_TEST_ORIGIN ?? "http://127.0.0.1:4175";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("Local fixtures only");
const browser = await chromium.launch({ channel: "msedge", headless: true }),
  context = await browser.newContext({
    timezoneId: "Asia/Kolkata",
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
const results = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
await page.addInitScript(() => localStorage.setItem("career-os-demo-mode", "1"));
const read = () => page.evaluate(() => JSON.parse(localStorage.getItem("career-os-demo-v4")));
const pass = (scenario) => results.push({ scenario, status: "PASS", scope: "local demo browser" });
try {
  await page.goto(origin + "/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Manage records", exact: true }).click();
  await page.locator("#records-type").selectOption("goals");
  await page.getByRole("button", { name: "New record", exact: true }).click();
  await page.locator("#record-title").fill("Fixture lifecycle goal");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect
    .poll(async () => (await read()).goals.some((g) => g.title === "Fixture lifecycle goal"))
    .toBe(true);
  const goal = (await read()).goals.find((g) => g.title === "Fixture lifecycle goal");
  await page.locator("#record-status").selectOption("completed");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page.getByRole("button", { name: "Fixture lifecycle goal", exact: true }).click();
  await expect(page.locator("#record-status")).toHaveValue("completed");
  pass("Create and edit a goal; completed goals remain accessible");
  await page.getByRole("button", { name: "Delete record", exact: true }).click();
  await expect.poll(async () => (await read()).goals.some((g) => g.id === goal.id)).toBe(false);
  await page.getByRole("button", { name: "Deleted records", exact: true }).click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect
    .poll(async () => (await read()).goals.filter((g) => g.id === goal.id).length)
    .toBe(1);
  pass("Confirmed record delete and explicit restore preserve the original identity");
  await page.locator("#records-type").selectOption("tasks");
  await page.getByRole("button", { name: "New record", exact: true }).click();
  await page.locator("#record-title").fill("Fixture canonical parent task");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect
    .poll(async () => (await read()).tasks.some((t) => t.title === "Fixture canonical parent task"))
    .toBe(true);
  const task = (await read()).tasks.find((t) => t.title === "Fixture canonical parent task");
  await page.locator("#record-repeat").selectOption("weekly");
  await expect
    .poll(
      async () => JSON.parse((await read()).tasks.find((t) => t.id === task.id).recurrence).cadence,
    )
    .toBe("weekly");
  await page.locator("#record-status").selectOption("completed");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect
    .poll(async () => Boolean((await read()).tasks.find((t) => t.id === task.id).repeat_child_id))
    .toBe(true);
  const afterRepeat = await read(),
    successor = afterRepeat.tasks.find(
      (t) => t.id === afterRepeat.tasks.find((t) => t.id === task.id).repeat_child_id,
    );
  expect(successor.actual_minutes).toBe(0);
  expect(successor.status).toBe("backlog");
  pass("Owner opt-in recurrence creates one zero-progress next task after completion");
  await page.locator("#records-type").selectOption("task_subtasks");
  await page.getByRole("button", { name: "New record", exact: true }).click();
  await page.locator("#record-title").fill("Fixture child outcome");
  await page.locator("#record-task_id").selectOption(task.id);
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page.getByLabel("Completed", { exact: true }).check();
  await expect
    .poll(
      async () =>
        (await read()).task_subtasks.find((t) => t.title === "Fixture child outcome")?.completed_at,
    )
    .toBeTruthy();
  await page.getByLabel("Completed", { exact: true }).uncheck();
  await expect
    .poll(
      async () =>
        (await read()).task_subtasks.find((t) => t.title === "Fixture child outcome")?.completed_at,
    )
    .toBeNull();
  pass("Create a linked subtask, complete and reopen it without inventing time");
  await page.keyboard.press("Escape");
  await page.goto(origin + "/planner", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Time block", exact: true }).click();
  await page.locator("#block-title").fill("Fixture editable planner");
  await page.locator("#block-start").fill("08:30");
  await page.locator("#block-end").fill("09:30");
  await page.getByRole("button", { name: "Save block", exact: true }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page.getByRole("button").filter({ hasText: "Fixture editable planner" }).click();
  await page.locator("#block-start").fill("08:45");
  await page.getByRole("button", { name: "Save block", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await read()).planner_blocks.find((b) => b.title === "Fixture editable planner")
          ?.start_time,
    )
    .toBe("08:45");
  await page.getByRole("button").filter({ hasText: "Fixture editable planner" }).click();
  await page.getByRole("button", { name: "Delete block", exact: true }).click();
  await expect
    .poll(async () =>
      (await read()).planner_blocks.some((b) => b.title === "Fixture editable planner"),
    )
    .toBe(false);
  pass("Planner block edit/delete persists arbitrary times");
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.locator(".table-wrap")).toContainText(
    String(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()),
  );
  pass("Month view includes the actual final day of the current calendar month");
  await page.goto(origin + "/jobs", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Kanban", exact: true }).click();
  const application = (await read()).job_applications[0],
    transfer = await page.evaluateHandle(() => new DataTransfer());
  const card = page.locator("article.kanban-card").filter({ hasText: application.company }).first();
  await card.dispatchEvent("dragstart", { dataTransfer: transfer });
  await page
    .locator(".kanban-col")
    .filter({ has: page.locator(".kanban-head").getByText("Hiring Manager", { exact: true }) })
    .dispatchEvent("drop", { dataTransfer: transfer });
  await expect
    .poll(async () => (await read()).job_applications.find((a) => a.id === application.id).status)
    .toBe("Hiring Manager");
  pass("Kanban drag/drop saves the actual supported application stage");
  await page.reload({ waitUntil: "networkidle" });
  expect((await read()).tasks.find((t) => t.id === task.id).actual_minutes).toBe(0);
  expect(errors).toEqual([]);
  pass("Lifecycle changes survive reload; no extra minutes or page errors");
} catch (error) {
  results.push({ scenario: "Lifecycle regression", status: "FAIL", actual: String(error) });
  await mkdir("test-artifacts/lifecycle", { recursive: true });
  await page.screenshot({ path: "test-artifacts/lifecycle/failure.png", fullPage: true });
  throw error;
} finally {
  await mkdir("test-artifacts/lifecycle", { recursive: true });
  await writeFile(
    "test-artifacts/lifecycle/results.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(JSON.stringify({ results, errors }));
  await context.close();
  await browser.close();
}
