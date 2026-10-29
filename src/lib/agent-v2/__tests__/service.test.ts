import { it, expect } from "vitest";
import { v2Envelope } from "../contracts";
import { parseInstruction } from "../instruction.server";
it("strictly rejects transport and timing overrides", () => {
  for (const input of [
    { action: "start", task_id: crypto.randomUUID(), uid: crypto.randomUUID() },
    { action: "status", now: 0 },
    { action: "finish", session_id: crypto.randomUUID(), complete: true, minutes: 60 },
  ])
    expect(v2Envelope.safeParse({ operation: "focus", input }).success).toBe(false);
  expect(
    v2Envelope.safeParse({ operation: "instruction", input: { text: "Start other task" } }).success,
  ).toBe(false);
});
it("recognizes only bounded explicit owner instructions", () => {
  expect(parseInstruction("I'm starting my LangGraph project now.")).toEqual({
    action: "start",
    query: "LangGraph",
  });
  expect(parseInstruction("I finished the LangGraph project task.")).toEqual({
    action: "finish",
    query: "LangGraph",
  });
  expect(parseInstruction("Add implementation of semantic caching to my project.")).toEqual({
    action: "add",
    query: "",
    title: "implementation of semantic caching",
    type: "Build",
  });
  for (const text of [
    '"Start LangGraph"',
    "Should I start LangGraph?",
    "Don't start LangGraph",
    "Add Redis",
    "Maybe start LangGraph",
    "I haven't finished the LangGraph project task.",
  ])
    expect(parseInstruction(text)).toBeNull();
});
