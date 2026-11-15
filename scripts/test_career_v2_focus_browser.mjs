// Hosted UI simulation against an intercepted fixture backend. No production data or real keys.
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const origin = process.env.CONTROL_TEST_ORIGIN ?? "http://127.0.0.1:4178";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("Local fixture server required");
const uid = "00000000-0000-4000-8000-000000000001",
  nid = "00000000-0000-4000-8000-000000000002";
const timestamp = () => new Date().toISOString();
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
import { createV2Database, asRole } from "../src/lib/agent-v2/__tests__/database.ts";
const db = await createV2Database();
await db.query(
  "INSERT INTO tasks(id,user_id,title,type) VALUES($1,$2,'Remote LangGraph task','Build')",
  [nid, uid],
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  timezoneId: "Asia/Kolkata",
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
const outstanding = new Set();
page.on("request", (r) => outstanding.add(r.url()));
page.on("requestfinished", (r) => outstanding.delete(r.url()));
page.on("requestfailed", (r) => outstanding.delete(r.url()));
page.on("pageerror", (e) => errors.push(e.message));
await context.routeWebSocket("wss://example.supabase.co/**", (socket) => socket.close());
await context.route("https://example.supabase.co/**", async (route) => {
  const req = route.request(),
    url = new URL(req.url());
  let data = [];
  if (url.pathname === "/auth/v1/user") data = user;
  else if (url.pathname.includes("/profiles"))
    data = [{ id: uid, display_name: "Fixture owner", onboarded_at: timestamp() }];
  else if (url.pathname.includes("/tasks")) {
    await db.exec("RESET ROLE");
    data = (await db.query("SELECT * FROM tasks WHERE user_id=$1", [uid])).rows;
  } else if (url.pathname.includes("/focus_sessions")) {
    await db.exec("RESET ROLE");
    data = (await db.query("SELECT * FROM focus_sessions WHERE user_id=$1", [uid])).rows;
  }
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(
      req.headers()["accept"]?.includes("vnd.pgrst.object") && Array.isArray(data)
        ? (data[0] ?? null)
        : data,
    ),
  });
});
let failOnce = false;
const mutations = [];
await context.route(origin + "/api/v2", async (route) => {
  const body = route.request().postDataJSON();
  try {
    await asRole(db, "authenticated");
    const result = (
      await db.query("SELECT agent_v2_focus($1,$2,$3) r", [
        uid,
        "web:" + body.request_id,
        JSON.stringify(body.input),
      ])
    ).rows[0].r;
    if (body.input.action !== "status") mutations.push(body);
    if (failOnce && body.input.action === "finish") {
      failOnce = false;
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  } catch (e) {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: e.message }),
    });
  }
});
await context.route(origin + "/api/learning/focus", async (route) => {
  const b = route.request().postDataJSON();
  try {
    await asRole(db, "authenticated");
    // Legacy RPC is invoker; grant its existing canonical-table rights only in this fixture.
    await db.exec(
      "RESET ROLE; GRANT SELECT,INSERT,UPDATE ON tasks,focus_sessions,learning_sessions,learning_assignments TO authenticated",
    );
    await asRole(db, "authenticated");
    const r = (
      await db.query("SELECT learning_record_focus($1,$2,$3,$4,$5,$6,$7) r", [
        uid,
        b.task_id,
        b.session_id,
        b.started_at,
        b.ended_at,
        b.minutes,
        b.complete,
      ])
    ).rows[0].r;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(r) });
  } catch (e) {
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: e.message }),
    });
  }
});
await page.addInitScript(
  ({ session }) => {
    localStorage.removeItem("career-os-demo-mode");
    localStorage.setItem("sb-example-auth-token", JSON.stringify(session));
  },
  { session },
);
try {
  await page.goto(origin + "/tasks", { waitUntil: "networkidle" });
  await asRole(db, "service_role");
  const remote = (
    await db.query("SELECT agent_v2_focus($1,'tg:fixture:42:start',$2) r", [
      uid,
      JSON.stringify({ action: "start", task_id: nid }),
    ])
  ).rows[0].r.session;
  await expect(page.getByRole("button", { name: "Open Focus", exact: true })).toBeVisible({
    timeout: 12000,
  });
  await page.getByRole("button", { name: "Open Focus", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Shared Focus session" })).toBeVisible();
  await page.getByRole("button", { name: "Minimize", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Shared Focus session" })).not.toBeVisible();
  await db.exec("RESET ROLE");
  expect(
    (await db.query("SELECT state FROM agent_v2_focus_intervals WHERE id=$1", [remote.id])).rows[0]
      .state,
  ).toBe("running");
  await page.getByRole("button", { name: "Open Focus", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await db.exec("RESET ROLE");
  await db.query(
    "UPDATE agent_v2_focus_intervals SET elapsed_ms=125000,started_at=now()-interval '130 seconds' WHERE id=$1",
    [remote.id],
  );
  failOnce = true;
  await page.getByRole("button", { name: "Complete task", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry request", exact: true })).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open Focus", exact: true }).click();
  await page.getByRole("button", { name: "Retry request", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry request", exact: true })).not.toBeVisible();
  await db.exec("RESET ROLE");
  expect(
    (await db.query("SELECT duration_minutes FROM focus_sessions WHERE id=$1", [remote.id])).rows,
  ).toEqual([{ duration_minutes: 2 }]);
  expect(
    (await db.query("SELECT status,actual_minutes FROM tasks WHERE id=$1", [nid])).rows,
  ).toEqual([{ status: "completed", actual_minutes: 2 }]);
  const finishes = mutations.filter((x) => x.input.action === "finish");
  expect(finishes).toHaveLength(2);
  expect(finishes[0].request_id).toBe(finishes[1].request_id);
  await page.getByRole("button", { name: "Minimize", exact: true }).click();
  await db.query("UPDATE tasks SET status='today' WHERE id=$1", [nid]);
  await asRole(db, "service_role");
  const again = (
    await db.query("SELECT agent_v2_focus($1,'tg:fixture:43:start',$2) r", [
      uid,
      JSON.stringify({ action: "start", task_id: nid }),
    ])
  ).rows[0].r.session;
  await expect(page.getByRole("button", { name: "Open Focus", exact: true })).toBeVisible({
    timeout: 12000,
  });
  await page.getByRole("button", { name: "Open Focus", exact: true }).click();
  await asRole(db, "service_role");
  await db.query("SELECT agent_v2_focus($1,'tg:fixture:44:cancel',$2)", [
    uid,
    JSON.stringify({ action: "cancel", session_id: again.id }),
  ]);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Dismiss rejected request", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss rejected request", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry request", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Minimize", exact: true }).click();
  const legacyId = "00000000-0000-4000-8000-000000000099";
  await page.evaluate(
    ({ uid, nid, legacyId }) =>
      localStorage.setItem(
        "career-os-focus:" + uid,
        JSON.stringify({
          version: 1,
          id: legacyId,
          taskId: nid,
          startedAt: new Date(Date.now() - 120000).toISOString(),
          elapsedMs: 120000,
          runningSince: null,
        }),
      ),
    { uid, nid, legacyId },
  );
  await asRole(db, "service_role");
  await db.query("SELECT agent_v2_focus($1,'tg:fixture:45:start',$2)", [
    uid,
    JSON.stringify({ action: "start", task_id: nid }),
  ]);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("Recovered local timer.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Stop & save", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "overlaps shared Focus" })).toBeVisible();
  expect(
    await page.evaluate(
      (uid) => JSON.parse(localStorage.getItem("career-os-focus:" + uid)).id,
      uid,
    ),
  ).toBe(legacyId);
  await db.exec("RESET ROLE");
  expect(
    (await db.query("SELECT count(*)::int n FROM focus_sessions WHERE id=$1", [legacyId])).rows[0]
      .n,
  ).toBe(0);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Discard timer", exact: true }).click();
  await expect(page.getByText("Recovered local timer.", { exact: false })).not.toBeVisible();
  expect(errors).toEqual([]);
  const out = path.resolve("test-artifacts/v2-focus");
  await mkdir(out, { recursive: true });
  await page.screenshot({ path: path.join(out, "shared-focus.png"), fullPage: true });
  await writeFile(
    path.join(out, "result.json"),
    JSON.stringify(
      {
        status: "PASS",
        scope: "local intercepted hosted browser + real embedded PostgreSQL",
        cases: [
          "remote interval appears",
          "minimize does not stop",
          "pause persisted",
          "lost finish response survives reload",
          "retry creates exactly one ledger entry",
          "canonical task completed",
          "stale command visibly rejected and dismissible",
          "legacy overlap remains unsaved until explicit discard",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log("PASS: 8 shared Focus browser scenarios; canonical ledger exactly once");
} catch (e) {
  console.error({
    errors,
    outstanding: [...outstanding],
    url: page.url(),
    body: (await page.locator("body").innerText()).slice(0, 1200),
  });
  throw e;
} finally {
  await browser.close();
  await db.close();
}
