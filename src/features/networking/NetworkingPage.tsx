import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Dialog, Empty, Field, PageHeading, Section, dateLabel } from "@/components/ui";
import { localDay } from "@/lib/domain/insights";
import { Contact, NetworkInteraction } from "@/lib/domain/types";
import { useStore } from "@/lib/store";

const stages: Contact["relationship_stage"][] = ["New", "Connected", "Conversation Started", "Active", "Warm", "Recruiter", "Mentor", "Archived"];
const kinds: NetworkInteraction["kind"][] = ["LinkedIn connection", "LinkedIn message", "email", "call", "meeting", "comment", "referral", "follow-up"];

export function NetworkingPage() {
  const { data, add, update } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [interaction, setInteraction] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [email, setEmail] = useState("");
  const [followup, setFollowup] = useState("");
  const [kind, setKind] = useState<NetworkInteraction["kind"]>("LinkedIn message");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const contact = data.contacts.find((item) => item.id === selected) ?? data.contacts[0];
  const due = data.contacts.filter((item) => item.next_followup && item.next_followup <= localDay());
  const interactions = data.network_interactions.filter((item) => item.contact_id === contact?.id).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  const saveContact = async () => {
    if (name.trim().length < 2) { setError("Enter a contact name."); return; }
    try {
      const created = await add("contacts", { name: name.trim(), company: company.trim(), role: role.trim(), linkedin_url: linkedin.trim(), email: email.trim(), location: "", relationship_stage: "New", topics: [], notes: "", date_connected: localDay(), last_interaction: null, next_followup: followup || null });
      setSelected(created.id); setAdding(false); setName(""); setCompany(""); setRole(""); setLinkedin(""); setEmail(""); setFollowup(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add contact."); }
  };
  const saveInteraction = async () => {
    if (!contact) return;
    try {
      await add("network_interactions", { contact_id: contact.id, kind, occurred_at: new Date().toISOString(), notes: notes.trim() });
      await update("contacts", contact.id, { last_interaction: localDay(), next_followup: followup || contact.next_followup, relationship_stage: contact.relationship_stage === "New" ? "Conversation Started" : contact.relationship_stage });
      setInteraction(false); setNotes(""); setFollowup(""); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not log interaction."); }
  };

  return <><PageHeading title="Networking" subtitle="Remember the relationship and make the next follow-up easy."><Button variant="primary" onClick={() => setAdding(true)}><Plus size={15} />Add contact</Button></PageHeading>
    {due.length > 0 && <div className="alert" style={{ marginBottom: 16 }}>{due.length} follow-up{due.length === 1 ? "" : "s"} due. {due.map((item) => item.name).join(", ")}</div>}
    <div className="grid-main"><Section title="Contacts" meta={`${data.contacts.length}`}><div>{data.contacts.length ? data.contacts.map((item) => <button key={item.id} className="list-row row-between" style={{ width: "100%", textAlign: "left", borderLeft: contact?.id === item.id ? "2px solid var(--blue)" : "2px solid transparent", borderTop: 0, borderRight: 0, background: contact?.id === item.id ? "var(--blue-soft)" : "transparent", color: "var(--text)" }} onClick={() => setSelected(item.id)}><div><div className="small semibold">{item.name}</div><div className="micro muted">{item.role}{item.company ? ` · ${item.company}` : ""}</div></div><div style={{ textAlign: "right" }}><Badge tone={item.next_followup && item.next_followup <= localDay() ? "amber" : "default"}>{item.relationship_stage}</Badge><div className="micro muted" style={{ marginTop: 4 }}>Follow-up {dateLabel(item.next_followup)}</div></div></button>) : <Empty title="No contacts yet" detail="Add someone you met, then record conversations and follow-ups." />}</div></Section>
      <div className="stack">{contact ? <><Section title="Contact" action={<Button onClick={() => { setFollowup(contact.next_followup ?? ""); setInteraction(true); }}><Plus size={14} />Log interaction</Button>}><div className="section-body"><h2 style={{ fontSize: 18, margin: "0 0 5px" }}>{contact.name}</h2><div className="small muted">{contact.role}{contact.company ? ` at ${contact.company}` : ""}</div><div className="form-grid" style={{ marginTop: 19 }}><Field label="Relationship" name="contact-stage"><select id="contact-stage" className="select" value={contact.relationship_stage} onChange={(event) => void update("contacts", contact.id, { relationship_stage: event.target.value as Contact["relationship_stage"] })}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></Field><Field label="Next follow-up" name="contact-followup"><input id="contact-followup" type="date" className="input" value={contact.next_followup ?? ""} onChange={(event) => void update("contacts", contact.id, { next_followup: event.target.value || null })} /></Field></div><div className="small muted" style={{ marginTop: 13 }}>Last interaction: {dateLabel(contact.last_interaction)}</div><Field label="Notes" name="contact-notes"><textarea id="contact-notes" className="textarea" key={contact.id} defaultValue={contact.notes} onBlur={(event) => { if (event.target.value !== contact.notes) void update("contacts", contact.id, { notes: event.target.value }); }} /></Field><div className="row small" style={{ marginTop: 12 }}>{contact.linkedin_url && <a className="link" href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn profile</a>}{contact.email && <span className="muted">{contact.email}</span>}</div></div></Section>
        <Section title="Interaction history" meta={`${interactions.length}`}><div>{interactions.map((item) => <div className="list-row" key={item.id}><div className="row-between small"><strong>{item.kind}</strong><span className="muted">{dateLabel(item.occurred_at)}</span></div>{item.notes && <div className="small muted" style={{ marginTop: 5 }}>{item.notes}</div>}</div>)}{!interactions.length && <Empty title="No interactions yet" detail="Log a message, call, or meeting to keep the history useful." />}</div></Section>
      </> : <Section title="Choose a contact"><Empty title="Your network starts here" detail="Add a contact to manage follow-ups." /></Section>}</div></div>
    {adding && <Dialog title="Add contact" onClose={() => setAdding(false)}><div className="form-grid"><Field label="Name" name="new-contact-name"><input id="new-contact-name" className="input" autoFocus value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Company" name="new-contact-company"><input id="new-contact-company" className="input" value={company} onChange={(event) => setCompany(event.target.value)} /></Field><Field label="Role" name="new-contact-role"><input id="new-contact-role" className="input" value={role} onChange={(event) => setRole(event.target.value)} /></Field><Field label="Next follow-up" name="new-contact-followup"><input id="new-contact-followup" type="date" className="input" value={followup} onChange={(event) => setFollowup(event.target.value)} /></Field><Field label="LinkedIn URL" name="new-contact-linkedin"><input id="new-contact-linkedin" type="url" className="input" value={linkedin} onChange={(event) => setLinkedin(event.target.value)} /></Field><Field label="Email" name="new-contact-email"><input id="new-contact-email" type="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} /></Field></div>{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={() => void saveContact()}>Add contact</Button></div></Dialog>}
    {interaction && contact && <Dialog title={`Log interaction with ${contact.name}`} onClose={() => setInteraction(false)}><div className="form-grid"><Field label="Type" name="interaction-type"><select id="interaction-type" className="select" value={kind} onChange={(event) => setKind(event.target.value as NetworkInteraction["kind"])}>{kinds.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Next follow-up" name="interaction-followup"><input id="interaction-followup" type="date" className="input" value={followup} onChange={(event) => setFollowup(event.target.value)} /></Field><Field label="Notes" name="interaction-notes" full><textarea id="interaction-notes" className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div>{error && <p className="error">{error}</p>}<div className="form-actions"><Button onClick={() => setInteraction(false)}>Cancel</Button><Button variant="primary" onClick={() => void saveInteraction()}>Save interaction</Button></div></Dialog>}
  </>;
}

