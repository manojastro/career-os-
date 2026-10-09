import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/learning")({
  head: () => ({
    meta: [
      { title: "Learning · Career OS" },
      { name: "description", content: "Study queue and study history for your career transition." },
      { property: "og:title", content: "Learning · Career OS" },
      { property: "og:description", content: "Study queue and study history for your career transition." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="learning" />,
});

