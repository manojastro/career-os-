import { test, expect } from "@playwright/test";

test("a task moves through planning, focus, completion, and the daily log", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your career, in motion" })).toBeVisible();
  await page.getByRole("link", { name: "Today", exact: true }).first().click();
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("Task", { exact: true }).fill("Verify end-to-end task flow");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByText("Verify end-to-end task flow", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Complete Verify end-to-end task flow" }).click();
  await page.getByRole("link", { name: "Daily Log" }).click();
  await expect(page.getByText("Completed Verify end-to-end task flow")).toBeVisible();

  await page.getByRole("link", { name: "Today", exact: true }).first().click();
  await page.getByRole("button", { name: "Focus", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "Focus session" })).toBeVisible();
  await page.getByRole("button", { name: "Stop & save" }).click();
  await expect(page.getByRole("dialog", { name: "Focus session" })).toBeHidden();
  await page.getByRole("link", { name: "Daily Log" }).click();
  await expect(page.getByText("Finished a focus session")).toBeVisible();
});

test("career structure can be created and linked", async ({ page }) => {
  await page.goto("/goals");
  await page.getByRole("button", { name: "New goal" }).click();
  await page.getByLabel("Goal title").fill("Build production evaluation");
  await page.getByRole("button", { name: "Create goal" }).click();
  await page.getByRole("button", { name: /Build production evaluation/ }).click();
  await page.getByRole("button", { name: "Add milestone" }).click();
  await page.getByLabel("Milestone title").fill("Evaluation dataset ready");
  await page.getByRole("button", { name: "Create milestone" }).click();
  await expect(page.getByText("Evaluation dataset ready")).toBeVisible();

  await page.goto("/skills");
  await page.getByRole("button", { name: "Add skill" }).click();
  await page.getByLabel("Skill name").fill("Terraform");
  await page.getByRole("dialog").getByRole("button", { name: "Add skill" }).click();
  await expect(page.getByRole("heading", { name: "Terraform" })).toBeVisible();

  await page.goto("/projects");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Release reliability case study");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: "Release reliability case study" })).toBeVisible();
});

test("networking, interviews, applications, and capture retain updates", async ({ page }) => {
  await page.goto("/networking");
  await page.getByRole("button", { name: "Add contact" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Anika Rao");
  await page.getByLabel("Company", { exact: true }).fill("Acme AI");
  await page.getByRole("dialog").getByRole("button", { name: "Add contact" }).click();
  await expect(page.getByRole("heading", { name: "Anika Rao" })).toBeVisible();
  await page.getByRole("button", { name: "Log interaction" }).click();
  await page.getByLabel("Notes", { exact: true }).last().fill("Discussed platform roles");
  await page.getByRole("button", { name: "Save interaction" }).click();
  await expect(page.getByText("Discussed platform roles")).toBeVisible();

  await page.goto("/interviews");
  await page.getByRole("button", { name: "Record practice" }).click();
  await page.getByLabel("Confidence (0–4)").selectOption("3");
  await page.getByRole("button", { name: "Save practice" }).click();
  await expect(page.getByText("Practice session")).toBeVisible();

  await page.goto("/jobs");
  await page.getByRole("button", { name: "Add application" }).click();
  await page.getByLabel("Company", { exact: true }).fill("Acme AI");
  await page.getByLabel("Role", { exact: true }).fill("Platform Engineer");
  await page.getByRole("button", { name: "Save application" }).click();
  await page.getByLabel("Stage for Acme AI").selectOption("Applied");
  await expect(page.getByLabel("Stage for Acme AI")).toHaveValue("Applied");

  await page.getByRole("button", { name: "Quick capture" }).click();
  await page.getByLabel("Capture an idea, task, note, or URL").fill("Learn release observability");
  await page.getByRole("button", { name: "Save task" }).click();
  await expect(page.getByText("Learn release observability", { exact: true })).toBeVisible();
});

test("mobile dashboard fits the viewport and keeps capture reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your career, in motion" })).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("button", { name: "Capture" }).click();
  await expect(page.getByRole("dialog", { name: "Quick capture" })).toBeVisible();
});

test("primary workspaces avoid horizontal scrolling on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/today", "/planner", "/tasks", "/goals", "/skills", "/projects", "/networking", "/interviews", "/jobs", "/daily-log", "/copilot", "/more", "/settings"]) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, `${route} should fit the mobile viewport`).toBeLessThanOrEqual(390);
  }
});

test("planner time blocks and confirmed Copilot proposals change real tasks", async ({ page }) => {
  await page.goto("/planner");
  await page.getByRole("button", { name: "Time block" }).click();
  await page.getByLabel("Task (optional)").selectOption({ label: "Compare reranking approaches" });
  await page.getByRole("button", { name: "Save block" }).click();
  await expect(page.getByText("Compare reranking approaches").first()).toBeVisible();

  await page.goto("/copilot");
  await page.getByLabel("Copilot command").fill("Add Kubernetes under my learning backlog");
  await page.getByRole("button", { name: "Run command" }).click();
  await expect(page.getByText("Create task: Kubernetes")).toBeVisible();
  await page.getByRole("button", { name: "Confirm 1 change" }).click();
  await page.goto("/tasks");
  await page.getByLabel("Filter tasks").fill("Kubernetes");
  await expect(page.getByText("Kubernetes", { exact: true })).toBeVisible();
});

test("a rich text note autosaves and survives a reload", async ({ page }) => {
  await page.goto("/more");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByRole("button", { name: "New note" }).click();
  await page.getByLabel("Title").fill("RAG retrieval note");
  await page.locator(".rich-editor").fill("Hybrid retrieval balances lexical and semantic recall.");
  await expect(page.getByRole("status")).toHaveText("Saving…");
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.reload();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(page.getByText("Hybrid retrieval balances lexical and semantic recall.")).toBeVisible();
});
