import { useCallback, useEffect, useState, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { authSupabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { Badge, Button, Empty } from "@/components/ui";

export type Row = Record<string, any> & { id: string };

export const IST = "Asia/Kolkata";
export function ist(value: string | null | undefined, withTime = true) {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00+05:30` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("en-IN", {
      timeZone: IST,
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime && value.length > 10
        ? { hour: "2-digit", minute: "2-digit", hour12: false }
        : {}),
    }).format(d) + (withTime && value.length > 10 ? " IST" : "")
  );
}
export function todayIST() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date());
}

/** Real-account guard: agent records are never shown or written in demo mode. */
export function useAgentAccess() {
  const { user, demo } = useStore();
  return { user, allowed: !!user && !demo };
}

export function AgentGate({ children }: { children: React.ReactNode }) {
  const { allowed } = useAgentAccess();
  if (!allowed)
    return (
      <Empty
        title="Sign in to see agent records"
        detail="Agent results only exist in your private account, never in the sample workspace."
      />
    );
  return <>{children}</>;
}

export function useRows(
  table: string,
  opts: { order?: string; ascending?: boolean; limit?: number; filter?: (q: any) => any } = {},
) {
  const { allowed, user } = useAgentAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: workspace } = useStore();
  const generation = useRef(0),
    filterRef = useRef(opts.filter);
  filterRef.current = opts.filter;
  const { order = "created_at", ascending = false, limit } = opts;
  const load = useCallback(async () => {
    if (!allowed) {
      setRows([]);
      setLoading(false);
      return;
    }
    const token = ++generation.current,
      all: Row[] = [];
    try {
      for (let offset = 0; ; offset += 200) {
        const size = limit === undefined ? 200 : Math.min(200, limit - offset);
        if (size <= 0) break;
        let q = authSupabase().from(table).select("*").order(order, { ascending });
        if (order !== "id" && table !== "agent_owner") q = q.order("id", { ascending: true });
        if (filterRef.current) q = filterRef.current(q);
        const { data, error } = await q.range(offset, offset + size - 1);
        if (error) throw new Error("Could not load these records.");
        all.push(...((data as Row[]) ?? []));
        if (!data || data.length < size) break;
      }
      if (token === generation.current) {
        setRows(all);
        setError(null);
      }
    } catch (cause) {
      if (token === generation.current)
        setError(cause instanceof Error ? cause.message : "Could not load records.");
    } finally {
      if (token === generation.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, user?.id, table, order, ascending, limit]);
  useEffect(() => {
    const activeGeneration = generation;
    void load();
    return () => {
      activeGeneration.current++;
    };
  }, [load, workspace]);
  return { rows, loading, error, reload: load };
}

export async function insertRow(table: string, values: Record<string, unknown>) {
  const client = authSupabase();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) throw new Error("Sign in first.");
  const { data, error } = await client
    .from(table)
    .insert({ ...values, user_id: auth.user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Row;
}
export async function updateRow(table: string, id: string, values: Record<string, unknown>) {
  const { error } = await authSupabase()
    .from(table)
    .update(values)
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}
export async function queueCommand(
  command: string,
  workflow = "all",
  payload: Record<string, unknown> = {},
) {
  return insertRow("agent_commands", {
    command,
    workflow,
    payload,
    idempotency_key: `${command}:${workflow}:${crypto.randomUUID()}`,
  });
}

/** Source + verification line. External claims show their link and verification time; inferences are labeled. */
export function Provenance({ row, urlKey = "source_url" }: { row: Row; urlKey?: string }) {
  const url = row[urlKey] as string | undefined;
  return (
    <div className="row small muted" style={{ flexWrap: "wrap", gap: 8, marginTop: 6 }}>
      {row["source"] === "agent" && <Badge tone="blue">Agent</Badge>}
      {(row["is_inference"] || row["fit_is_inference"]) && <Badge tone="amber">Inference</Badge>}
      {url ? (
        <a
          className="link row"
          style={{ gap: 3 }}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
        >
          Source <ExternalLink size={11} />
        </a>
      ) : row["source"] === "agent" && !row["is_inference"] ? (
        <span>No source link</span>
      ) : null}
      {url && (
        <span>{row["verified_at"] ? `Verified ${ist(row["verified_at"])}` : "Not verified"}</span>
      )}
    </div>
  );
}

type Action = { label: string; status: string; feedback: "done" | "save" | "dismiss" };
export const DEFAULT_ACTIONS: Action[] = [
  { label: "Done", status: "done", feedback: "done" },
  { label: "Save", status: "saved", feedback: "save" },
  { label: "Dismiss", status: "dismissed", feedback: "dismiss" },
];

/** Persists a status change and a feedback row the worker receives on its next poll. */
export function FeedbackControls({
  table,
  targetType,
  row,
  actions = DEFAULT_ACTIONS,
  onChange,
}: {
  table: string;
  targetType: string;
  row: Row;
  actions?: Action[];
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const act = async (a: Action) => {
    setBusy(true);
    setErr("");
    try {
      await updateRow(table, row.id, { status: a.status });
      await insertRow("feedback", {
        target_type: targetType,
        target_id: row.id,
        action: a.feedback,
      });
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    }
    setBusy(false);
  };
  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      {actions.map((a) => (
        <Button
          key={a.label}
          variant={row["status"] === a.status ? "primary" : "default"}
          disabled={busy || row["status"] === a.status}
          onClick={() => void act(a)}
        >
          {a.label}
        </Button>
      ))}
      {err && <span className="error small">{err}</span>}
    </div>
  );
}

export function statusTone(status: string): "default" | "blue" | "green" | "amber" | "red" {
  if (
    [
      "succeeded",
      "done",
      "completed",
      "verified",
      "delivered",
      "confirmed",
      "applied",
      "sent_manually",
      "registered_manually",
      "processed",
    ].includes(status)
  )
    return "green";
  if (["failed", "rejected", "expired"].includes(status)) return "red";
  if (
    [
      "running",
      "claimed",
      "queued",
      "pending",
      "processing",
      "in_progress",
      "doing",
      "action_needed",
    ].includes(status)
  )
    return "amber";
  if (["new", "draft", "suggested", "saved", "approved", "open"].includes(status)) return "blue";
  return "default";
}
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{status.replaceAll("_", " ")}</Badge>;
}
export function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <div className="alert" style={{ margin: 12 }}>
      {error}
    </div>
  ) : null;
}
