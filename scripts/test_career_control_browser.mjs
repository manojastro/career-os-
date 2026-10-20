import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const origin = process.env.CONTROL_TEST_ORIGIN ?? "http://127.0.0.1:4175";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname))
  throw new Error("This fixture smoke test only permits a local demo server.");
const dir = path.resolve("test-artifacts/control");
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  timezoneId: "Asia/Kolkata",
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem("career-os-demo-mode", "1"));
const results = [];
try {
  await page.goto(origin + "/planner", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Time block", exact: true }).click();
  await page.locator("#block-title").fill("Fixture arbitrary-time block");
  await page.locator("#block-start").fill("08:30");
  await page.locator("#block-end").fill("09:45");
  await page.getByRole("button", { name: "Save block", exact: true }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.getByText("Fixture arbitrary-time block")).toBeVisible();
  await page.screenshot({ path: path.join(dir, "planner.png"), fullPage: true });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.getByText("Fixture arbitrary-time block")).toBeVisible();
  results.push({
    case: "Arbitrary 08:30 planner slot visible and persists on reopen",
    status: "PASS",
    scope: "local demo",
  });
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
    "/agent",
    "/vault",
    "/learning",
  ];
  for (const route of routes) {
    await page.goto(origin + route, { waitUntil: "networkidle" });
    await expect(page.locator("body")).not.toContainText("Something went wrong");
    results.push({ case: "Render " + route, status: "PASS", scope: "local demo navigation only" });
  }
  await page.goto(origin + "/more", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON backup", exact: true }).click();
  const download = await pending;
  await download.saveAs(path.join(dir, "fixture-export.json"));
  const exported = JSON.parse(await readFile(path.join(dir, "fixture-export.json"), "utf8"));
  if (
    exported.source !== "demo" ||
    !exported.data.planner_blocks.some((b) => b.title === "Fixture arbitrary-time block")
  )
    throw new Error("Export did not contain the saved fixture");
  results.push({
    case: "Real JSON file includes persisted fixture",
    status: "PASS",
    scope: "local demo browser download",
  });
  const response = await context.request.post(origin + "/api/agent/control", { data: {} });
  expect(response.status()).toBe(503);
  results.push({
    case: "Local unconfigured owner control API fails closed",
    status: "PASS",
    scope: "local HTTP boundary",
  });
  expect(errors).toEqual([]);
  results.push({ case: "No browser page errors across tested routes", status: "PASS" });
  await writeFile(
    path.join(dir, "results.json"),
    JSON.stringify(
      {
        origin,
        scope: "Isolated local demo; no authenticated Supabase writes or live Telegram controls.",
        results,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ passed: results.length, errors, artifact: path.join(dir, "results.json") }),
  );
} finally {
  await context.close();
  await browser.close();
}
