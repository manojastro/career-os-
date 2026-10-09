import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/Workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Career OS" },
      { name: "description", content: "Your career dashboard: today's focus, goals, skills, applications and recent activity." },
      { property: "og:title", content: "Dashboard · Career OS" },
      { property: "og:description", content: "Your career dashboard: today's focus, goals, skills, applications and recent activity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Workspace section="dashboard" />,
});

