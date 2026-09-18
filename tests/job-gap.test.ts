import { describe, expect, it } from "vitest";
import { demoData } from "../src/lib/domain/seed";
import { analyzeJobDescription } from "../src/lib/domain/jobGap";

describe("job skill gap", () => {
  it("grounds a skill assessment in tracked records and evidence", () => {
    const data = demoData();
    const results = analyzeJobDescription("Build RAG systems with Kubernetes and Python.", data);
    expect(results.find((item) => item.name === "RAG")?.evidence).toContain("Permission boundary design");
    expect(results.find((item) => item.name === "Kubernetes")?.assessment).toBe("Developing");
    expect(results.find((item) => item.name === "Python")?.assessment).toBe("Developing");
  });

  it("marks skills absent from the workspace as gaps", () => {
    const results = analyzeJobDescription("Experience with Terraform required.", demoData());
    expect(results).toContainEqual(expect.objectContaining({ name: "Terraform", assessment: "Gap" }));
  });
});
