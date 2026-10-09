// Deterministic parser for the "AI Career Transition Learning Guide" plain-text export.
// Document content is untrusted data: it is only tokenised into strings, never executed or
// treated as instructions.

export type Priority = "MUST" | "SHOULD" | "OPTIONAL";

export interface ParsedTopic {
  stable_topic_id: string; // the guide's own chapter code, e.g. "II-2"
  volume: string; // roman numeral
  volume_title: string;
  title: string;
  description: string;
  priority: Priority;
  priority_source: "guide_label" | "inferred";
  sequence: number;
  recommended_minutes: number;
  practical_exercise: string;
  completion_criteria: string;
  interview_notes: string;
  body: string;
  source_reference: string;
  prerequisites: string[]; // stable ids
  content_hash: string;
}

export interface ParseReport {
  title: string;
  topics: ParsedTopic[];
  declared_volumes: string[];
  parsed_volumes: string[];
  missing_volumes: string[];
  missing_topics: string[];
  complete: boolean;
  content_hash: string;
  errors: string[];
}

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
export function romanToInt(r: string) {
  let total = 0;
  for (let i = 0; i < r.length; i++) {
    const v = ROMAN[r[i]] ?? 0;
    const next = ROMAN[r[i + 1]] ?? 0;
    total += v < next ? -v : v;
  }
  return total;
}

