import { useCallback, useEffect, useRef, useState } from "react";
import { aiHeaders } from "@/lib/ai-headers";
import {
  focusInput,
  type FocusInput,
  type FocusResult,
  type ServerFocusSession,
} from "@/lib/agent-v2/contracts";
type Pending = { request_id: string; input: FocusInput };
class FocusRequestError extends Error {
  constructor(
    message: string,
    readonly rejected: boolean,
  ) {
    super(message);
  }
}
export function useServerFocus(uid: string | null, onChanged: () => void) {
  const [session, setSession] = useState<ServerFocusSession | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [offset, setOffset] = useState(0);
  const [rejected, setRejected] = useState(false);
  const pendingRef = useRef<Pending | null>(null),
    flight = useRef(false),
    scope = useRef(uid),
    revision = useRef(0),
    last = useRef("");
  const changed = useRef(onChanged);
  changed.current = onChanged;
  scope.current = uid;
  const key = uid ? "career-os-server-focus-pending:" + uid : null;
  const send = useCallback(
    async (input: FocusInput, request_id: string = crypto.randomUUID()): Promise<FocusResult> => {
      const response = await fetch("/api/v2", {
        method: "POST",
        headers: await aiHeaders(),
        body: JSON.stringify({ request_id, text: "", operation: "focus", input }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new FocusRequestError(
          typeof result.error === "string" ? result.error : "Focus request failed",
          response.status >= 400 && response.status < 500,
        );
      return result;
    },
    [],
  );
  const apply = useCallback((result: FocusResult) => {
    const next =
      result.session && ["running", "paused"].includes(result.session.state)
        ? result.session
        : null;
    setSession(next);
    setOffset(Date.parse(result.server_now) - Date.now());
    const signature = JSON.stringify(next);
    if (signature !== last.current) {
      last.current = signature;
      changed.current();
    }
  }, []);
  const refresh = useCallback(async () => {
    if (!uid || flight.current) return;
    const generation = revision.current;
    try {
      const result = await send({ action: "status" });
      if (scope.current === uid && revision.current === generation) {
        apply(result);
        setError((previous) =>
          previous === "Shared Focus is unavailable. Your timer and pending request are retained."
            ? ""
            : previous,
        );
      }
    } catch {
      if (scope.current === uid)
        setError("Shared Focus is unavailable. Your timer and pending request are retained.");
    }
  }, [uid, send, apply]);
  useEffect(() => {
    setSession(null);
    setError("");
    setRejected(false);
    pendingRef.current = null;
    setPending(null);
    setBusy(false);
    flight.current = false;
    revision.current++;
    if (!key) return;
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? "null") as Pending | null;
      if (
        raw &&
        /^[0-9a-f-]{36}$/i.test(raw.request_id) &&
        focusInput.safeParse(raw.input).success
      ) {
        pendingRef.current = raw;
        setPending(raw);
      }
    } catch {
      setError("Pending Focus request storage is unavailable.");
    }
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    const foreground = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", foreground);
    document.addEventListener("visibilitychange", foreground);
    window.addEventListener("career-os-focus-changed", foreground);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", foreground);
      document.removeEventListener("visibilitychange", foreground);
      window.removeEventListener("career-os-focus-changed", foreground);
    };
  }, [key, refresh]);
  const mutate = useCallback(
    async (input?: FocusInput) => {
      if (!uid || !key || flight.current) return;
      const retained = pendingRef.current;
      if (retained && input && JSON.stringify(retained.input) !== JSON.stringify(input)) {
        setError("Retry the pending Focus request before another action.");
        return;
      }
      const request = retained ?? (input ? { request_id: crypto.randomUUID(), input } : null);
      if (!request) return;
      flight.current = true;
      setBusy(true);
      setError("");
      setRejected(false);
      revision.current++;
      try {
        localStorage.setItem(key, JSON.stringify(request));
        pendingRef.current = request;
        setPending(request);
        await send(request.input, request.request_id);
        if (scope.current !== uid) return;
        localStorage.removeItem(key);
        pendingRef.current = null;
        setPending(null);
        // Re-read current state: a receipt can describe a session another channel already finished.
        apply(await send({ action: "status" }));
        changed.current();
        window.dispatchEvent(new Event("career-os-focus-changed"));
      } catch (e) {
        if (scope.current === uid) setRejected(e instanceof FocusRequestError && e.rejected);
        if (scope.current === uid)
          setError(
            e instanceof Error ? e.message : "Focus request failed; retry the retained request.",
          );
      } finally {
        if (scope.current === uid) {
          flight.current = false;
          setBusy(false);
        }
      }
    },
    [uid, key, send, apply],
  );
  const dismissRejected = () => {
    if (!rejected || !key || flight.current) return;
    localStorage.removeItem(key);
    pendingRef.current = null;
    setPending(null);
    setRejected(false);
    setError("");
    void refresh();
  };
  return { session, error, busy, pending, offset, mutate, refresh, rejected, dismissRejected };
}
