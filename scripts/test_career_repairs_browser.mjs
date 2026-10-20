import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const origin = process.env.CONTROL_TEST_ORIGIN ?? "http://127.0.0.1:4175";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname))
  throw new Error("Local fixture server only");
const dir = "test-artifacts/repairs";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
    timezoneId: "Asia/Kolkata",
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
const errors = [],
  results = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem("career-os-demo-mode", "1"));
const pass = (name) =>
  results.push({ scenario: name, status: "PASS", scope: "local demo browser" });
try {
  await page.goto(origin + "/today", { waitUntil: "networkidle" });
  await page.clock.install();
  await page
    .getByRole("button", { name: /^Focus on / })
    .first()
    .click();
  await expect(page.getByRole("dialog", { name: "Focus session" })).toBeVisible();
  await page.clock.fastForward(65000);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("dialog", { name: "Focus session" })).toBeVisible();
  const raw = await page.evaluate(() => JSON.parse(localStorage.getItem("career-os-focus:demo")));
  const taskId = raw.taskId;
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("career-os-focus:demo")).elapsedMs,
  );
  await page.clock.fastForward(30000);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("career-os-focus:demo")).elapsedMs),
  ).toBe(before);
  pass("Running refresh restores timer; paused refresh does not add paused time");
  await page.getByRole("button", { name: "Complete task", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Focus session" })).toHaveCount(0);
  await page.reload({ waitUntil: "networkidle" });
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("career-os-demo-v4")));
  expect(state.focus_sessions.filter((s) => s.id === raw.id)).toHaveLength(1);
  expect(state.tasks.find((t) => t.id === taskId).status).toBe("completed");
  expect(state.tasks.find((t) => t.id === taskId).completed_at).toBeTruthy();
  pass("Recovered Focus completes once and persists ledger plus completion timestamp");
  await page.goto(origin + "/copilot", { waitUntil: "networkidle" });
  let providerCalls = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/ai/command")) providerCalls++;
  });
  await page.getByLabel("Copilot command").fill("Create a high-priority task to review FastAPI");
  await page.getByRole("button", { name: "Run command" }).click();
  await page.getByRole("button", { name: "Confirm 1 change", exact: true }).click();
  await expect(page.getByRole("button", { name: "All saved", exact: true })).toBeVisible();
  expect(providerCalls).toBe(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("career-os-demo-v4")).tasks.find(
          (t) => t.title === "review FastAPI",
        ).priority,
    ),
  ).toBe("high");
  pass("Demo Copilot uses local rules and preserves confirmed High priority");
  await page.keyboard.press("/");
  await page.getByPlaceholder("Search tasks, skills, projects, contacts…").fill("review FastAPI");
  await page.getByRole("button", { name: "review FastAPI", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Manage workspace records" })).toBeVisible();
  await expect(page.locator("#record-title")).toHaveValue("review FastAPI");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]'))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  pass("Search opens exact matching record; reverse Tab stays in modal; Escape closes");
  const routes = [
    "/",
    "/today",
    "/tasks",
    "/goals",
    "/skills",
    "/projects",
    "/networking",
    "/interviews",
    "/jobs",
    "/daily-log",
    "/more",
    "/settings",
    "/planner",
    "/copilot",
  ];
  for (const width of [360, 760, 768, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await page.goto(origin + route, { waitUntil: "networkidle" });
      const measured = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(measured.doc, `${route} at ${width}`).toBeLessThanOrEqual(measured.viewport + 1);
    }
    pass(`No document overflow across 14 routes at ${width}px`);
  }
  await page.screenshot({ path: dir + "/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
  pass("No browser page errors in repair scenarios");
} catch (e) {
  results.push({ scenario: "Browser repair regression", status: "FAIL", actual: String(e) });
  await page.screenshot({ path: dir + "/failure.png", fullPage: true });
  throw e;
} finally {
  await writeFile(
    dir + "/results.json",
    JSON.stringify(
      { scope: "Isolated local demo, no production writes or external messages", results, errors },
      null,
      2,
    ),
  );
  await context.close();
  await browser.close();
  console.log(JSON.stringify({ results, errors }));
}
