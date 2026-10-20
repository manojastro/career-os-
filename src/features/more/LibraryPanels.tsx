import { useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { Badge, Button, Dialog, Empty, Field, Section } from "@/components/ui";
import { classifyCapture } from "@/lib/domain/insights";
import { useStore } from "@/lib/store";
import { browserSupabase } from "@/lib/supabase";
import { NoteTitle } from "./NoteTitle";
import { NoteEditor } from "./NoteEditor";

export function NotesPanel() {
  const { data, add, update } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const note = data.notes.find((item) => item.id === selected) ?? data.notes[0];
  const create = async () => {
    const created = await add("notes", {
      title: "Untitled note",
      content: "<p></p>",
      entity_type: null,
      entity_id: null,
      source_url: "",
      tags: [],
    });
    setSelected(created.id);
  };
  return (
    <div className="grid-main">
      <Section
        title="Notes"
        meta={`${data.notes.length}`}
        action={
          <Button onClick={() => void create()}>
            <Plus size={14} />
            New note
          </Button>
        }
      >
        <div>
          {data.notes.map((item) => (
            <button
              key={item.id}
              className="list-row"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                borderLeft:
                  note?.id === item.id ? "2px solid var(--blue)" : "2px solid transparent",
                borderTop: 0,
                borderRight: 0,
                background: note?.id === item.id ? "var(--blue-soft)" : "transparent",
                color: "var(--text)",
              }}
              onClick={() => setSelected(item.id)}
            >
              <div className="small semibold">{item.title}</div>
              <div className="micro muted">
                {new Date(item.updated_at ?? item.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
          {!data.notes.length && (
            <Empty title="No notes yet" detail="Create a note and it will save as you write." />
          )}
        </div>
      </Section>
      <Section title="Editor">
        <div className="section-body">
          {note ? (
            <>
              <NoteTitle key={note.id} note={note} />
              <div style={{ marginTop: 15 }}>
                <NoteEditor key={note.id} note={note} />
              </div>
            </>
          ) : (
            <Empty title="Choose a note" detail="Notes can link to skills, projects, and goals." />
          )}
        </div>
      </Section>
    </div>
  );
}

export function ResourcesPanel() {
  const { data, add, update } = useStore();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [skillId, setSkillId] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    if (title.trim().length < 2 || !/^https?:\/\//i.test(url)) {
      setError("Enter a title and a full http(s) URL.");
      return;
    }
    try {
      await add("resources", {
        title: title.trim(),
        url: url.trim(),
        source_type: "URL",
        skill_id: skillId || null,
        project_id: null,
        status: "Inbox",
        priority: "medium",
        notes: "",
      });
      setAdding(false);
      setTitle("");
      setUrl("");
      setSkillId("");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save resource.");
    }
  };
  const openPrivate = async (location: string) => {
    const client = browserSupabase();
    if (!client) {
      setError("Sign in to download private files.");
      return;
    }
    const { data: signed, error: downloadError } = await client.storage
      .from("career-evidence")
      .createSignedUrl(location.slice(8), 300);
    if (downloadError || !signed) {
      setError("Could not download this private file.");
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <>
      {error && !adding && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      <Section
        title="Resources"
        meta={`${data.resources.length}`}
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus size={14} />
            Save resource
          </Button>
        }
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Linked skill</th>
                <th>Status</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {data.resources.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="muted">{item.source_type}</div>
                  </td>
                  <td>{data.skills.find((skill) => skill.id === item.skill_id)?.name ?? "—"}</td>
                  <td>
                    <select
                      className="select"
                      aria-label={`Status for ${item.title}`}
                      value={item.status}
                      onChange={(event) =>
                        void update("resources", item.id, {
                          status: event.target.value as typeof item.status,
                        })
                      }
                    >
                      {["Inbox", "To Review", "Learning", "Completed", "Archived"].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {item.url &&
                      (item.url.startsWith("storage:") ? (
                        <button className="link" onClick={() => void openPrivate(item.url)}>
                          Download private file
                        </button>
                      ) : (
                        <a
                          className="link"
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open <ExternalLink size={12} style={{ display: "inline" }} />
                        </a>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.resources.length && (
            <Empty
              title="No resources saved"
              detail="Capture a URL or add an article, course, or document here."
            />
          )}
        </div>
      </Section>
      {adding && (
        <Dialog title="Save resource" onClose={() => setAdding(false)}>
          <div className="form-grid">
            <Field label="Title" name="resource-title" full>
              <input
                id="resource-title"
                className="input"
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label="URL" name="resource-url" full>
              <input
                id="resource-url"
                className="input"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </Field>
            <Field label="Skill" name="resource-skill" full>
              <select
                id="resource-skill"
                className="select"
                value={skillId}
                onChange={(event) => setSkillId(event.target.value)}
              >
                <option value="">None</option>
                {data.skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()}>
              Save resource
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

export function EvidencePanel() {
  const { data, user, hosted, add } = useStore();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("code");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [skillId, setSkillId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const save = async () => {
    if (title.trim().length < 2) {
      setError("Enter an evidence title.");
      return;
    }
    try {
      let location = url.trim();
      if (file && hosted && user) {
        const path = `${user.id}/${crypto.randomUUID()}/${file.name}`;
        const { error: uploadError } = await browserSupabase()!
          .storage.from("career-evidence")
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        location = `storage:${path}`;
      }
      await add("evidence", {
        title: title.trim(),
        kind,
        url: location,
        description,
        skill_id: skillId || null,
        project_id: projectId || null,
        goal_id: null,
      });
      setAdding(false);
      setTitle("");
      setUrl("");
      setDescription("");
      setSkillId("");
      setProjectId("");
      setFile(null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save evidence.");
    }
  };
  const open = async (value: string) => {
    if (value.startsWith("storage:")) {
      const { data: signed, error: signError } = await browserSupabase()!
        .storage.from("career-evidence")
        .createSignedUrl(value.slice(8), 60);
      if (signError) {
        setError(signError.message);
        return;
      }
      window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
    } else if (/^https?:\/\//i.test(value)) window.open(value, "_blank", "noopener,noreferrer");
  };
  return (
    <>
      <Section
        title="Evidence vault"
        meta={`${data.evidence.length} records`}
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus size={14} />
            Add proof
          </Button>
        }
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Proof</th>
                <th>Type</th>
                <th>Linked to</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {data.evidence.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="muted">{item.description}</div>
                  </td>
                  <td>
                    <Badge>{item.kind}</Badge>
                  </td>
                  <td>
                    {data.skills.find((skill) => skill.id === item.skill_id)?.name ??
                      data.projects.find((project) => project.id === item.project_id)?.name ??
                      "—"}
                  </td>
                  <td>
                    {item.url && (
                      <Button variant="quiet" onClick={() => void open(item.url)}>
                        Open <ExternalLink size={12} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.evidence.length && (
            <Empty
              title="No evidence yet"
              detail="Link code, demos, decisions, and outcomes to what they prove."
            />
          )}
        </div>
      </Section>
      {error && <p className="error">{error}</p>}
      {adding && (
        <Dialog title="Add evidence" onClose={() => setAdding(false)}>
          <div className="form-grid">
            <Field label="Title" name="evidence-title" full>
              <input
                id="evidence-title"
                className="input"
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>
            <Field label="Type" name="evidence-kind">
              <select
                id="evidence-kind"
                className="select"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                {[
                  "code",
                  "demo",
                  "architecture",
                  "deployment",
                  "metric",
                  "document",
                  "certification",
                  "practice",
                ].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="URL" name="evidence-url">
              <input
                id="evidence-url"
                type="url"
                className="input"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </Field>
            <Field label="Skill" name="evidence-skill">
              <select
                id="evidence-skill"
                className="select"
                value={skillId}
                onChange={(event) => setSkillId(event.target.value)}
              >
                <option value="">None</option>
                {data.skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project" name="evidence-project">
              <select
                id="evidence-project"
                className="select"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">None</option>
                {data.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description" name="evidence-description" full>
              <textarea
                id="evidence-description"
                className="textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            {hosted && (
              <Field label="Private file attachment" name="evidence-file" full>
                <input
                  id="evidence-file"
                  type="file"
                  className="input"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </Field>
            )}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()}>
              Save evidence
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

export function InboxPanel() {
  const { data, add, update } = useStore();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const save = async () => {
    if (!content.trim()) return;
    try {
      await add("inbox_items", { content: content.trim(), kind: "unprocessed", archived: false });
      setContent("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not capture item.");
    }
  };
  const convert = async (id: string, value: string) => {
    try {
      const kind = classifyCapture(value);
      if (kind === "resource")
        await add("resources", {
          title: new URL(value).hostname,
          url: value,
          source_type: "URL",
          skill_id: null,
          project_id: null,
          status: "Inbox",
          priority: "medium",
          notes: "",
        });
      else if (kind === "task")
        await add("tasks", {
          title: value,
          description: "",
          type: "Learn",
          status: "backlog",
          priority: "medium",
          estimated_minutes: 30,
          actual_minutes: 0,
          due_date: null,
          scheduled_date: null,
          scheduled_start: null,
          scheduled_end: null,
          skill_id: null,
          project_id: null,
          goal_id: null,
          milestone_id: null,
          application_id: null,
          contact_id: null,
          completed_at: null,
          sort_order: data.tasks.length + 1,
          tags: [],
          recurrence: null,
          evidence_required: false,
        });
      else
        await add("notes", {
          title: value.slice(0, 80),
          content: `<p>${value.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`,
          entity_type: null,
          entity_id: null,
          source_url: "",
          tags: [],
        });
      await update("inbox_items", id, { archived: true, kind });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not convert item.");
    }
  };
  return (
    <Section
      title="Universal inbox"
      meta={`${data.inbox_items.filter((item) => !item.archived).length} unprocessed`}
    >
      <div className="section-body">
        <div className="row">
          <input
            className="input"
            aria-label="Inbox capture"
            placeholder="Capture an unprocessed thought or URL"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void save();
            }}
          />
          <Button variant="primary" onClick={() => void save()}>
            Add
          </Button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
      <div>
        {data.inbox_items
          .filter((item) => !item.archived)
          .map((item) => (
            <div className="list-row row-between" key={item.id}>
              <span className="small">{item.content}</span>
              <div className="row">
                <Button onClick={() => void convert(item.id, item.content)}>Classify & save</Button>
                <Button
                  variant="quiet"
                  onClick={() => void update("inbox_items", item.id, { archived: true })}
                >
                  Archive
                </Button>
              </div>
            </div>
          ))}
        {!data.inbox_items.some((item) => !item.archived) && (
          <Empty
            title="Inbox is clear"
            detail="Capture thoughts here when you are not ready to organize them."
          />
        )}
      </div>
    </Section>
  );
}
