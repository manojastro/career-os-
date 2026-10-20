import { X } from "lucide-react";
import * as AccessibleDialog from "@radix-ui/react-dialog";

export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="page-heading-actions">{children}</div>
    </div>
  );
}

export function Section({
  title,
  meta,
  action,
  children,
  className = "",
}: {
  title: string;
  meta?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`section ${className}`}>
      <div className="section-header">
        <div className="row">
          <h2>{title}</h2>
          {meta && <small>{meta}</small>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "default",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "quiet" | "danger";
}) {
  return (
    <button
      className={`btn ${variant === "primary" ? "btn-primary" : variant === "quiet" ? "btn-quiet" : variant === "danger" ? "btn-danger" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "blue" | "green" | "amber" | "red";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label="Progress"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {detail}
    </div>
  );
}

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AccessibleDialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AccessibleDialog.Portal>
        <AccessibleDialog.Overlay className="dialog-backdrop">
          <AccessibleDialog.Content className="dialog" aria-describedby={undefined}>
            <div className="dialog-heading">
              <AccessibleDialog.Title asChild>
                <h2>{title}</h2>
              </AccessibleDialog.Title>
              <AccessibleDialog.Close asChild>
                <button className="btn btn-quiet btn-icon" aria-label="Close">
                  <X size={17} />
                </button>
              </AccessibleDialog.Close>
            </div>
            <div className="dialog-content">{children}</div>
          </AccessibleDialog.Content>
        </AccessibleDialog.Overlay>
      </AccessibleDialog.Portal>
    </AccessibleDialog.Root>
  );
}

export function Field({
  label,
  name,
  children,
  full = false,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      {children}
    </div>
  );
}

export function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
