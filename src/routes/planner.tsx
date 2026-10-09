import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner · Career OS" },
      { name: "description", content: "Plan day, week and month time blocks against your real tasks." },
      { property: "og:title", content: "Planner · Career OS" },
      { property: "og:description", content: "Plan day, week and month time blocks against your real tasks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="planner" />,
});

