// Real React hook, synthetic owners and delayed local responses. No provider/database traffic.
import { chromium, expect } from "@playwright/test";
const origin = process.env.CONTROL_TEST_ORIGIN ?? "http://127.0.0.1:4178";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname))
  throw new Error("Local fixture only");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
// Drive refreshes explicitly so automatic polling cannot stand in for an outstanding request.
await page.addInitScript(() => {
  window.setInterval = () => 0;
});
page.on("pageerror", (e) => console.error(e.message));
const requests = [];
const transformed = await (await fetch(origin + "/src/features/focus/useServerFocus.ts")).text();
const reactPath = transformed.match(/"(\/node_modules\/\.vite\/deps\/react\.js\?[^\"]+)"/)[1];
const response = (id, state = "running") => ({
  session: {
    id,
    task_id: "fixture-task",
    state,
    started_at: new Date().toISOString(),
    running_since: null,
    elapsed_ms: 0,
  },
  server_now: new Date().toISOString(),
});
await page.route(origin + "/src/lib/ai-headers.ts*", (r) =>
  r.fulfill({
    contentType: "application/javascript",
    body: 'export async function aiHeaders(){ if(window.headerGate) await window.headerGate; return {"Content-Type":"application/json"}; }',
  }),
);
await page.route(origin + "/__focus_race_fixture", (r) =>
  r.fulfill({
    contentType: "text/html",
    body: `<div id="root"></div><script type="module">
import React from '${reactPath}';
import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
import {useServerFocus} from '/src/features/focus/useServerFocus.ts';
window.events=0;window.callbacks={A:0,B:0};window.addEventListener('career-os-focus-changed',()=>window.events++);
function Fixture(){const [owner,setOwner]=React.useState('A');const value=useServerFocus(owner,()=>window.callbacks[owner]++);window.hook=value;window.setOwner=setOwner;return React.createElement('pre',{id:'state'},JSON.stringify({owner,id:value.session?.id,error:value.error,busy:value.busy}));}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Fixture));</script>`,
  }),
);
await page.route(origin + "/api/v2", (route) => {
  requests.push({ route, input: route.request().postDataJSON().input });
});
const take = async () => {
  await expect.poll(() => requests.length, { timeout: 20000 }).toBeGreaterThan(0);
  return requests.shift();
};
const fulfill = async (req, id, state) =>
  req.route.fulfill({ contentType: "application/json", body: JSON.stringify(response(id, state)) });
const state = () => page.locator("#state");
try {
  await page.goto(origin + "/__focus_race_fixture", { waitUntil: "domcontentloaded" });
  await fulfill(await take(), "initial-A");
  await expect(state()).toContainText('"id":"initial-A"');
  await page.evaluate(
    () =>
      void window.hook.mutate({
        action: "pause",
        session_id: "00000000-0000-4000-8000-000000000001",
      }),
  );
  await fulfill(await take(), "paused-A", "paused");
  const lateA = await take();
  await page.evaluate(() => window.setOwner("B"));
  await fulfill(await take(), "current-B");
  await expect(state()).toContainText('"id":"current-B"');
  const before = await page.evaluate(() => ({
    events: window.events,
    callbacks: window.callbacks.B,
  }));
  await fulfill(lateA, "obsolete-A");
  await page.waitForTimeout(100);
  await expect(state()).toContainText('"id":"current-B"');
  expect(
    await page.evaluate(() => ({ events: window.events, callbacks: window.callbacks.B })),
  ).toEqual(before);
  await page.evaluate(() => window.setOwner("A"));
  await fulfill(await take(), "again-A");
  await page.evaluate(
    () =>
      void window.hook.mutate({
        action: "pause",
        session_id: "00000000-0000-4000-8000-000000000001",
      }),
  );
  await fulfill(await take(), "paused-A", "paused");
  const oldGeneration = await take();
  await page.evaluate(() => window.setOwner("B"));
  await fulfill(await take(), "again-B");
  await page.evaluate(() => window.setOwner("A"));
  await fulfill(await take(), "new-generation-A");
  await fulfill(oldGeneration, "old-generation-A");
  await page.waitForTimeout(100);
  await expect(state()).toContainText('"id":"new-generation-A"');
  await page.evaluate(() => void window.hook.refresh());
  const first = await take();
  await page.evaluate(() => void window.hook.refresh());
  const second = await take();
  await fulfill(second, "latest-status", "paused");
  await fulfill(first, "stale-status");
  await page.waitForTimeout(100);
  await expect(state()).toContainText('"id":"latest-status"');
  // A delayed header lookup must not send a mutation with the next owner's credentials.
  await page.evaluate(() => {
    window.headerGate = new Promise((resolve) => (window.releaseHeaders = resolve));
    void window.hook.mutate({
      action: "pause",
      session_id: "00000000-0000-4000-8000-000000000001",
    });
  });
  await page.evaluate(() => window.setOwner("B"));
  await expect(state()).toContainText('"owner":"B"');
  await page.evaluate(() => {
    window.releaseHeaders();
    window.headerGate = null;
  });
  const onlyNewOwner = await take();
  expect(onlyNewOwner.input.action).toBe("status");
  await fulfill(onlyNewOwner, "headers-B");
  await expect(state()).toContainText('"id":"headers-B"');
  console.log(
    "PASS: delayed mutation status A→B, A→B→A, out-of-order status, and delayed-auth-header fences",
  );
} finally {
  await browser.close();
}
