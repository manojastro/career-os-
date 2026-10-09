import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/skills")({
  head: () => ({
    meta: [
      { title: "Skills · Career OS" },
      { name: "description", content: "Five readiness dimensions and study topics for every skill." },
      { property: "og:title", content: "Skills · Career OS" },
      { property: "og:description", content: "Five readiness dimensions and study topics for every skill." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="skills" />,
});

