import { useEffect } from "react";
import { X } from "lucide-react";
import { getArticle } from "@/content";

export interface KbOverlayProps {
  articleId: string | null;
  onClose: () => void;
}

export function KbOverlay({ articleId, onClose }: KbOverlayProps) {
  const article = articleId ? getArticle(articleId) : undefined;

  useEffect(() => {
    if (!articleId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [articleId, onClose]);

  if (!articleId || !article) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
      data-testid="kb-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="panel-header flex items-center justify-between">
          <span className="truncate">{article.title}</span>
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={onClose}
            aria-label="Close knowledge article"
          >
            <X size={14} aria-hidden /> Close
          </button>
        </div>
        <div className="p-4 overflow-y-auto text-sm space-y-3">
          <p className="text-lab-muted">{article.summary}</p>
          <div className="whitespace-pre-wrap leading-relaxed text-lab-text">{article.body}</div>
          {article.glossaryTerms.length > 0 && (
            <div className="border-t border-lab-border pt-3">
              <div className="text-xs uppercase tracking-wider text-lab-muted mb-1">Glossary</div>
              <ul className="space-y-1 text-xs">
                {article.glossaryTerms.map((g) => (
                  <li key={g.term}>
                    <span className="text-lab-text">{g.term}</span>
                    <span className="text-lab-muted"> — {g.definition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[11px] text-lab-muted">
            Simulation progress is preserved. Close this panel to return to the lab.
          </p>
        </div>
      </div>
    </div>
  );
}
