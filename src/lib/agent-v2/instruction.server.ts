import { rpc, type Db } from "@/lib/control/queries.server";
import type { V2Context } from "./contracts";
import { createHash } from "node:crypto";
type Intent =
  | { action: "start" | "finish"; query: string }
  | {
      action: "add";
      query: string;
      title: string;
      type: "Build" | "Learn";
      priority?: "low" | "medium" | "high";
    };
/** Deliberately bounded grammar. Hermes handles broader language with explicit record tools. */
export function parseInstruction(raw: string): Intent | null {
  const text = raw.trim().replace(/[.!]$/, "");
  if (
    /[?"“”\n]/.test(text) ||
    /\b(not|never|don't|haven't|should|could|would|maybe|suggest)\b/i.test(text)
  )
    return null;
  if (/^(?:done|finished|I'm done|I am done)$/i.test(text)) return { action: "finish", query: "" };
  const start =
    /^(?:I'm starting my |I am starting my |start (?:my |the )?)(.+?)(?: project(?: task)?)?(?: now)?$/i.exec(
      text,
    );
  if (start)
    return {
      action: "start",
      query: /^(?:current|active|this)(?: task)?$/i.test(start[1]) ? "" : start[1].trim(),
    };
  const finish =
    /^(?:I finished (?:the |my )?|finish (?:the |my )?|complete (?:the |my )?)(.+?)(?: project task| task)?$/i.exec(
      text,
    );
  if (finish)
    return {
      action: "finish",
      query: /^(?:current|active|this)$/i.test(finish[1]) ? "" : finish[1].trim(),
    };
  const add =
    /^add ((?:implementation of|implement|learning|learn) .+?) to (?:my |the )?(?:(.+?) )?project(?: with (low|medium|high) priority)?$/i.exec(
      text,
    );
  if (add)
    return {
      action: "add",
      query: add[2]?.trim() ?? "",
      title: add[1].trim(),
      type: /^(implementation|implement)\b/i.test(add[1]) ? "Build" : "Learn",
      ...(add[3] ? { priority: add[3].toLowerCase() as "low" | "medium" | "high" } : {}),
    };
  return null;
}
export function instruction(db: Db, context: V2Context) {
  const intent = parseInstruction(context.text);
  if (!intent)
    return Promise.resolve({
      status: "needs_clarification",
      message:
        "Specify an existing task to start or finish, or add implementation/learning of a named topic to an existing project.",
    });
  return rpc(db, "agent_v2_instruction", {
    p_uid: context.uid,
    p_key: context.requestKey,
    p_input: { ...intent, text_hash: createHash("sha256").update(context.text).digest("hex") },
    p_chat: context.source === "telegram" ? (context.chatRef ?? null) : null,
  });
}
