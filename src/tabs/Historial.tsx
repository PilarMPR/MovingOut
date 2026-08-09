import { useState } from 'react';
import { Chip, FilterBar, FilterLabel } from '../components/FilterBar';
import { KpiCard } from '../components/KpiCard';
import { Panel } from '../components/Panel';
import { es, plural } from '../i18n/es';
import { formatDate, log, summary } from '../lib/history';
import { formatEUR, formatSignedEUR, formatSignedPercent } from '../lib/money';
import type { Store } from '../state/store';

type View = 'all' | 'up' | 'down';

export function Historial({ store }: { store: Store }) {
  const [view, setView] = useState<View>('all');
  const { scenario, derived } = store;

  const stats = summary(scenario.entries);
  const lines = log(scenario.entries).filter((line) => {
    if (view === 'all') return true;
    if (line.vsPreviousCents === null) return false;
    return view === 'up' ? line.vsPreviousCents > 0 : line.vsPreviousCents < 0;
  });

  return (
    <div className="stack">
      <div className="kgrid k4">
        <KpiCard
          label={es.historial.kpiDrift}
          cents={derived.driftCents ?? undefined}
          value={derived.driftCents === null ? es.common.none : undefined}
          signed
          hero
          tone={derived.driftCents === null ? 'plain' : derived.driftCents > 0 ? 'neg' : 'pos'}
          sub={derived.driftCents === null ? es.historial.kpiDriftNone : es.historial.kpiDriftSub}
        />
        <KpiCard
          label={es.historial.kpiRevisions}
          value={stats.revisionCount}
          sub={`${stats.revisedEntries} ${plural(
            stats.revisedEntries,
            es.historial.kpiRevisionsSubOne,
            es.historial.kpiRevisionsSub,
          )}`}
        />
        <KpiCard
          label={es.historial.kpiBiggest}
          value={stats.biggestRise === null ? es.historial.kpiBiggestNone : stats.biggestRise.label}
          sub={
            stats.biggestRise === null
              ? undefined
              : `${formatSignedEUR(stats.biggestRise.cents)}${
                  stats.biggestRise.percent === null
                    ? ''
                    : ` · ${formatSignedPercent(stats.biggestRise.percent)}`
                }`
          }
        />
        <KpiCard
          label={es.historial.kpiLast}
          value={stats.lastDate === null ? es.historial.kpiLastNone : formatDate(stats.lastDate)}
          sub={es.historial.kpiLastSub}
        />
      </div>

      <Panel
        label={es.historial.panel}
        actions={
          <span>
            {es.historial.note} · {es.historial.newestFirst}
          </span>
        }
      >
        <FilterBar>
          <FilterLabel>{es.historial.filterView}</FilterLabel>
          <Chip on={view === 'all'} onClick={() => setView('all')}>
            {es.historial.filterAll}
          </Chip>
          <Chip on={view === 'up'} onClick={() => setView('up')}>
            {es.historial.filterUp}
          </Chip>
          <Chip on={view === 'down'} onClick={() => setView('down')}>
            {es.historial.filterDown}
          </Chip>
        </FilterBar>

        {lines.length === 0 ? (
          <div className="empty-note">{es.historial.empty}</div>
        ) : (
          <div className="tblwrap">
            <table className="tbl-hist">
              <thead>
                <tr>
                  <th>{es.historial.colDate}</th>
                  <th>{es.historial.colConcept}</th>
                  <th className="r">{es.historial.colAmount}</th>
                  <th className="r">{es.historial.colVsPrevious}</th>
                  <th className="r">{es.historial.colVsOriginal}</th>
                  <th>{es.historial.colNote}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={`${line.entryId}-${line.date}-${i}`}>
                    <td className="cell-mono">{formatDate(line.date)}</td>
                    <td>{line.label}</td>
                    <td className="r cell-mono">{formatEUR(line.amountCents)}</td>
                    <td className="r">
                      {line.isFirst ? (
                        <span className="delta flat">{es.historial.initial}</span>
                      ) : line.vsPreviousCents === 0 || line.vsPreviousCents === null ? (
                        <span className="delta flat">{es.historial.noChange}</span>
                      ) : (
                        <span className={line.vsPreviousCents > 0 ? 'delta up' : 'delta down'}>
                          {formatSignedEUR(line.vsPreviousCents)}
                        </span>
                      )}
                    </td>
                    <td className="r">
                      {line.vsOriginalPercent === null || line.vsOriginalPercent === 0 ? (
                        <span className="delta flat">{es.common.none}</span>
                      ) : (
                        <span className={line.vsOriginalPercent > 0 ? 'delta up' : 'delta down'}>
                          {formatSignedPercent(line.vsOriginalPercent)}
                        </span>
                      )}
                    </td>
                    <td className="cell-note">{line.note ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
