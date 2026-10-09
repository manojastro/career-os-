import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/daily-log")({
  head: () => ({
    meta: [
      { title: "Daily Log · Career OS" },
      { name: "description", content: "A daily record built from your actual activity." },
      { property: "og:title", content: "Daily Log · Career OS" },
      { property: "og:description", content: "A daily record built from your actual activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="daily-log" />,
});

