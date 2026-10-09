import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Vault · Career OS" },
      { name: "description", content: "Document intake and claims awaiting your confirmation." },
      { property: "og:title", content: "Vault · Career OS" },
      { property: "og:description", content: "Document intake and claims awaiting your confirmation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="vault" />,
});

