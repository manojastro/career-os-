import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More · Career OS" },
      { name: "description", content: "Inbox, notes, resources, evidence vault, analytics and export." },
      { property: "og:title", content: "More · Career OS" },
      { property: "og:description", content: "Inbox, notes, resources, evidence vault, analytics and export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="more" />,
});

