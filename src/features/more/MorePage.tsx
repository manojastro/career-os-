import { useState } from "react";
import { Link } from "@/lib/router-compat";
import { Archive, BookOpenText, FileText, Library, LineChart, Search, ShieldCheck, CalendarCheck, Download, ArrowRight } from "lucide-react";
import { PageHeading, Section } from "@/components/ui";
import { NotesPanel, ResourcesPanel, EvidencePanel, InboxPanel } from "./LibraryPanels";
import { AnalyticsPanel, ExportPanel, WeeklyReviewPanel } from "./ReviewPanels";

type Tab = "Overview" | "Inbox" | "Notes" | "Resources" | "Evidence" | "Weekly review" | "Analytics" | "Export";
const tabs: Tab[] = ["Overview", "Inbox", "Notes", "Resources", "Evidence", "Weekly review", "Analytics", "Export"];
const shortcuts: { tab: Tab; title: string; detail: string; icon: typeof Archive }[] = [
  { tab: "Inbox", title: "Universal inbox", detail: "Unprocessed thoughts, links, and ideas", icon: Archive },
  { tab: "Notes", title: "Notes", detail: "Rich text knowledge you can reuse", icon: BookOpenText },
  { tab: "Resources", title: "Resources", detail: "Articles, courses, documentation, and links", icon: Library },
  { tab: "Evidence", title: "Evidence vault", detail: "Proof behind your skills and projects", icon: ShieldCheck },
  { tab: "Weekly review", title: "Weekly review", detail: "Plan versus actual and next week's work", icon: CalendarCheck },
  { tab: "Analytics", title: "Analytics", detail: "Useful trends and time allocation", icon: LineChart },
  { tab: "Export", title: "Export / backup", detail: "Download your workspace records", icon: Download },
];

export function MorePage() {
  const [tab, setTab] = useState<Tab>("Overview");
  return <><PageHeading title="More" subtitle="Supporting tools for capture, proof, and reflection." /><div className="tabs" style={{ marginBottom: 17, maxWidth: "100%", overflowX: "auto" }}>{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "Overview" && <div className="grid-two"><Section title="Your library"><div>{shortcuts.slice(0, 4).map(({ tab: target, title, detail, icon: Icon }) => <button className="list-row row-between" key={target} style={{ display: "flex", width: "100%", background: "transparent", borderLeft: 0, borderRight: 0, borderTop: 0, color: "var(--text)", textAlign: "left" }} onClick={() => setTab(target)}><span className="row"><Icon size={17} className="muted" /><span><strong className="small">{title}</strong><span className="micro muted" style={{ display: "block" }}>{detail}</span></span></span><ArrowRight size={14} className="muted" /></button>)}</div></Section><Section title="Review & control"><div>{shortcuts.slice(4).map(({ tab: target, title, detail, icon: Icon }) => <button className="list-row row-between" key={target} style={{ display: "flex", width: "100%", background: "transparent", borderLeft: 0, borderRight: 0, borderTop: 0, color: "var(--text)", textAlign: "left" }} onClick={() => setTab(target)}><span className="row"><Icon size={17} className="muted" /><span><strong className="small">{title}</strong><span className="micro muted" style={{ display: "block" }}>{detail}</span></span></span><ArrowRight size={14} className="muted" /></button>)}</div></Section><Section title="Related workspaces"><div className="section-body stack" style={{ gap: 11 }}><Link href="/interviews" className="link small">Interview story bank <ArrowRight size={12} style={{ display: "inline" }} /></Link><Link href="/jobs" className="link small">Resume versions in applications <ArrowRight size={12} style={{ display: "inline" }} /></Link><Link href="/projects" className="link small">Project decisions and lessons <ArrowRight size={12} style={{ display: "inline" }} /></Link></div></Section><Section title="Search & capture"><div className="section-body"><p className="small muted">Press <strong>/</strong> anywhere outside an input to search all records, or press <strong>C</strong> to capture.</p><div className="row"><Search size={15} className="muted" /><span className="small">Global search is available in the top bar.</span></div><div className="row" style={{ marginTop: 10 }}><FileText size={15} className="muted" /><span className="small">Important changes feed the activity timeline.</span></div></div></Section></div>}
    {tab === "Inbox" && <InboxPanel />}{tab === "Notes" && <NotesPanel />}{tab === "Resources" && <ResourcesPanel />}{tab === "Evidence" && <EvidencePanel />}{tab === "Weekly review" && <WeeklyReviewPanel />}{tab === "Analytics" && <AnalyticsPanel />}{tab === "Export" && <ExportPanel />}
  </>;
}

