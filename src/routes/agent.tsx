import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/agent")({
  head: () => ({
    meta: [
      { title: "Agent Activity · Career OS" },
      { name: "description", content: "Agent runs, failures, usage, deliveries and command queue." },
      { property: "og:title", content: "Agent Activity · Career OS" },
      { property: "og:description", content: "Agent runs, failures, usage, deliveries and command queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="agent" />,
});