/** FNV-1a 64-bit (two 32-bit lanes) — deterministic, runtime-agnostic content fingerprint. */
export function contentHash(text: string) {
  let h1 = 0x811c9dc5,
    h2 = 0x01000193 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

const VOLUME_RE = /^Volume ([IVXL]+):\s*(.+?)\s*$/;
const CHAPTER_RE = /^([IVXL]+)-(\d+):\s*(.+?)\s*$/;
const DECLARED_RE = /^\*\s*Volume ([IVXL]+):[^(]*(?:\(([IVXL]+)-(\d+)\s+to\s+([IVXL]+)-(\d+)\))?/;
const BULLET_RE = /^\*\s*\**([A-Za-z][A-Za-z /&-]{1,40}?)\**:\**\s*(.*)$/;

function priorityTerms(lines: string[]) {
  const terms: Record<Priority, string[]> = { MUST: [], SHOULD: [], OPTIONAL: [] };
  for (const line of lines) {
    const m = /^\*\s*(MUST|SHOULD|OPTIONAL)\s*[—-]\s*[^:]*:\s*(.+?)(?:\.\s*Rule:.*)?$/.exec(line);
    if (!m) continue;
    terms[m[1] as Priority] = m[2]
      .split(/[,+]/)
      .flatMap((t) => t.split("/"))
      .map((t) =>
        t
          .replace(/\(.*?\)/g, "")
          .trim()
          .toLowerCase(),
      )
      .filter((t) => t.length >= 3);
  }
  return terms;
}

function classify(
  title: string,
  terms: Record<Priority, string[]>,
): { priority: Priority; source: "guide_label" | "inferred" } {
  const t = title.toLowerCase();
  if (/\(secondary\)/i.test(title)) return { priority: "OPTIONAL", source: "guide_label" };
  const hit = (p: Priority) =>
    terms[p].some((term) =>
      new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`).test(t),
    );
  for (const p of ["OPTIONAL", "MUST", "SHOULD"] as Priority[])
    if (hit(p)) return { priority: p, source: "guide_label" };
  return { priority: "SHOULD", source: "inferred" };
}

const MINUTES: Record<Priority, number> = { MUST: 90, SHOULD: 60, OPTIONAL: 45 };

export function parseGuide(raw: string): ParseReport {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const errors: string[] = [];
  const title = lines.find((l) => l.trim())?.trim() ?? "";

  const declared: { volume: string; codes: string[] }[] = [];
  for (const line of lines) {
    const m = DECLARED_RE.exec(line.trim());
    if (!m) continue;
    const codes: string[] = [];
    if (m[2] && m[2] === m[4])
      for (let n = Number(m[3]); n <= Number(m[5]); n++) codes.push(`${m[2]}-${n}`);
    declared.push({ volume: m[1], codes });
  }
  const terms = priorityTerms(lines);

  const topics: ParsedTopic[] = [];
  const parsedVolumes: string[] = [];
  let volume = "",
    volumeTitle = "";
  let current: { code: string; title: string; line: number; body: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.body.join("\n").trim();
    const field = (re: RegExp) =>
      current!.body
        .map((l) => BULLET_RE.exec(l.trim()))
        .filter((m): m is RegExpExecArray => !!m && re.test(m[1]))
        .map((m) => m[2].replace(/\*\*/g, "").trim())
        .join(" ");
    const { priority, source } = classify(current.title, terms);
    const [vol] = current.code.split("-");
    topics.push({
      stable_topic_id: current.code,
      volume: vol,
      volume_title: volumeTitle,
      title: current.title,
      description: (
        field(/^identity$/i) ||
        current.body.find((l) => l.trim().startsWith("*"))?.replace(/^\*\s*/, "") ||
        ""
      ).slice(0, 2000),
      priority,
      priority_source: source,
      sequence: topics.length + 1,
      recommended_minutes: MINUTES[priority],
      practical_exercise: field(/lab|exercise|practice|project/i).slice(0, 2000),
      completion_criteria: field(/completion|checklist|done/i).slice(0, 2000),
      interview_notes: field(/interview/i).slice(0, 2000),
      body: body.slice(0, 20000),
      source_reference: `${title || "Learning guide"} · Volume ${vol}${volumeTitle ? ` (${volumeTitle})` : ""} · ${current.code} · line ${current.line}`,
      prerequisites: [],
      content_hash: contentHash(`${current.title}\n${body}`),
    });
    current = null;
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const vm = VOLUME_RE.exec(line);
    if (vm && !rawLine.trimStart().startsWith("*")) {
      flush();
      volume = vm[1];
      volumeTitle = vm[2];
      if (!parsedVolumes.includes(volume)) parsedVolumes.push(volume);
      return;
    }
    const cm = CHAPTER_RE.exec(line);
    if (cm && volume && cm[1] === volume) {
      flush();
      current = { code: `${cm[1]}-${cm[2]}`, title: cm[3], line: index + 1, body: [] };
      return;
    }
    if (current) current.body.push(rawLine);
  });
  flush();

  // Sequence-inferred prerequisites: within a volume each chapter follows the previous one.
  for (let i = 1; i < topics.length; i++) {
    if (topics[i].volume === topics[i - 1].volume)
      topics[i].prerequisites = [topics[i - 1].stable_topic_id];
  }

  const ids = new Set(topics.map((t) => t.stable_topic_id));
  const missingVolumes = declared.map((d) => d.volume).filter((v) => !parsedVolumes.includes(v));
  const missingTopics = declared.flatMap((d) => d.codes).filter((c) => !ids.has(c));
  if (!topics.length) errors.push("no_topics_found");
  if (!declared.length) errors.push("table_of_contents_not_found");
  const seen = new Set<string>();
  for (const t of topics) {
    if (seen.has(t.stable_topic_id)) errors.push(`duplicate_topic:${t.stable_topic_id}`);
    seen.add(t.stable_topic_id);
  }

  return {
    title,
    topics,
    declared_volumes: declared.map((d) => d.volume),
    parsed_volumes: parsedVolumes,
    missing_volumes: missingVolumes,
    missing_topics: missingTopics,
    complete: errors.length === 0 && missingVolumes.length === 0 && missingTopics.length === 0,
    content_hash: contentHash(text),
    errors,
  };
}

const SKILL_RULES: [RegExp, string][] = [
  [/fastapi/i, "FastAPI"],
  [/langgraph|langchain/i, "LangGraph"],
  [/pydantic|python|asyncio|pytest|typing|oop/i, "Python"],
  [/sql|postgres/i, "SQL & PostgreSQL"],
  [/docker|git|linux/i, "Docker"],
  [/kubernetes/i, "Kubernetes"],
  [/rag|retriev|chunking|embedding|semantic search|rerank/i, "RAG"],
  [/agent|mcp|tool design|a2a/i, "AI Agents"],
  [/evaluat/i, "Evaluation"],
  [/observab/i, "Observability"],
  [/azure|cloud/i, "Azure AI"],
  [/llm|transformer|prompt|machine learning|neural|mathemat/i, "LLM Foundations"],
];
/** Maps a curriculum chapter to an existing-or-new skill name. Falls back to the volume title. */
export function skillNameFor(topic: Pick<ParsedTopic, "title" | "volume_title">) {
  for (const [re, name] of SKILL_RULES) if (re.test(topic.title)) return name;
  return topic.volume_title.slice(0, 80) || "General";
}

