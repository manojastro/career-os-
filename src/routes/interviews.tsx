import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/interviews")({
  head: () => ({
    meta: [
      { title: "Interview Prep · Career OS" },
      { name: "description", content: "Question bank, practice attempts and STAR stories." },
      { property: "og:title", content: "Interview Prep · Career OS" },
      { property: "og:description", content: "Question bank, practice attempts and STAR stories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="interviews" />,
});

