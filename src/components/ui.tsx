import { X } from "lucide-react";
import { useEffect } from "react";

export function PageHeading({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="page-heading-actions">{children}</div></div>;
}

export function Section({ title, meta, action, children, className = "" }: { title: string; meta?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`section ${className}`}><div className="section-header"><div className="row"><h2>{title}</h2>{meta && <small>{meta}</small>}</div>{action}</div>{children}</section>;
}

export function Button({ children, variant = "default", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "quiet" | "danger" }) {
  return <button className={`btn ${variant === "primary" ? "btn-primary" : variant === "quiet" ? "btn-quiet" : variant === "danger" ? "btn-danger" : ""} ${className}`} {...props}>{children}</button>;
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "blue" | "green" | "amber" | "red" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Progress({ value }: { value: number }) {
  return <div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return <div className="empty"><strong>{title}</strong>{detail}</div>;
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="dialog" role="dialog" aria-modal="true" aria-label={title}><div className="dialog-heading"><h2>{title}</h2><button className="btn btn-quiet btn-icon" aria-label="Close" onClick={onClose}><X size={17} /></button></div><div className="dialog-content">{children}</div></div></div>;
}

export function Field({ label, name, children, full = false }: { label: string; name: string; children: React.ReactNode; full?: boolean }) {
  return <div className={`field ${full ? "full" : ""}`}><label htmlFor={name}>{label}</label>{children}</div>;
}

export function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

