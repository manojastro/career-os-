import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Goals & Milestones · Career OS" },
      { name: "description", content: "Track goals with milestones and progress derived from real work." },
      { property: "og:title", content: "Goals & Milestones · Career OS" },
      { property: "og:description", content: "Track goals with milestones and progress derived from real work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="goals" />,
});

