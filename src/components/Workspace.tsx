import { Link } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { useRouter } from "@/lib/router-compat";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  ListTodo,
  Flag,
  Layers3,
  FolderKanban,
  Users,
  MessagesSquare,
  BriefcaseBusiness,
  NotebookPen,
  Sparkles,
  Ellipsis,
  Settings2,
  GraduationCap,
  Archive,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Plus,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "./ui";
import { CaptureDialog } from "./CaptureDialog";
import { SearchDialog } from "./SearchDialog";
import { TaskForm } from "@/features/tasks/TaskForm";
import { PageRouter } from "@/features/PageRouter";
import { RecordManager } from "./RecordManager";

const NAV = [
  { slug: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { slug: "today", label: "Today", icon: CalendarDays, href: "/today" },
  { slug: "planner", label: "Planner", icon: CalendarRange, href: "/planner" },
  { slug: "tasks", label: "Tasks", icon: ListTodo, href: "/tasks" },
  { slug: "goals", label: "Goals & Milestones", icon: Flag, href: "/goals" },
  { slug: "skills", label: "Skills", icon: Layers3, href: "/skills" },
  { slug: "projects", label: "Projects", icon: FolderKanban, href: "/projects" },
  { slug: "networking", label: "Networking", icon: Users, href: "/networking" },
  { slug: "interviews", label: "Interview Prep", icon: MessagesSquare, href: "/interviews" },
  { slug: "jobs", label: "Jobs & Applications", icon: BriefcaseBusiness, href: "/jobs" },
  { slug: "learning", label: "Learning", icon: GraduationCap, href: "/learning" },
  { slug: "vault", label: "Vault", icon: Archive, href: "/vault" },
  { slug: "agent", label: "Agent Activity", icon: Activity, href: "/agent" },
  { slug: "daily-log", label: "Daily Log", icon: NotebookPen, href: "/daily-log" },
  { slug: "copilot", label: "AI Copilot", icon: Sparkles, href: "/copilot" },
];

export function Workspace({ section }: { section: string }) {
  const { loading, error, user, hosted, exitDemo } = useStore();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [capture, setCapture] = useState(false);
  const [search, setSearch] = useState(false);
  const [newTask, setNewTask] = useState(false);
  const [manageRecords, setManageRecords] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const current = NAV.find((item) => item.slug === section);

  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem("career-os-theme");
      if (saved === "dark") {
        setTheme("dark");
        document.documentElement.dataset.theme = "dark";
      }
      const value = localStorage.getItem("career-os-sidebar");
      if (value === "collapsed") setCollapsed(true);
    });
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push("/copilot");
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "/") {
        event.preventDefault();
        setSearch(true);
      } else if (event.key.toLowerCase() === "c") setCapture(true);
      else if (event.key.toLowerCase() === "t") setNewTask(true);
      else if (event.key.toLowerCase() === "n") {
        setCapture(true);
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [router]);

  const changeTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("career-os-theme", next);
  };

  if (loading)
    return (
      <div className="empty" style={{ paddingTop: "18vh" }}>
        <strong>Opening Career OS…</strong>Loading your workspace.
      </div>
    );
  if (hosted && !user)
    return (
      <div className="empty" style={{ paddingTop: "18vh" }}>
        <strong>Sign in to Career OS</strong>Your private workspace is protected.
        <p>
          <Link className="btn btn-primary" href="/login">
            Sign in or create account
          </Link>
        </p>
      </div>
    );
  if (!current && section !== "more" && section !== "settings")
    return (
      <div className="empty">
        <strong>Page not found</strong>
        <Link href="/" className="link">
          Return to dashboard
        </Link>
      </div>
    );

  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileMenu ? "mobile-open" : ""}`}
      >
        <Link className="brand" href="/">
          <span className="brand-mark">C</span>
          {!collapsed && <span>CAREER OS</span>}
        </Link>
        <nav aria-label="Main navigation">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.slug}
                href={item.href}
                className={`nav-link ${section === item.slug ? "active" : ""}`}
                title={item.label}
                onClick={() => setMobileMenu(false)}
              >
                <Icon size={17} strokeWidth={1.8} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-link"
            aria-label="Manage records"
            title="Manage records"
            style={{ background: "transparent", border: 0 }}
            onClick={() => {
              setManageRecords(true);
              setMobileMenu(false);
            }}
          >
            <Ellipsis size={17} />
            {!collapsed && "Manage records"}
          </button>
          <Link
            href="/more"
            className={`nav-link ${section === "more" ? "active" : ""}`}
            title="More"
          >
            <Ellipsis size={17} />
            {!collapsed && "More"}
          </Link>
          <Link
            href="/settings"
            className={`nav-link ${section === "settings" ? "active" : ""}`}
            title="Settings"
          >
            <Settings2 size={17} />
            {!collapsed && "Settings"}
          </Link>
          <button
            className="collapse-button"
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              localStorage.setItem("career-os-sidebar", next ? "collapsed" : "expanded");
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="btn btn-quiet btn-icon mobile-menu-button"
              aria-label="Open menu"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Menu size={19} />
            </button>
            <span className="crumb">Workspace</span>
            <span className="muted topbar-separator">/</span>
            <span className="topbar-title small">
              {current?.label ?? (section === "more" ? "More" : "Settings")}
            </span>
            {!hosted && (
              <>
                <span className="badge blue">Demo</span>
                <button
                  className="link small"
                  style={{ border: 0, background: "none" }}
                  onClick={() => {
                    exitDemo();
                    router.push("/login");
                  }}
                >
                  Create account / Sign in
                </button>
              </>
            )}
          </div>
          <div className="topbar-right">
            <button className="topbar-search" onClick={() => setSearch(true)}>
              <Search size={15} />
              <span>Search everything</span>
              <span className="kbd">/</span>
            </button>
            <Button variant="primary" onClick={() => setCapture(true)}>
              <Plus size={15} />
              <span className="hide-mobile">Quick capture</span>
            </Button>
            <button
              className="btn btn-quiet btn-icon"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              onClick={changeTheme}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </header>
        {error && (
          <div className="alert" style={{ margin: "16px 30px 0" }}>
            {error}
          </div>
        )}
        <main className="content">
          <PageRouter
            section={section}
            openCapture={() => setCapture(true)}
            openTask={() => setNewTask(true)}
          />
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link className={section === "dashboard" ? "active" : ""} href="/">
          <LayoutDashboard size={19} />
          Home
        </Link>
        <Link className={section === "today" ? "active" : ""} href="/today">
          <CalendarDays size={19} />
          Today
        </Link>
        <Link className={section === "tasks" ? "active" : ""} href="/tasks">
          <ListTodo size={19} />
          Tasks
        </Link>
        <button onClick={() => setCapture(true)}>
          <Plus size={19} />
          Capture
        </button>
        <button onClick={() => setMobileMenu(!mobileMenu)}>
          <Menu size={19} />
          More
        </button>
      </nav>
      {manageRecords && <RecordManager onClose={() => setManageRecords(false)} />}
      {capture && <CaptureDialog onClose={() => setCapture(false)} />}
      {search && <SearchDialog onClose={() => setSearch(false)} />}
      {newTask && (
        <TaskForm
          initialStatus={section === "today" ? "today" : "backlog"}
          onClose={() => setNewTask(false)}
        />
      )}
    </div>
  );
}
