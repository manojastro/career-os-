import { useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  Empty,
  Field,
  PageHeading,
  Progress,
  Section,
  dateLabel,
} from "@/components/ui";
import { localDay, projectProgress } from "@/lib/domain/insights";
import { Project } from "@/lib/domain/types";
import { useStore } from "@/lib/store";

const statuses: Project["status"][] = [
  "Idea",
  "Planning",
  "Building",
  "Testing",
  "Deployed",
  "Archived",
];

export function ProjectsPage() {
  const { data, add, update } = useStore();
  const safeUpdate: typeof update = (...args) =>
    update(...args).catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Could not save this change."),
    );
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState("");
  const [value, setValue] = useState("");
  const [tech, setTech] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  const project = data.projects.find((item) => item.id === selected) ?? data.projects[0];
  const tasks = data.tasks.filter((task) => task.project_id === project?.id);
  const evidence = data.evidence.filter((item) => item.project_id === project?.id);

  const save = async () => {
    if (name.trim().length < 2) {
      setError("Enter a project name.");
      return;
    }
    try {
      const created = await add("projects", {
        name: name.trim(),
        description,
        problem,
        business_value: value,
        architecture: "",
        technologies: tech
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        github_url: "",
        deployment_url: "",
        status: "Planning",
        start_date: localDay(),
        target_date: target || null,
      });
      setSelected(created.id);
      setAdding(false);
      setName("");
      setDescription("");
      setProblem("");
      setValue("");
      setTech("");
      setTarget("");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create project.");
    }
  };

  return (
    <>
      <PageHeading
        title="Projects"
        subtitle="Show what you built, why it matters, and where the proof lives."
      >
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus size={15} />
          New project
        </Button>
      </PageHeading>
      <div className="grid-main">
        <Section title="Projects" meta={`${data.projects.length}`}>
          <div>
            {data.projects.length ? (
              data.projects.map((item) => {
                const progress = projectProgress(data, item.id);
                return (
                  <button
                    key={item.id}
                    className="list-row"
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      borderLeft:
                        project?.id === item.id ? "2px solid var(--blue)" : "2px solid transparent",
                      borderTop: 0,
                      borderRight: 0,
                      background: project?.id === item.id ? "var(--blue-soft)" : "transparent",
                      color: "var(--text)",
                    }}
                    onClick={() => setSelected(item.id)}
                  >
                    <div className="row-between">
                      <strong className="small">{item.name}</strong>
                      <Badge tone={item.status === "Deployed" ? "green" : "blue"}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="micro muted" style={{ margin: "6px 0 10px" }}>
                      {item.description}
                    </p>
                    <div className="row-between">
                      <div style={{ width: "80%" }}>
                        <Progress value={progress} />
                      </div>
                      <span className="micro muted">{progress}%</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <Empty
                title="No projects yet"
                detail="Create a project and link tasks and evidence to it."
              />
            )}
          </div>
        </Section>
        <div className="stack">
          {project ? (
            <>
              <Section
                title="Project overview"
                action={
                  <select
                    className="select"
                    aria-label="Project status"
                    style={{ width: 126 }}
                    value={project.status}
                    onChange={(event) =>
                      void safeUpdate("projects", project.id, {
                        status: event.target.value as Project["status"],
                      })
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                }
              >
                <div className="section-body">
                  <h2 style={{ margin: "0 0 8px", fontSize: 17 }}>{project.name}</h2>
                  <p className="small muted">
                    {project.description || "Add a project description."}
                  </p>
                  <div className="grid-two" style={{ marginTop: 18 }}>
                    <div>
                      <strong className="small">Problem</strong>
                      <p className="small muted">{project.problem || "—"}</p>
                    </div>
                    <div>
                      <strong className="small">Business value</strong>
                      <p className="small muted">{project.business_value || "—"}</p>
                    </div>
                  </div>
                  <div className="row-between small muted" style={{ marginTop: 8 }}>
                    <span>Target {dateLabel(project.target_date)}</span>
                    <span>
                      {tasks.filter((task) => task.status === "completed").length} of {tasks.length}{" "}
                      tasks complete
                    </span>
                  </div>
                  <div className="row" style={{ marginTop: 14, flexWrap: "wrap" }}>
                    {project.technologies.map((item) => (
                      <Badge key={item}>{item}</Badge>
                    ))}
                  </div>
                </div>
              </Section>
              <Section title="Architecture & links">
                <div className="section-body">
                  <Field label="Architecture summary" name="project-architecture">
                    <textarea
                      id="project-architecture"
                      className="textarea"
                      key={project.id}
                      defaultValue={project.architecture}
                      onBlur={(event) => {
                        if (event.target.value !== project.architecture)
                          void safeUpdate("projects", project.id, {
                            architecture: event.target.value,
                          });
                      }}
                    />
                  </Field>
                  <div className="form-grid" style={{ marginTop: 12 }}>
                    <Field label="GitHub URL" name="project-github">
                      <input
                        id="project-github"
                        key={`${project.id}-github`}
                        type="url"
                        className="input"
                        defaultValue={project.github_url}
                        onBlur={(event) => {
                          if (event.target.value !== project.github_url)
                            void safeUpdate("projects", project.id, {
                              github_url: event.target.value,
                            });
                        }}
                      />
                    </Field>
                    <Field label="Demo URL" name="project-demo">
                      <input
                        id="project-demo"
                        key={`${project.id}-demo`}
                        type="url"
                        className="input"
                        defaultValue={project.deployment_url}
                        onBlur={(event) => {
                          if (event.target.value !== project.deployment_url)
                            void safeUpdate("projects", project.id, {
                              deployment_url: event.target.value,
                            });
                        }}
                      />
                    </Field>
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    {project.github_url && (
                      <a
                        className="link small row"
                        href={project.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Repository <ExternalLink size={12} />
                      </a>
                    )}
                    {project.deployment_url && (
                      <a
                        className="link small row"
                        href={project.deployment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Live demo <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </Section>
              <Section title="Project work" meta={`${tasks.length} tasks`}>
                <div>
                  {tasks.slice(0, 8).map((task) => (
                    <div className="list-row row-between small" key={task.id}>
                      <span>{task.title}</span>
                      <Badge tone={task.status === "completed" ? "green" : "default"}>
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                  {!tasks.length && (
                    <Empty
                      title="No linked tasks"
                      detail="Link tasks to this project from the task editor."
                    />
                  )}
                </div>
              </Section>
              <Section title="Evidence" meta={`${evidence.length}`}>
                <div>
                  {evidence.map((item) => (
                    <div className="list-row small" key={item.id}>
                      {item.title} <span className="muted">· {item.kind}</span>
                    </div>
                  ))}
                  {!evidence.length && (
                    <Empty
                      title="No proof attached"
                      detail="Use the Evidence Vault under More to add a demo, code, or document."
                    />
                  )}
                </div>
              </Section>
            </>
          ) : (
            <Section title="Choose a project">
              <Empty title="No project selected" />
            </Section>
          )}
        </div>
      </div>
      {adding && (
        <Dialog title="New project" onClose={() => setAdding(false)}>
          <div className="form-grid">
            <Field label="Project name" name="project-name" full>
              <input
                id="project-name"
                className="input"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Description" name="project-description" full>
              <textarea
                id="project-description"
                className="textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Field label="Problem" name="project-problem" full>
              <input
                id="project-problem"
                className="input"
                value={problem}
                onChange={(event) => setProblem(event.target.value)}
              />
            </Field>
            <Field label="Business value" name="project-value" full>
              <input
                id="project-value"
                className="input"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </Field>
            <Field label="Technologies (comma separated)" name="project-tech" full>
              <input
                id="project-tech"
                className="input"
                value={tech}
                onChange={(event) => setTech(event.target.value)}
              />
            </Field>
            <Field label="Target date" name="project-target">
              <input
                id="project-target"
                type="date"
                className="input"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              />
            </Field>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()}>
              Create project
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
