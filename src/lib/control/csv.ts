/** Spreadsheet consumers may execute quoted formulas; keep untrusted text as literal cells. */
export function csvCell(value: unknown): string {
  let text = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
