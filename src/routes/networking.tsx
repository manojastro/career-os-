import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/networking")({
  head: () => ({
    meta: [
      { title: "Networking · Career OS" },
      { name: "description", content: "Contacts, follow-ups and recorded interactions." },
      { property: "og:title", content: "Networking · Career OS" },
      { property: "og:description", content: "Contacts, follow-ups and recorded interactions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="networking" />,
});

