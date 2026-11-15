import type { jobSearchStats } from "@/lib/domain/jobStats";

const percent = (rate: number | null) => (rate === null ? "—" : `${Math.round(rate * 100)}%`);

/** Pipeline health from current stages; selecting an item opens that application. */
export function SearchHealth({
  stats,
  onSelect,
}: {
  stats: ReturnType<typeof jobSearchStats>;
  onSelect: (id: string) => void;
}) {
  const items = [
    ["Active pipeline", String(stats.active)],
    ["Applied", `${stats.applied} · ${stats.appliedThisWeek} this week`],
    ["Response rate", `${percent(stats.responseRate)} (${stats.responded})`],
    ["Interview rate", `${percent(stats.interviewRate)} (${stats.interviewed})`],
    ["Offers", String(stats.offers)],
  ];
  const nudges = [
    ...stats.followupsDue.map((f) => ({ id: f.id, text: `Follow-up due ${f.date}: ${f.label}` })),
    ...stats.waiting.map((w) => ({ id: w.id, text: `No reply in ${w.days} days: ${w.label}` })),
  ];
  return (
    <div style={{ marginBottom: 15 }}>
      <div
        className="summary"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))" }}
        aria-label="Search health"
      >
        {items.map(([label, value]) => (
          <div className="summary-item" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {nudges.length > 0 && (
        <div className="alert small" style={{ marginTop: 10 }}>
          {nudges.slice(0, 6).map((n) => (
            <div key={n.text}>
              <button
                className="link"
                style={{ border: 0, background: "none", padding: 0 }}
                onClick={() => onSelect(n.id)}
              >
                {n.text}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="micro muted" style={{ marginTop: 6 }}>
        Rates count applications by their current stage and recorded interviews. Stage history isn’t
        stored, so time spent in each stage can’t be shown yet.
      </div>
    </div>
  );
}
