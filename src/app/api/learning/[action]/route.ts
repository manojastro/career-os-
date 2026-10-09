import { authorizeLearning } from "@/lib/learning/auth.server";
import { learningJson, readLearningBody, userSchemas } from "@/lib/learning/http";
import { LearningError, applyFeedback, generateToday, getPrefs, googleDocId, syncCurriculum, testDocumentAccess } from "@/lib/learning/service.server";

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  const schema = userSchemas[action as keyof typeof userSchemas];
  if (!schema) return learningJson({ error: "not_found" }, 404);
  const auth = await authorizeLearning(request, false);
  if (auth instanceof Response) return auth;
  try {
    const parsed = schema.safeParse(await readLearningBody(request));
    if (!parsed.success) return learningJson({ error: "invalid_request" }, 400);
    switch (action) {
      case "save-preferences": {
        const values = parsed.data as { guide_url: string };
        googleDocId(values.guide_url);
        await getPrefs(auth.db, auth.uid);
        const { error } = await auth.db.from("learning_preferences").update(values).eq("user_id", auth.uid);
        if (error) throw new Error("write_failed");
        return learningJson({ ok: true });
      }
      case "test-document": return learningJson(await testDocumentAccess((parsed.data as { url: string }).url));
      case "sync": return learningJson(await syncCurriculum(auth.db, auth.uid));
      case "plan": return learningJson(await generateToday(auth.db, auth.uid, auth.origin));
      case "preferences": return learningJson(await getPrefs(auth.db, auth.uid));
      case "baseline": {
        await getPrefs(auth.db, auth.uid);
        const { error } = await auth.db.from("learning_preferences").update({ baseline_completed_at: new Date().toISOString() }).eq("user_id", auth.uid);
        if (error) throw new Error("write_failed");
        return learningJson({ ok: true });
      }
      case "request-test": {
        const { data, error } = await auth.db.from("learning_agent_commands").insert({ user_id: auth.uid, command: (parsed.data as { command: string }).command }).select("id").single();
        if (error) throw new Error("write_failed");
        return learningJson({ queued: true, command_id: data.id });
      }
      case "feedback": return learningJson(await applyFeedback(auth.db, auth.uid, { ...parsed.data as Parameters<typeof applyFeedback>[2], channel: "app" }));
    }
    return learningJson({ error: "not_found" }, 404);
  } catch (cause) {
    if (cause instanceof LearningError) return learningJson({ error: cause.code, detail: cause.detail }, cause.status);
    if (cause instanceof Error && cause.message === "payload_too_large") return learningJson({ error: cause.message }, 413);
    if (cause instanceof SyntaxError) return learningJson({ error: "invalid_json" }, 400);
    return learningJson({ error: "learning_request_failed" }, 500);
  }
}
