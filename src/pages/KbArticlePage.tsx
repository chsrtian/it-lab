import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getArticle, getScenario } from "@/content";
import { SecHead } from "@/components/ui";

function renderMarkdownLite(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  let html = escaped
    .replace(/^### (.+)$/gm, '<h3 class="article-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="article-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="article-h1">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="article-code">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^\|(.+)\|$/gm, (line) => `<div class="article-table">${line}</div>`)
    .replace(/^- (.+)$/gm, '<li class="article-li">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="article-li">$1. $2</li>')
    .replace(/\n\n/g, '</p><p class="article-p">')
    .replace(/\n/g, "<br />");
  if (!html.startsWith("<")) {
    html = `<p class="article-p">${html}</p>`;
  }
  return html;
}

/**
 * Knowledge article — a manual page on a paper sheet: ~65ch reading measure
 * with a hairline margin column carrying related cases, glossary and sources.
 */
export function KbArticlePage() {
  const { articleId } = useParams();
  const article = articleId ? getArticle(articleId) : undefined;

  if (!article) {
    return (
      <div className="page">
        <div className="inset">
          <div className="empty-state items-start">
            <span className="t-title">Article not found</span>
            <Link to="/kb" className="link">
              Back to the reference library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="inset">
        <Link to="/kb" className="sec-link inline-flex items-center gap-1.5">
          <ArrowLeft size={14} aria-hidden /> All articles
        </Link>
      </div>

      <div className="inset">
        <article className="article-sheet">
          <header className="article-head">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="t-display">{article.title}</h1>
              <span className="article-track">{article.track}</span>
            </div>
            <p className="t-body text-muted max-w-prose">{article.summary}</p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] items-start">
            <div
              className="article-body"
              dangerouslySetInnerHTML={{ __html: renderMarkdownLite(article.body) }}
            />

            <aside className="flex flex-col gap-6 lg:border-l lg:border-hairline lg:pl-6">
              {article.relatedScenarios.length > 0 && (
                <section aria-labelledby="related-title">
                  <SecHead headingId="related-title" title="Practice these labs" />
                  <div className="ruled-list">
                    {article.relatedScenarios.map((id) => {
                      const scenario = getScenario(id);
                      if (!scenario) return null;
                      return (
                        <Link key={id} to={`/lab/${id}`} className="ruled-row">
                          <span className="t-mono text-faint shrink-0">
                            {scenario.ticket.id}
                          </span>
                          <span className="text-sm text-ink min-w-0 flex-1">
                            {scenario.title}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {article.glossaryTerms.length > 0 && (
                <section aria-labelledby="glossary-title">
                  <SecHead headingId="glossary-title" title="Glossary" />
                  <dl className="flex flex-col gap-3">
                    {article.glossaryTerms.map((g) => (
                      <div key={g.term} className="flex flex-col">
                        <dt className="text-sm font-semibold text-ink">{g.term}</dt>
                        <dd className="text-sm text-muted">{g.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {article.references.length > 0 && (
                <section aria-labelledby="refs-title">
                  <SecHead headingId="refs-title" title="References" />
                  <ul className="flex flex-col gap-3">
                    {article.references.map((ref) => (
                      <li key={ref.url}>
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link inline-flex items-center gap-1 text-sm"
                        >
                          {ref.title} <ArrowUpRight size={12} aria-hidden />
                        </a>
                        {ref.note && <span className="block text-xs text-muted">{ref.note}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </article>
      </div>
    </div>
  );
}
