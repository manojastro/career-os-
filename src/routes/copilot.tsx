import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/copilot")({
  head: () => ({
    meta: [
      { title: "AI Copilot · Career OS" },
      { name: "description", content: "Ask for plans and review every proposed change before it is saved." },
      { property: "og:title", content: "AI Copilot · Career OS" },
      { property: "og:description", content: "Ask for plans and review every proposed change before it is saved." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="copilot" />,
});

