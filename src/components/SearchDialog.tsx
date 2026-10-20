import { useState } from "react";
import { useRouter } from "@/lib/router-compat";
import { Search } from "lucide-react";
import { Dialog, Empty } from "./ui";
import { searchData } from "@/lib/domain/insights";
import { useStore } from "@/lib/store";
import { RecordManager } from "./RecordManager";
import type { EntityName } from "@/lib/domain/types";

const PATHS: Record<string, string> = {
  tasks: "/tasks",
  goals: "/goals",
  milestones: "/goals",
  skills: "/skills",
  skill_topics: "/skills",
  projects: "/projects",
  contacts: "/networking",
  interview_questions: "/interviews",
  job_applications: "/jobs",
  notes: "/more",
  resources: "/more",
  evidence: "/more",
};

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const { data } = useStore();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<{ entity: EntityName; id: string } | null>(null);
  const router = useRouter();
  const groups = searchData(data, query);
  if (target)
    return <RecordManager initialEntity={target.entity} initialId={target.id} onClose={onClose} />;
  return (
    <Dialog title="Search Career OS" onClose={onClose}>
      <div
        className="row"
        style={{ border: "1px solid var(--line)", borderRadius: 6, padding: "0 10px" }}
      >
        <Search size={17} className="muted" />
        <input
          autoFocus
          className="input"
          style={{ border: 0, boxShadow: "none" }}
          placeholder="Search tasks, skills, projects, contacts…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div style={{ maxHeight: 420, overflowY: "auto", marginTop: 14 }}>
        {query.trim() && groups.length === 0 && (
          <Empty title="No matching records" detail="Try another keyword or a shorter phrase." />
        )}
        {groups.map((group) => (
          <div key={group.entity}>
            <div
              className="small muted semibold"
              style={{ padding: "10px 0 5px", textTransform: "capitalize" }}
            >
              {group.entity.replaceAll("_", " ")}
            </div>
            {group.items.map((item) => (
              <button
                key={item.id}
                className="list-row"
                style={{
                  display: "block",
                  border: 0,
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  color: "var(--text)",
                }}
                onClick={() => {
                  setTarget({ entity: group.entity, id: item.id });
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
