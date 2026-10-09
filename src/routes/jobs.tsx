import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Job Applications · Career OS" },
      { name: "description", content: "Application list and pipeline with job description skill gaps." },
      { property: "og:title", content: "Job Applications · Career OS" },
      { property: "og:description", content: "Application list and pipeline with job description skill gaps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="jobs" />,
});

