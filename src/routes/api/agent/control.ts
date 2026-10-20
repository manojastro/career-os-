import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/agent/control")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleControl } = await import("@/lib/control/service.server");
        return handleControl(request);
      },
    },
  },
});
