import type { ReactNode } from "react";

/**
 * The section device: title, optional mono count, a hairline rule that runs to
 * the edge, optional right-aligned action. Replaces uppercase micro-labels
 * everywhere in the shell.
 */
export function SecHead({
  title,
  note,
  action,
  headingId,
}: {
  title: string;
  note?: ReactNode;
  action?: ReactNode;
  headingId?: string;
}) {
  return (
    <div className="sec-head">
      <h2 className="sec-title" id={headingId}>
        {title}
      </h2>
      {note !== undefined && note !== null ? <span className="sec-note">{note}</span> : null}
      <span className="sec-rule" aria-hidden />
      {action}
    </div>
  );
}
