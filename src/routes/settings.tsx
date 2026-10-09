import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Career OS" },
      { name: "description", content: "Account, appearance, demo data and workspace preferences." },
      { property: "og:title", content: "Settings · Career OS" },
      { property: "og:description", content: "Account, appearance, demo data and workspace preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="settings" />,
});

