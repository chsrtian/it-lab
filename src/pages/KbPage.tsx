import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { kbArticles } from "@/content/kb/articles";
import { SecHead } from "@/components/ui";

/**
 * Knowledge — a reference library. Articles are grouped by track under sticky
 * station headers, one hairline row per article, driven by typography rather
 * than by cards.
 */
export function KbPage() {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState("all");

  const tracks = useMemo(() => [...new Set(kbArticles.map((a) => a.track))], []);

  const filtered = useMemo(
    () =>
      kbArticles.filter((a) => {
        if (track !== "all" && a.track !== track) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q)
        );
      }),
    [track, query],
  );

  const groups = useMemo(() => {
    const order = track === "all" ? tracks : [track];
    return order
      .map((t) => ({ track: t, items: filtered.filter((a) => a.track === t) }))
      .filter((g) => g.items.length > 0);
  }, [filtered, track, tracks]);

  return (
    <div className="page">
      <header className="inset page-head">
        <h1 className="t-display">Knowledge</h1>
        <p className="page-note">
          {query
            ? `${filtered.length} of ${kbArticles.length} articles`
            : `${kbArticles.length} articles · ${tracks.length} tracks`}{" "}
          · open beside any lab
        </p>
      </header>

      <div className="inset flex flex-col gap-4">
        <p className="t-body text-muted max-w-prose">
          Each article explains the vocabulary and diagnostic reasoning a scenario depends on —
          read before a lab, or from the guide while working one.
        </p>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by track">
          <button
            type="button"
            className="chip"
            aria-pressed={track === "all"}
            onClick={() => setTrack("all")}
          >
            <span>All tracks</span>
            <span className="chip-count">{kbArticles.length}</span>
          </button>
          {tracks.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={track === t}
              onClick={() => setTrack(t)}
            >
              <span>{t}</span>
              <span className="chip-count">
                {kbArticles.filter((a) => a.track === t).length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[13rem] max-w-md">
            <label className="sr-only" htmlFor="kb-search">
              Search articles
            </label>
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
              aria-hidden
            />
            <input
              id="kb-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, summaries, commands…"
              className="input w-full pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="t-title">No articles match this search</span>
            <span>Try a different term or clear the track filter.</span>
            <button
              type="button"
              className="btn-secondary mt-1"
              onClick={() => {
                setQuery("");
                setTrack("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.track} aria-labelledby={`track-${group.track}`}>
              <div className="group-head">
                <SecHead
                  headingId={`track-${group.track}`}
                  title={group.track}
                  note={`${group.items.length} articles`}
                />
              </div>
              <div className="ruled-list">
                {group.items.map((a, i) => (
                  <Link key={a.id} to={`/kb/${a.id}`} className="ruled-row">
                    <span className="t-mono text-faint tabular-nums shrink-0 w-7">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-ink">{a.title}</span>
                      <span className="text-xs text-muted line-clamp-1">{a.summary}</span>
                    </span>
                    <span className="hidden sm:flex items-center gap-4 shrink-0">
                      <span className="row-sub t-mono">
                        {a.glossaryTerms.length === 0
                          ? "no terms"
                          : `${a.glossaryTerms.length} ${a.glossaryTerms.length === 1 ? "term" : "terms"}`}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
