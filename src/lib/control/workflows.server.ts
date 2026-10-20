import type { Db } from "./queries.server";
import { rpc } from "./queries.server";
export async function confirmWorkflow(
  db: Db,
  uid: string,
  chat: string,
  message: string,
  id: string,
  key: string,
) {
  const claim = await rpc<{ status: string; operation: string; replayed?: boolean }>(
    db,
    "control_claim_workflow",
    { p_uid: uid, p_chat: chat, p_message: message, p_id: id, p_key: key },
  );
  if (claim.replayed || claim.status !== "running") return claim;
  if (claim.operation === "finish_baseline")
    return rpc(db, "control_finish_baseline", { p_uid: uid, p_key: key });
  const svc = await import("@/lib/learning/service.server");
  try {
    const result = await svc.syncCurriculum(db, uid);
    return rpc(db, "control_finish_workflow", {
      p_uid: uid,
      p_key: key,
      p_result: { status: "completed", operation: "sync_guide", request_key: key, result },
    });
  } catch {
    return rpc(db, "control_finish_workflow", {
      p_uid: uid,
      p_key: key,
      p_result: {
        status: "failed",
        operation: "sync_guide",
        request_key: key,
        error: "guide_sync_failed",
        recovery:
          "Re-read curriculum_sources and curriculum_versions. The existing importer keeps active topics on parse failure; source check metadata may have changed.",
      },
    });
  }
}
