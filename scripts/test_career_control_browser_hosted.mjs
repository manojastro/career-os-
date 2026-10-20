// Hosted UI simulation against an intercepted fixture backend. No production data or real keys.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const origin = process.env.CONTROL_TEST_ORIGIN ?? "http://127.0.0.1:4175";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("Local fixture server required");
const uid = "00000000-0000-4000-8000-000000000001",
  nid = "00000000-0000-4000-8000-000000000002";
const timestamp = () => new Date().toISOString();
let revision = 1,
  rejected = 0;
let note = {
  id: nid,
  user_id: uid,
  title: "Fixture remote note",
  content: "<p>Original remote note</p>",
  created_at: timestamp(),
  updated_at: timestamp(),
  deleted_at: null,
  tags: [],
  entity_type: null,
  entity_id: null,
  source_url: "",
};
const user = {
  id: uid,
  email: "fixture@example.test",
  aud: "authenticated",
  role: "authenticated",
  created_at: timestamp(),
  app_metadata: { provider: "email" },
  user_metadata: {},
};
const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const jwt =
  enc({ alg: "HS256", typ: "JWT" }) +
  "." +
  enc({
    sub: uid,
    role: "authenticated",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  }) +
  ".fixture-only-signature";
const session = {
  access_token: jwt,
  refresh_token: "fixture-only-refresh-token",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: "bearer",
  user,
};
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  timezoneId: "Asia/Kolkata",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await context.routeWebSocket("wss://example.supabase.co/**", (socket) => socket.close());
await context.route("https://example.supabase.co/**", async (route) => {
  const req = route.request(),
    url = new URL(req.url());
  let data = [];
  if (url.pathname === "/auth/v1/user") data = user;
  else if (url.pathname.includes("/rest/v1/control_changes")) data = [{ sequence: revision }];
  else if (url.pathname.includes("/rest/v1/rpc/workspace_write")) {
    const input = req.postDataJSON();
    if (input.p_entity !== "notes" || input.p_expected !== note.updated_at) {
      rejected++;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ code: "P0001", message: "revision_conflict" }),
      });
      return;
    }
    note = { ...note, ...input.p_values, updated_at: timestamp() };
    revision++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "completed", changes: [{ record: note }] }),
    });
    return;
  } else if (url.pathname.includes("/rest/v1/notes")) {
    if (req.method() === "PATCH") {
      if (url.searchParams.get("updated_at") !== "eq." + note.updated_at) {
        rejected++;
        await route.fulfill({
          status: 406,
          contentType: "application/json",
          body: JSON.stringify({
            code: "PGRST116",
            message: "Fixture version conflict",
            details: "0 rows",
          }),
        });
        return;
      }
      note = { ...note, ...req.postDataJSON() };
      revision++;
    }
    data = [note];
  } else if (url.pathname.includes("/rest/v1/profiles"))
    data = [{ id: uid, display_name: "Fixture owner", onboarded_at: timestamp() }];
  else if (url.pathname.includes("/rest/v1/tasks"))
    data = [
      {
        id: nid,
        user_id: uid,
        title: "Completed fixture",
        status: "completed",
        type: "Build",
        actual_minutes: 45,
        estimated_minutes: 45,
        scheduled_date: null,
        due_date: null,
        created_at: timestamp(),
        completed_at: timestamp(),
        deleted_at: null,
        sort_order: 0,
        tags: [],
      },
    ];
  else if (url.pathname.includes("/rest/v1/focus_sessions"))
    data = [
      {
        id: uid,
        user_id: uid,
        task_id: nid,
        started_at: timestamp(),
        ended_at: timestamp(),
        duration_minutes: 45,
        created_at: timestamp(),
        deleted_at: null,
      },
    ];
  const singular = req.headers()["accept"]?.includes("vnd.pgrst.object");
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(singular && Array.isArray(data) ? (data[0] ?? null) : data),
  });
});
await page.addInitScript(
  ({ session }) => {
    localStorage.removeItem("career-os-demo-mode");
    localStorage.setItem("sb-example-auth-token", JSON.stringify(session));
  },
  { session },
);
const results = [];
try {
  await page.goto(origin + "/more", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  const editor = page.locator('[aria-label="Note content"]');
  await expect(editor).toContainText("Original remote note");
  note = {
    ...note,
    content: "<p>Remote update from Telegram fixture</p>",
    updated_at: timestamp(),
  };
  revision++;
  await expect(editor).toContainText("Remote update from Telegram fixture", { timeout: 22000 });
  results.push({
    case: "Idle rich note receives backend revision without reopening",
    status: "PASS",
    scope: "local hosted UI with intercepted backend",
  });
  await editor.fill("Owner local draft still in progress");
  note = {
    ...note,
    content: "<p>New server revision during local draft</p>",
    updated_at: timestamp(),
  };
  revision++;
  await expect(page.getByRole("button", { name: "Copy local draft", exact: true })).toBeVisible();
  await expect(editor).toContainText("Owner local draft still in progress");
  expect(rejected).toBe(1);
  expect(note.content).toContain("New server revision");
  results.push({
    case: "Stale autosave rejected, local draft retained, remote note preserved",
    status: "PASS",
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(editor).toContainText("Owner local draft still in progress");
  results.push({
    case: "Conflicting draft survives navigation and reload in the same tab",
    status: "PASS",
  });
  await expect(
    page.getByRole("status").filter({ hasText: "This note changed elsewhere" }),
  ).toBeVisible({ timeout: 22000 });
  await page.getByRole("button", { name: "Discard local draft and reload", exact: true }).click();
  await expect(editor).toContainText("New server revision during local draft");
  results.push({ case: "Explicit draft discard loads latest backend revision", status: "PASS" });
  await page.getByLabel("Title", { exact: true }).fill("Unsaved local title fixture");
  note = { ...note, title: "New remote title fixture", updated_at: timestamp() };
  revision++;
  await expect(page.getByRole("button", { name: "Reload saved title", exact: true })).toBeVisible({
    timeout: 22000,
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Unsaved local title fixture",
  );
  results.push({
    case: "Conflicting title draft survives reload without overwriting the remote title",
    status: "PASS",
  });
  await page.goto(origin + "/today", { waitUntil: "networkidle" });
  await expect(page.locator(".summary-item").filter({ hasText: "Actual" })).toContainText("45m");
  results.push({
    case: "Completed task focus minutes remain in Today actual time",
    status: "PASS",
  });
  expect(errors).toEqual([]);
  results.push({ case: "No page errors in hosted UI simulation", status: "PASS" });
  const dir = path.resolve("test-artifacts/control");
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, "today-hosted-fixture.png"), fullPage: true });
  await writeFile(
    path.join(dir, "hosted-results.json"),
    JSON.stringify(
      {
        scope:
          "Intercepted local backend; no production session, Supabase writes or Telegram messages",
        results,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: results.length, errors, rejected_stale_saves: rejected }));
} finally {
  await context.close();
  await browser.close();
}
