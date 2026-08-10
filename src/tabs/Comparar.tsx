import { useState, type ReactNode } from 'react';
import { Button } from '../components/Button';
import { Insight } from '../components/Insight';
import { Panel } from '../components/Panel';
import { Tag } from '../components/Tag';
import type { TagTone } from '../components/Tag';
import { es } from '../i18n/es';
import { derive, identicalConcepts, type Derived } from '../lib/derive';
import { formatEUR, formatMonths, formatSignedEUR } from '../lib/money';
import type { Store } from '../state/store';
import type { Scenario } from '../types';

const VERDICT_TONE: Record<Derived['verdict'], TagTone> = {
  sindatos: 'neutral',
  ok: 'green',
  justo: 'amber',
  falta: 'red',
};

type Better = 'high' | 'low' | 'none';

interface Row {
  label: string;
  /** Which direction wins, so the accent underline marks "look here". */
  better: Better;
  values: number[];
  render: (derived: Derived) => ReactNode;
  /** Sign colouring, applied only where sign is genuinely the meaning. */
  tone?: (derived: Derived) => 'pos' | 'neg' | undefined;
}

export function Comparar({ store }: { store: Store }) {
  const { state } = store;
  const [onlyDifferences, setOnlyDifferences] = useState(true);
  const [showSame, setShowSame] = useState(false);

  const chosen = state.scenarios.filter((s) => state.compareIds.includes(s.id));
  const scenarios: Scenario[] = chosen.length >= 2 ? chosen : state.scenarios;

  if (scenarios.length < 2) {
    return (
      <Panel label={es.comparar.panel} body={<div className="empty-note">{es.comparar.needTwo}</div>} />
    );
  }

  const columns = scenarios.map((scenario) => ({
    scenario,
    derived: derive(scenario, state.settings, es.resumen.furnitureLine),
  }));

  const same = onlyDifferences ? identicalConcepts(scenarios) : 0;

  const rows: Row[] = [
    {
      label: es.comparar.rowVerdict,
      better: 'none',
      values: columns.map(() => 0),
      render: (d) => <Tag tone={VERDICT_TONE[d.verdict]}>{verdictText(d)}</Tag>,
    },
    {
      label: es.comparar.rowBalance,
      better: 'high',
      values: columns.map((c) => c.derived.totals.balanceCents),
      render: (d) => formatSignedEUR(d.totals.balanceCents),
      tone: (d) => (d.totals.balanceCents >= 0 ? 'pos' : 'neg'),
    },
    {
      label: es.comparar.rowIn,
      better: 'high',
      values: columns.map((c) => c.derived.totals.inCents),
      render: (d) => formatEUR(d.totals.inCents),
    },
    {
      label: es.comparar.rowOut,
      better: 'low',
      values: columns.map((c) => c.derived.totals.outCents),
      render: (d) => formatEUR(d.totals.outCents),
    },
    {
      label: es.comparar.rowUpfront,
      better: 'low',
      values: columns.map((c) => c.derived.upfront.cashCents),
      render: (d) => formatEUR(d.upfront.cashCents),
    },
    {
      label: es.comparar.rowSpend,
      better: 'low',
      values: columns.map((c) => c.derived.upfront.spendCents),
      render: (d) => formatEUR(d.upfront.spendCents),
    },
    {
      label: es.comparar.rowSavingsLeft,
      better: 'high',
      values: columns.map((c) => c.derived.savingsAfterUpfrontCents),
      render: (d) => formatEUR(d.savingsAfterUpfrontCents),
    },
    {
      label: es.comparar.rowMargin,
      better: 'high',
      values: columns.map((c) => c.derived.totals.balanceCents),
      render: (d) => marginText(d),
      tone: (d) => (d.verdict === 'falta' ? 'neg' : undefined),
    },
    {
      label: es.comparar.rowMissing,
      better: 'low',
      values: columns.map((c) => c.derived.coverage.total - c.derived.coverage.withAmount),
      render: (d) => String(d.coverage.total - d.coverage.withAmount),
    },
  ];

  const bestIndex = (row: Row): number | null => {
    if (row.better === 'none') return null;
    const unique = new Set(row.values);
    if (unique.size <= 1) return null;
    let best = 0;
    row.values.forEach((value, i) => {
      const wins = row.better === 'high' ? value > row.values[best] : value < row.values[best];
      if (wins) best = i;
    });
    return best;
  };

  const leader = bestIndex(rows[1]);

  return (
    <Panel
      label={`${es.comparar.panel} · ${scenarios.length}`}
      actions={
        <Button variant="onInk" onClick={() => setOnlyDifferences(!onlyDifferences)}>
          {onlyDifferences ? es.comparar.onlyDifferencesOn : es.comparar.onlyDifferences}
        </Button>
      }
    >
      <div className="tblwrap">
        <table className="cmp">
          <thead>
            <tr>
              <th>&nbsp;</th>
              {columns.map((column, i) => (
                <th key={column.scenario.id} className={i === leader ? 'win' : undefined}>
                  {column.scenario.name}
                  <br />
                  <span>{es.situacion[column.scenario.situacion]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const best = bestIndex(row);
              return (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  {columns.map((column, i) => {
                    const tone = row.tone?.(column.derived);
                    const className = [i === best ? 'best' : '', tone ?? ''].filter(Boolean).join(' ');
                    return (
                      <td key={column.scenario.id} className={className === '' ? undefined : className}>
                        {row.render(column.derived)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {same > 0 && (
              <tr className="same">
                <td colSpan={columns.length + 1}>
                  {same} {es.comparar.sameRowPrefix}
                  <button type="button" className="reveal" onClick={() => setShowSame(!showSame)}>
                    {showSame ? es.comparar.hide : es.comparar.show}
                  </button>
                </td>
              </tr>
            )}

            {same > 0 &&
              showSame &&
              identicalLabels(scenarios).map((label) => (
                <tr key={label}>
                  <td>{label}</td>
                  {columns.map((column) => (
                    <td key={column.scenario.id}>{sameAmount(column.scenario, label)}</td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="pb">
        <Insight>
          <SummarySentence columns={columns} />
        </Insight>
      </div>
    </Panel>
  );
}

function verdictText(d: Derived): string {
  if (d.verdict === 'falta') return es.verdict.faltaPrefix + formatEUR(d.shortfallCents);
  if (d.verdict === 'justo') return es.verdict.justo;
  return d.verdict === 'sindatos' ? es.verdict.sindatos : es.verdict.ok;
}

function marginText(d: Derived): string {
  if (d.sixth.kind === 'runway') {
    return d.sixth.months === null
      ? es.resumen.runwayNone
      : `${formatMonths(d.sixth.months)} ${es.comparar.monthsSuffix}`;
  }
  if (d.sixth.kind === 'buffer') {
    return d.sixth.covered
      ? es.comparar.bufferCovered
      : formatEUR(d.sixth.savingsAfterUpfrontCents);
  }
  return formatSignedEUR(d.sixth.balanceCents) + es.common.perMonth;
}

/** Labels whose monthly equivalent matches across every compared scenario. */
function identicalLabels(scenarios: Scenario[]): string[] {
  const first = scenarios[0].entries.filter((entry) => entry.room === undefined);
  return first
    .filter((entry) =>
      scenarios
        .slice(1)
        .every((scenario) =>
          scenario.entries.some(
            (other) => other.label === entry.label && other.amountCents === entry.amountCents,
          ),
        ),
    )
    .map((entry) => entry.label);
}

function sameAmount(scenario: Scenario, label: string): string {
  const entry = scenario.entries.find((e) => e.label === label);
  if (entry === undefined || !entry.hasAmount) return es.costes.empty;
  return formatEUR(entry.amountCents);
}

function SummarySentence({ columns }: { columns: { scenario: Scenario; derived: Derived }[] }) {
  const sorted = [...columns].sort(
    (a, b) => b.derived.totals.balanceCents - a.derived.totals.balanceCents,
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const gap = best.derived.totals.balanceCents - worst.derived.totals.balanceCents;

  if (gap === 0) return <>{es.comparar.insightTie}</>;

  return (
    <>
      {es.comparar.insightBestPrefix} <b>{best.scenario.name}</b>, {es.comparar.insightBestMiddle}{' '}
      <b>
        {formatSignedEUR(best.derived.totals.balanceCents)}
        {es.common.perMonth}
      </b>
      . {es.comparar.insightWorstPrefix} <b>{worst.scenario.name}</b>,{' '}
      {es.comparar.insightWorstMiddle}{' '}
      <b>
        {formatSignedEUR(worst.derived.totals.balanceCents)}
        {es.common.perMonth}
      </b>
      . {es.comparar.insightGapPrefix} <b>{formatEUR(gap)}</b> {es.comparar.insightGapSuffix}
    </>
  );
}
