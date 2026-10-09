import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects · Career OS" },
      { name: "description", content: "Portfolio projects with linked work and evidence." },
      { property: "og:title", content: "Projects · Career OS" },
      { property: "og:description", content: "Portfolio projects with linked work and evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="projects" />,
});

