import { it, expect } from "vitest";
import { csvCell } from "./csv";
it("exports literal cells instead of executing untrusted formulas", () => {
  expect(csvCell('=WEBSERVICE("example")')).toBe('"\'=WEBSERVICE(""example"")"');
  expect(csvCell("\t+1")).toBe('"\'\t+1"');
  expect(csvCell(-1)).toBe('"-1"');
  expect(csvCell('ordinary, "text"')).toBe('"ordinary, ""text"""');
});
