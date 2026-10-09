import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Today · Career OS" },
      { name: "description", content: "Run your day: focus tasks, the focus timer and completed work." },
      { property: "og:title", content: "Today · Career OS" },
      { property: "og:description", content: "Run your day: focus tasks, the focus timer and completed work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="today" />,
});

