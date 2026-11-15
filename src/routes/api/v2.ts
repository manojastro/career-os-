import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { userClient } from "@/lib/ai-gateway.server";
import { v2Envelope } from "@/lib/agent-v2/contracts";
import { readJsonLimited } from "@/lib/learning/http";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
const bodySchema = z.union(
  v2Envelope.options.map((schema) =>
    schema.extend({
      request_id: z.uuid(),
      text: z.string().max(20000),
    }),
  ),
);
export async function handleV2(request: Request) {
  const auth = await userClient(request);
  if (!auth) return json({ error: "unauthorized" }, 401);
  const read = await readJsonLimited(request, 1_000_000);
  if (!read.ok) return json({ error: read.error }, read.status);
  const parsed = bodySchema.safeParse(read.body);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  const { dispatchV2 } = await import("@/lib/agent-v2/service.server");
  const { V2Error } = await import("@/lib/agent-v2/contracts");
  try {
    return json(
      await dispatchV2(
        auth.client,
        {
          uid: auth.user.id,
          source: "web",
          requestKey: "web:" + parsed.data.request_id,
          text: parsed.data.text,
        },
        { operation: parsed.data.operation, input: parsed.data.input },
      ),
    );
  } catch (e) {
    return json(
      { error: e instanceof V2Error ? e.code : "v2_request_failed" },
      e instanceof V2Error ? e.status : 500,
    );
  }
}
export const Route = createFileRoute("/api/v2")({
  server: { handlers: { POST: ({ request }) => handleV2(request) } },
});
