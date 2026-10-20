import { classifyReply } from "@/lib/learning/engine";

/** Model suggestions cannot invent an owner's learning outcome or duration. */
export function verifyFeedbackIntent(
  text: string,
  input: {
    kind: string;
    minutes?: number;
    minutes_mode?: string;
    new_date?: string;
    date?: string;
  },
) {
  const parsed = classifyReply(text);
  if (
    parsed.kind !== input.kind ||
    (input.minutes !== undefined && input.minutes !== parsed.minutes) ||
    (input.minutes_mode === "additional" && !/\b(additional|extra|another|more)\b/i.test(text)) ||
    (input.new_date && !text.includes(input.new_date)) ||
    (input.date && !text.includes(input.date))
  )
    throw new Error("needs_clarification");
  return { minutes: parsed.minutes, notes: text.slice(0, 4000) };
}
