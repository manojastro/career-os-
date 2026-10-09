import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { dueJobs, isValidTimeZone, zonedParts, istParts } from "../engine";
import { docxToText, documentXmlToText, htmlToText, DocxError } from "../docx";
import { z } from "zod/v4";
import { MAX_XML_BYTES } from "../docx";
import { mergeIdempotencyKey, schemaAcceptsIdempotencyKey } from "../http";
import { fetchGuideText, googleDocId, googleDocSource } from "../service.server";
import { parseGuide } from "../parse";
import { weeklyTime } from "@/lib/domain/insights";
import { emptyData } from "@/lib/domain/types";

const prefs = { sync_time: "10:30", morning_time: "11:00", evening_time: "20:30", paused: false };

describe("configurable IANA timezone", () => {
  it("validates zone names", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Mars/Base")).toBe(false);
    expect(isValidTimeZone("Asia/Kolkata; drop")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
  it("istParts is unchanged", () => {
    expect(istParts(new Date("2026-10-08T19:00:00Z"))).toEqual({ date: "2026-10-09", minutes: 30 });
  });
  it("handles DST spring-forward (New York 2026-03-08, 02:00 → 03:00)", () => {
    expect(zonedParts(new Date("2026-03-08T06:59:00Z"), "America/New_York")).toEqual({ date: "2026-03-08", minutes: 119 });
    expect(zonedParts(new Date("2026-03-08T07:00:00Z"), "America/New_York")).toEqual({ date: "2026-03-08", minutes: 180 });
    // A job at 02:30 (non-existent wall time) is still due once the clock passes it.
    const p = { ...prefs, sync_time: "02:30", timezone: "America/New_York" };
    expect(dueJobs(new Date("2026-03-08T07:05:00Z"), p, []).map((j) => j.job)).toContain("curriculum_sync");
  });
  it("handles DST fall-back without running twice (New York 2026-11-01)", () => {
    const p = { ...prefs, sync_time: "01:30", timezone: "America/New_York" };
    const first = new Date("2026-11-01T05:35:00Z"); // 01:35 EDT
    const second = new Date("2026-11-01T06:35:00Z"); // 01:35 EST (repeated hour)
    expect(zonedParts(first, "America/New_York")).toEqual(zonedParts(second, "America/New_York"));
    expect(dueJobs(first, p, []).map((j) => j.job)).toContain("curriculum_sync");
    expect(dueJobs(second, p, ["curriculum_sync"]).map((j) => j.job)).not.toContain("curriculum_sync");
  });
  it("uses the configured zone for the local date and windows", () => {
    const now = new Date("2026-10-09T05:30:00Z"); // 11:00 IST, 06:30 London
    expect(dueJobs(now, prefs, ["curriculum_sync"]).map((j) => j.job)).toEqual(["morning_plan"]);
    expect(dueJobs(now, { ...prefs, timezone: "Europe/London" }, [])).toEqual([]);
    expect(dueJobs(now, { ...prefs, timezone: "Pacific/Auckland" }, ["curriculum_sync"])[0]?.run_date).toBe("2026-10-09");
  });
});

describe("published Google Docs", () => {
  const PUB = "https://docs.google.com/document/d/e/2PACX-1vTabcdefghijklmnopqrstuvwxyz0123456789/pub";
  it("recognises published links with a distinct document id", () => {
    expect(googleDocSource(PUB)).toMatchObject({ kind: "pub", document_id: expect.stringMatching(/^pub:2PACX-/) });
    expect(googleDocId(PUB)).toBeNull();
    expect(googleDocSource("https://docs.google.com/document/d/e/2PACX-short/pub")).toBeNull();
    expect(googleDocSource("https://user:pw@docs.google.com/document/d/e/2PACX-1vTabcdefghijklmnopqrstuvwxyz0123456789/pub")).toBeNull();
  });
  it("fetches /pub HTML and converts it to the txt shape, scripts dropped", async () => {
    const html = `<html><head><script>alert(1)</script></head><body><p>AI Career Transition Learning Guide</p><p>Volume II: Core</p><script>evil()</script><p>II-1: Python &amp; APIs</p><ul><li>Exercise: build it</li></ul></body></html>`;
    let asked = "";
    const f = (async (u: string) => {
      asked = u;
      return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    }) as unknown as typeof fetch;
    const { text } = await fetchGuideText(PUB, f);
    expect(asked).toBe("https://docs.google.com/document/d/e/2PACX-1vTabcdefghijklmnopqrstuvwxyz0123456789/pub");
    expect(text).toContain("II-1: Python & APIs");
    expect(text).toContain("* Exercise: build it");
    expect(text).not.toMatch(/alert|evil/);
  });
  it("htmlToText decodes entities safely", () => {
    expect(htmlToText("<p>a &lt;b&gt; &#65;&#x42; &#0;</p>")).toBe("a <b> AB");
  });
});

function makeDocx(xml: string, extra: Record<string, Uint8Array> = {}) {
  return zipSync({
    "[Content_Types].xml": strToU8("<Types/>"),
    "word/document.xml": strToU8(xml),
    ...extra,
  });
}
const para = (t: string, list = false) =>
  `<w:p>${list ? "<w:pPr><w:numPr><w:ilvl w:val=\"0\"/></w:numPr></w:pPr>" : ""}<w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;

describe("DOCX fallback", () => {
  it("extracts paragraphs, bullets and entities", () => {
    const xml = `<w:document><w:body>${para("Volume II: Core")}${para("II-1: A &amp; B")}${para("Exercise: x", true)}</w:body></w:document>`;
    expect(documentXmlToText(xml)).toBe("Volume II: Core\nII-1: A & B\n* Exercise: x");
    expect(docxToText(makeDocx(xml))).toContain("II-1: A & B");
  });
  it("feeds the identical parser (same topics as the txt export)", () => {
    const lines = ["AI Career Transition Learning Guide", "Volume II: Core", "II-1: Python APIs", "Some body."];
    const xml = `<w:document><w:body>${lines.map((l) => para(l)).join("")}</w:body></w:document>`;
    expect(parseGuide(docxToText(makeDocx(xml))).topics.map((t) => t.stable_topic_id)).toEqual(
      parseGuide(lines.join("\n")).topics.map((t) => t.stable_topic_id),
    );
  });
  it("rejects non-zip, macro packages, missing document and zip bombs", () => {
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e instanceof DocxError ? e.code : "other";
      }
      return "none";
    };
    expect(code(() => docxToText(strToU8("hello world")))).toBe("not_a_docx");
    expect(code(() => docxToText(makeDocx(para("x"), { "word/vbaProject.bin": new Uint8Array(4) })))).toBe("macro_content_rejected");
    expect(code(() => docxToText(zipSync({ "[Content_Types].xml": strToU8("<T/>") })))).toBe("not_a_docx");
    const bomb = zipSync({ "[Content_Types].xml": strToU8("<T/>"), "word/document.xml": new Uint8Array(21 * 1024 * 1024) }, { level: 9 });
    expect(bomb.byteLength).toBeLessThan(1024 * 1024);
    expect(code(() => docxToText(bomb))).toBe("document_xml_too_large");
    const many: Record<string, Uint8Array> = {};
    for (let i = 0; i < 1001; i++) many[`f${i}.xml`] = new Uint8Array(1);
    expect(code(() => docxToText(makeDocx(para("x"), many)))).toBe("too_many_entries");
  });
});

describe("weekly totals include legacy standalone learning sessions", () => {
  it("counts standalone rows once and never focus mirrors", () => {
    const data = emptyData();
    const base = { user_id: "u", created_at: "2026-10-05T00:00:00Z", deleted_at: null };
    data.tasks.push({ ...base, id: "t1", title: "Learn", description: "", type: "Learn", status: "completed", priority: "medium", estimated_minutes: 60, actual_minutes: 30, due_date: null, scheduled_date: "2026-10-06", scheduled_start: null, scheduled_end: null, skill_id: null, project_id: null, goal_id: null, milestone_id: null, application_id: null, contact_id: null, completed_at: null, sort_order: 0, tags: [], recurrence: null, evidence_required: false });
    data.focus_sessions.push({ ...base, id: "f1", task_id: "t1", started_at: "2026-10-06T10:00:00Z", ended_at: null, duration_minutes: 30, note: "" });
    data.learning_sessions.push(
      { ...base, id: "m1", skill_id: null, task_id: "t1", minutes: 30, learned: "mirror", occurred_at: "2026-10-06T10:30:00Z", focus_session_id: "f1" },
      { ...base, id: "l1", skill_id: null, task_id: null, minutes: 20, learned: "legacy", occurred_at: "2026-10-07T10:00:00Z", focus_session_id: null },
      { ...base, id: "l2", skill_id: null, task_id: null, minutes: 99, learned: "deleted", occurred_at: "2026-10-07T10:00:00Z", deleted_at: "2026-10-07T11:00:00Z" },
    );
    const w = weeklyTime(data, new Date("2026-10-08T12:00:00"));
    expect(w.actual_minutes).toBe(50);
    expect(w.legacy_learning_minutes).toBe(20);
    expect(w.by_type.Learn.actual).toBe(50);
  });
});

describe("DOCX malformed / bounded inflation", () => {
  const code = (fn: () => unknown) => {
    try { fn(); return "ok"; } catch (e) { return e instanceof DocxError ? e.code : "other"; }
  };
  it("rejects a truncated package without throwing raw errors", () => {
    const full = makeDocx(para("I-1: Truncated"));
    expect(code(() => docxToText(full.subarray(0, Math.floor(full.byteLength / 2))))).not.toBe("ok");
    expect(code(() => docxToText(full.subarray(0, 40)))).not.toBe("ok");
  });
  it("rejects corrupted deflate data", () => {
    const bad = makeDocx(para("I-1: Corrupt ".repeat(200))).slice();
    for (let i = 120; i < Math.min(bad.byteLength - 200, 400); i++) bad[i] ^= 0xff;
    expect(code(() => docxToText(bad))).not.toBe("ok");
  });
  it("enforces the actual inflated size limit across small input chunks", () => {
    const huge = "<w:p><w:r><w:t>" + "a".repeat(MAX_XML_BYTES + 1024) + "</w:t></w:r></w:p>";
    expect(code(() => docxToText(makeDocx(huge)))).toBe("document_xml_too_large");
  });
});

describe("Idempotency-Key header merge per route schema", () => {
  const runClaim = z.object({ job: z.string(), date: z.string() }).strict();
  const sync = z.object({}).strict();
  const rec = z.object({ idempotency_key: z.string(), x: z.number() }).strict();
  const r = () => new Request("http://x/", { method: "POST", headers: { "Idempotency-Key": "hermes:2026-10-09:claim" } });
  it("run-claim and sync accept a durable header without a 400", () => {
    for (const [s, body] of [[runClaim, { job: "morning_plan", date: "2026-10-09" }], [sync, {}]] as const) {
      const m = mergeIdempotencyKey(r(), body, schemaAcceptsIdempotencyKey(s));
      expect(m.ok).toBe(true);
      expect(s.safeParse((m as { body: unknown }).body).success).toBe(true);
    }
  });
  it("routes with idempotency_key still receive the header", () => {
    expect(schemaAcceptsIdempotencyKey(rec)).toBe(true);
    const m = mergeIdempotencyKey(r(), { x: 1 }, true);
    expect(rec.safeParse((m as { body: unknown }).body).success).toBe(true);
  });
});

