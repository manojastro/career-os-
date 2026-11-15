import { Empty, Section } from "@/components/ui";
import { Link } from "@/lib/router-compat";
import { StatusBadge, ist, useRows } from "./agentData";
import { changeLabel, hermesMessages, pageFor, pendingConfirmations } from "./activity";

const ATTENTION = ["ready", "running", "partial", "uncertain", "dead_letter"];
// Tables come from the Telegram-control and V2 migrations, which may not be applied yet.
const unavailable = (what: string) => (
  <div className="small muted" style={{ padding: 12 }}>
    {what} isn’t available yet: its database update has not been applied to this workspace.
  </div>
);

/** What Hermes did on Telegram: pending confirmations, workflows, calls and changes. */
export function TelegramActivity() {
  const approvals = useRows("control_approvals", {
    order: "created_at",
    limit: 50,
    filter: (q) => q.is("consumed_at", null),
  });
  const workflows = useRows("agent_v2_workflows", { order: "updated_at", limit: 30 });
  const calls = useRows("audit_events", {
    order: "created_at",
    limit: 300,
    filter: (q) => q.in("action", ["control_call", "control_rejected"]),
  });
  const changes = useRows("control_changes", { order: "created_at", limit: 25 });
  const pending = pendingConfirmations(approvals.rows, workflows.rows);
  const attention = workflows.rows.filter((w) => ATTENTION.includes(String(w["state"])));
  const messages = hermesMessages(calls.rows).slice(0, 20);
  return (
    <div className="grid-two">
      <Section title="Waiting for your Telegram reply" meta={`${pending.length} pending`}>
        {approvals.error && workflows.error ? (
          unavailable("Telegram approvals")
        ) : pending.length ? (
          pending.map((p) => (
            <div className="list-row small" key={p.id}>
              <strong>{p.summary}</strong>
              <div className="muted">
                Reply <code>{p.reply}</code> in Telegram before {ist(p.expires_at)}.
              </div>
            </div>
          ))
        ) : (
          <Empty
            title="Nothing waiting"
            detail="Bulk, destructive and multi-step changes from Hermes wait here until you reply with the exact confirm code."
          />
        )}
        {attention.length > 0 && (
          <div className="list-row small">
            <strong>Workflows needing attention</strong>
            {attention.map((w) => (
              <div className="row" key={w.id} style={{ justifyContent: "space-between" }}>
                <span className="muted">
                  {String(w.id).slice(0, 8)} · updated {ist(w["updated_at"])}
                </span>
                <StatusBadge status={String(w["state"])} />
              </div>
            ))}
            <div className="muted">
              Ask Hermes for the workflow’s status to resume or cancel it.
            </div>
          </div>
        )}
      </Section>
      <Section title="Hermes messages" meta="Tools used per Telegram message">
        {calls.error ? (
          unavailable("Hermes call history")
        ) : messages.length ? (
          messages.map((m) => (
            <div className="list-row small" key={m.message_ref + m.at}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{ist(m.at)}</strong>
                <span className="muted">{(m.duration_ms / 1000).toFixed(1)} s server time</span>
              </div>
              <div className="muted">
                {m.calls.length ? m.calls.join(" · ") : "Message received; no Career OS tool used"}
              </div>
              {m.rejected.map((r) => (
                <div className="error" key={r}>
                  Rejected: {r}
                </div>
              ))}
            </div>
          ))
        ) : (
          <Empty
            title="No Hermes calls logged yet"
            detail="Each Telegram message Hermes handles appears here with the tools it used."
          />
        )}
      </Section>
      <Section title="Changes made by Hermes" meta="Undo by asking Hermes">
        {changes.error ? (
          unavailable("Hermes change history")
        ) : changes.rows.length ? (
          changes.rows.map((c) => {
            const label = changeLabel(c);
            const path = pageFor(c["entity"]);
            return (
              <div className="list-row small" key={c.id}>
                {label.verb} {String(c["entity"]).replaceAll("_", " ")}:{" "}
                <strong>{label.title}</strong>{" "}
                <span className="muted">· {ist(c["created_at"])}</span>
                {c["undone_at"] && <span className="muted"> · undone</span>}
                {path && (
                  <>
                    {" "}
                    <Link href={path} className="link">
                      Open
                    </Link>
                  </>
                )}
              </div>
            );
          })
        ) : (
          <Empty title="No changes by Hermes yet" />
        )}
      </Section>
    </div>
  );
}
