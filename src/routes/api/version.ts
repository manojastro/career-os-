import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/version")({
  server: {
    handlers: {
      GET: () => {
        const value = process.env.CAREER_OS_BUILD_REVISION ?? "";
        const revision = /^[a-f0-9]{40}$/i.test(value) ? value : null;
        return Response.json(
          {
            application: "Career Compass",
            framework: "TanStack Start",
            revision,
            verified_stamp: revision !== null,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
