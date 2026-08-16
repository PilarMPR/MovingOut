import { useMemo, useState } from 'react';
import { AddRow } from '../components/AddRow';
import { EditableAmount, EditableText } from '../components/EditableCell';
import { KpiCard } from '../components/KpiCard';
import { Panel } from '../components/Panel';
import { Tag } from '../components/Tag';
import { es, plural } from '../i18n/es';
import { formatEUR } from '../lib/money';
import { desgloseTotals, summarise, type PartsStatus } from '../lib/parts';
import type { Store } from '../state/store';
import type { Entry } from '../types';

/**
 * Desglose — where each concepto's money is actually going.
 *
 * The rule this screen is built around, and the one it repeats in copy because
 * it is the thing that makes the screen usable: **nothing written here changes
 * a total.** The concepto's own importe is the figure the whole app reads, and
 * a desglose only explains it (types.ts, `Part`). If breaking a row down could
 * raise what the flat costs, writing detail would be an act of courage and the
 * tab would sit empty exactly when it would help most.
 *
 * It is its own tab rather than an expander inside the Costes grid because that
 * grid is already ten columns and 1080 px wide, and a tree inside it would be
 * unreadable on the screen where it is most needed. Here a concepto gets the
 * whole right-hand panel.
 *
 * The one thing the screen will not do quietly is fix a mismatch. When the
 * parts come to more than the importe above, it says so and *leaves the importe
 * alone* — raising it is a revision of an estimate, it belongs in Historial,
 * and it happens only when the user presses the button that says so.
 */

const STATUS_TAG: Record<PartsStatus, { tone: 'green' | 'amber' | 'red' | 'neutral'; key: keyof typeof LABEL }> = {
  vacio: { tone: 'neutral', key: 'statusVacio' },
  parcial: { tone: 'amber', key: 'statusParcial' },
  cuadra: { tone: 'green', key: 'statusCuadra' },
  pasado: { tone: 'red', key: 'statusPasado' },
};

const LABEL = {
  statusVacio: es.desglose.statusVacio,
  statusParcial: es.desglose.statusParcial,
  statusCuadra: es.desglose.statusCuadra,
  statusPasado: es.desglose.statusPasado,
};

