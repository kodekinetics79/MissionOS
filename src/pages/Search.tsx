import { useEffect, useState } from 'react';
import { getSearchResults } from '../services/platformClient';
import type { GroupedSearchResults } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { SearchBox } from '../components/SearchBox';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';

export function Search() {
  const [query, setQuery] = useState(() => localStorage.getItem('missionos.search.query') ?? '');
  const [results, setResults] = useState<GroupedSearchResults>({ query: '', total: 0, groups: [] });

  useEffect(() => {
    const stored = localStorage.getItem('missionos.search.query') ?? '';
    if (stored && !query) setQuery(stored);
    if (stored) localStorage.removeItem('missionos.search.query');
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ query: '', total: 0, groups: [] });
      return;
    }
    const timer = window.setTimeout(() => {
      getSearchResults(query).then(setResults);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <>
      <PageHeader
        eyebrow="Global search"
        title="Platform Search"
        description="Search stations, personnel, properties, apparatus, and assets from one place."
      />

      <SectionCard title="Search">
        <SearchBox value={query} onChange={setQuery} placeholder="Search across the platform" />
      </SectionCard>

      <SectionCard title={`Results (${results.total})`}>
        <div className="stack">
          {results.groups.map((group) => (
            <article className="nested-card" key={group.entity}>
              <div className="profile-head">
                <div>
                  <h3>{group.label}</h3>
                  <p className="muted">{group.items.length} matches</p>
                </div>
                <StatusBadge status={group.items.length ? 'Healthy' : 'Neutral'} />
              </div>
              <div className="stack">
                {group.items.map((result) => (
                  <div className="mini-card" key={`${result.entity}-${result.id}`}>
                    <div>
                      <b>{result.title}</b>
                      <span>{result.subtitle ?? result.module}</span>
                    </div>
                    <StatusBadge status={(result.status ?? 'Neutral') as any} />
                  </div>
                ))}
              </div>
            </article>
          ))}
          {!results.groups.length && query && <EmptyState title="No matches" description="Try a different station, name, property, or asset tag." />}
        </div>
      </SectionCard>
    </>
  );
}
