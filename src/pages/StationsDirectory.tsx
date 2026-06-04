import { useEffect, useMemo, useState } from 'react';
import { getStations } from '../services/platformClient';
import type { Station } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable } from '../components/DataTable';
import { ReadinessScore } from '../components/ReadinessScore';
import { StatusBadge } from '../components/StatusBadge';
import { SearchBox } from '../components/SearchBox';
import { FilterBar } from '../components/FilterBar';
import { Tabs } from '../components/Tabs';
import { LoadingState } from '../components/LoadingState';

export function StationsDirectory() {
  const [stations, setStations] = useState<Station[]>([]);
  const [search, setSearch] = useState('');
  const [battalion, setBattalion] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    getStations().then((response) => setStations(response.items));
  }, []);

  const battalions = useMemo(() => ['all', ...new Set(stations.map((station) => station.battalion ?? 'Unassigned'))], [stations]);

  const filteredStations = stations.filter((station) => {
    const battalionMatch = battalion === 'all' || (station.battalion ?? 'Unassigned') === battalion;
    const statusMatch = status === 'all' || station.status === status;
    const searchMatch = !search || `${station.name} ${station.city} ${station.address ?? ''}`.toLowerCase().includes(search.toLowerCase());
    return battalionMatch && statusMatch && searchMatch;
  });

  return (
    <>
      <PageHeader
        eyebrow="Organization"
        title="Station Directory"
        description="All 17 stations in one directory with battalion, response area, readiness, staffing, and status filters."
      />

      <FilterBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search stations" />
        <Tabs
          items={battalions.map((item) => ({ id: item, label: item === 'all' ? 'All battalions' : item }))}
          activeId={battalion}
          onChange={setBattalion}
        />
        <Tabs
          items={[
            { id: 'all', label: 'All statuses' },
            { id: 'Healthy', label: 'Healthy' },
            { id: 'Warning', label: 'Warning' },
            { id: 'Critical', label: 'Critical' },
          ]}
          activeId={status}
          onChange={setStatus}
        />
      </FilterBar>

      {!stations.length ? (
        <LoadingState label="Loading station directory..." />
      ) : (
        <SectionCard title={`Stations (${filteredStations.length})`}>
          <div className="station-grid">
            {filteredStations.map((station) => (
              <article className="station-card" key={station.id}>
                <div>
                  <b>{station.name}</b>
                  <span>{station.address ?? station.city}</span>
                </div>
                <ReadinessScore score={station.readinessScore ?? station.readiness ?? 0} label={`${station.number ?? ''}`.trim() || 'Station'} />
                <div>
                  <StatusBadge status={station.status} />
                  <small className="muted">{station.battalion ?? 'Unassigned'}</small>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Directory table">
        <DataTable
          columns={['Number', 'Station', 'Battalion', 'Response Area', 'Readiness', 'Status']}
          rows={filteredStations}
          renderRow={(station) => (
            <>
              <td>{station.number ?? 'n/a'}</td>
              <td>
                <b>{station.name}</b>
                <br />
                <small>{station.address ?? station.city}</small>
              </td>
              <td>{station.battalion ?? 'Unassigned'}</td>
              <td>{station.responseArea ?? 'Agency coverage'}</td>
              <td>{station.readinessScore ?? station.readiness ?? 0}%</td>
              <td>
                <StatusBadge status={station.status} />
              </td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}