export function Desglose({ store }: { store: Store }) {
  const entries = store.scenario.entries;
  const totals = useMemo(() => desgloseTotals(entries), [entries]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // The selection is held by id and resolved on every render, so a concepto
  // deleted in Costes on another tab cannot leave a stale copy of itself on
  // screen. Falling back to the first row keeps the right panel from going
  // blank the moment something is removed.
  const selected: Entry | undefined =
    entries.find((entry) => entry.id === selectedId) ?? entries[0];

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle === '') return entries;
    return entries.filter((entry) => entry.label.toLowerCase().includes(needle));
  }, [entries, search]);

  return (
    <div className="stack">
      <div className="kgrid k3">
        <KpiCard
          label={es.desglose.kpiBrokenDown}
          value={totals.conceptosBrokenDown}
          tone="plain"
          sub={`${es.desglose.kpiBrokenDownSub} ${totals.conceptosTotal} ${es.desglose.kpiBrokenDownSubSuffix}`}
        />
        <KpiCard
          label={es.desglose.kpiOver}
          value={totals.overCount}
          tone={totals.overCount > 0 ? 'neg' : 'plain'}
          sub={totals.overCount > 0 ? es.desglose.kpiOverSub : es.desglose.kpiOverNone}
        />
        <KpiCard
          label={es.desglose.kpiIncomplete}
          value={totals.incompleteCount}
          tone={totals.incompleteCount > 0 ? 'warn' : 'plain'}
          sub={
            totals.incompleteCount > 0 ? es.desglose.kpiIncompleteSub : es.desglose.kpiIncompleteNone
          }
        />
      </div>

      <div className="desg-split">
        <Panel label={es.tabs.costes} tone="accent">
          {entries.length === 0 ? (
            <div className="empty-note">{es.desglose.pickEmpty}</div>
          ) : (
            <>
              <div className="pad">
                <EditableText
                  value={search}
                  ariaLabel={es.desglose.searchPlaceholder}
                  placeholder={es.desglose.searchPlaceholder}
                  onChange={setSearch}
                />
              </div>
              {visible.length === 0 ? (
                <div className="empty-note">{es.desglose.searchEmpty}</div>
              ) : (
                <ul className="picker">
                  {visible.map((entry) => {
                    const summary = summarise(entry);
                    const tag = STATUS_TAG[summary.status];
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          className={entry.id === selected?.id ? 'pick on' : 'pick'}
                          onClick={() => setSelectedId(entry.id)}
                        >
                          <span className="pick-l">{entry.label}</span>
                          <span className="pick-r">
                            {entry.hasAmount ? formatEUR(entry.amountCents) : es.desglose.empty}
                          </span>
                          {summary.count > 0 && <Tag tone={tag.tone}>{LABEL[tag.key]}</Tag>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </Panel>

        {selected === undefined ? (
          <Panel label={es.desglose.panel} tone="accent">
            <div className="empty-note">{es.desglose.pick}</div>
          </Panel>
        ) : (
          <Breakdown key={selected.id} store={store} entry={selected} />
        )}
      </div>

      <div className="pb">
        <p className="upnote">{es.desglose.intro}</p>
      </div>
    </div>
  );
}

/** One concepto's parts, its arithmetic, and the one button that revises it. */
function Breakdown({ store, entry }: { store: Store; entry: Entry }) {
  const summary = summarise(entry);
  const { parts, totalCents, unallocatedCents, missingCount, status } = summary;

  return (
    <Panel
      label={`${es.desglose.panel} · ${entry.label}`}
      tone={status === 'pasado' ? 'red' : status === 'cuadra' ? 'green' : 'accent'}
      actions={<span>{es.desglose.note}</span>}
    >
      {parts.length === 0 ? (
        <div className="empty-note">{es.desglose.emptyList}</div>
      ) : (
        <div className="tblwrap">
          <table className="tbl-colchon">
            <thead>
              <tr>
                <th>{es.desglose.colPart}</th>
                <th className="r">{es.desglose.colAmount}</th>
                <th>{es.desglose.colNote}</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => (
                <tr key={part.id}>
                  <td>
                    <div className="concepto">
                      <span className="pdot" />
                      <EditableText
                        value={part.label}
                        ariaLabel={es.desglose.colPart}
                        onChange={(label) => store.patchPart(entry.id, part.id, { label })}
                      />
                    </div>
                  </td>
                  <td>
                    <div className="amount">
                      <EditableAmount
                        cents={part.amountCents}
                        hasAmount={part.hasAmount}
                        emptyLabel={es.desglose.empty}
                        ariaLabel={es.desglose.colAmount}
                        // No revision is pushed: a part carries no history,
                        // because changing one moves no figure the app reads.
                        onCommit={(cents) =>
                          store.patchPart(entry.id, part.id, {
                            amountCents: cents ?? 0,
                            hasAmount: cents !== null,
                          })
                        }
                      />
                    </div>
                  </td>
                  <td>
                    <div className="rowend">
                      <EditableText
                        value={part.note ?? ''}
                        ariaLabel={es.desglose.colNote}
                        placeholder={es.costes.notePlaceholder}
                        onChange={(note) => store.patchPart(entry.id, part.id, { note })}
                      />
                      <button
                        type="button"
                        className="hist off"
                        aria-label={es.desglose.delete}
                        onClick={() => store.removePart(entry.id, part.id)}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              <tr className="tot">
                <td colSpan={3}>
                  <div className="totstrip">
                    <span>
                      {es.desglose.headline}
                      <br />
                      {entry.hasAmount ? formatEUR(entry.amountCents) : es.desglose.empty}
                    </span>
                    <div className="tgap" />
                    {missingCount > 0 && (
                      <span className="micro">
                        {missingCount}{' '}
                        {plural(missingCount, es.desglose.missingOne, es.desglose.missing)}
                      </span>
                    )}
                    <div className="tcol">
                      {es.desglose.listed}
                      <span className="tv quiet">{formatEUR(totalCents)}</span>
                    </div>
                    <div className="tcol">
                      {unallocatedCents < 0 ? es.desglose.over : es.desglose.left}
                      <span className={unallocatedCents < 0 ? 'tv neg' : 'tv warn'}>
                        {formatEUR(Math.abs(unallocatedCents))}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <AddRow
        label={es.desglose.add}
        onClick={() => store.addPart(entry.id, es.desglose.newLabel)}
      />

      <div className="pb">
        <p className="upnote">
          {!entry.hasAmount && parts.length > 0 && es.desglose.noteNoHeadline}
          {entry.hasAmount && status === 'cuadra' && (
            <>
              <Tag tone="green">{LABEL.statusCuadra}</Tag> {es.desglose.noteCuadra}
            </>
          )}
          {entry.hasAmount && status === 'parcial' && (
            <>
              <Tag tone="amber">{LABEL.statusParcial}</Tag> {es.desglose.noteParcial}{' '}
              <b>{formatEUR(unallocatedCents)}</b>.
            </>
          )}
          {entry.hasAmount && status === 'pasado' && (
            <>
              <Tag tone="red">{LABEL.statusPasado}</Tag> {es.desglose.notePasado}{' '}
              <b>{formatEUR(Math.abs(unallocatedCents))}</b> {es.desglose.notePasadoSuffix}
            </>
          )}
          {/* The revision, and the only control on this screen that touches a
              figure the app reads. Offered whenever the two disagree and there
              is something priced to adopt — including downwards, since a
              desglose that comes to less is just as much a finding. */}
          {totalCents > 0 && (status === 'pasado' || status === 'parcial') && (
            <>
              <br />
              <button type="button" className="lnk" onClick={() => store.adoptPartsTotal(entry.id)}>
                {es.desglose.adopt} {formatEUR(totalCents)}
              </button>{' '}
              <span className="micro">{es.desglose.adoptNote}</span>
            </>
          )}
        </p>
      </div>
    </Panel>
  );
}
