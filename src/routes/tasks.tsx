import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks · Career OS" },
      { name: "description", content: "Move work from backlog to month, week, today, doing and completed." },
      { property: "og:title", content: "Tasks · Career OS" },
      { property: "og:description", content: "Move work from backlog to month, week, today, doing and completed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="tasks" />,
});

