import { useState, type ReactNode } from 'react';
import { Button } from '../components/Button';
import { Insight } from '../components/Insight';
import { Panel } from '../components/Panel';
import { VerdictTag } from '../components/VerdictTag';
import { es } from '../i18n/es';
import { derive, identicalConcepts, type Derived } from '../lib/derive';
import { formatEUR, formatMonths, formatSignedEUR } from '../lib/money';
import type { Store } from '../state/store';
import type { Scenario } from '../types';

/** Which way is better, so the delta can be coloured by outcome and not by sign. */
type Better = 'high' | 'low' | 'none';

interface Row {
  label: string;
  better: Better;
  /** The number the delta is computed from. `null` for a text-only row. */
  value: (derived: Derived) => number | null;
  render: (derived: Derived) => ReactNode;
  /** Money formats as EUR; a count formats as a bare number. */
  money?: boolean;
}

const ROWS: Row[] = [
  {
    label: es.comparar.rowBalance,
    better: 'high',
    value: (d) => d.totals.balanceCents,
    render: (d) => formatSignedEUR(d.totals.balanceCents),
    money: true,
  },
  {
    label: es.comparar.rowIn,
    better: 'high',
    value: (d) => d.totals.inCents,
    render: (d) => formatEUR(d.totals.inCents),
    money: true,
  },
  {
    label: es.comparar.rowOut,
    better: 'low',
    value: (d) => d.totals.outCents,
    render: (d) => formatEUR(d.totals.outCents),
    money: true,
  },
  {
    label: es.comparar.rowUpfront,
    better: 'low',
    value: (d) => d.upfront.cashCents,
    render: (d) => formatEUR(d.upfront.cashCents),
    money: true,
  },
  {
    label: es.comparar.rowSpend,
    better: 'low',
    value: (d) => d.upfront.spendCents,
    render: (d) => formatEUR(d.upfront.spendCents),
    money: true,
  },
  {
    // Neutral on purpose: a bigger fianza is more cash to find and none of it
    // is lost, so calling either direction "better" would be a lie.
    label: es.comparar.rowFianza,
    better: 'none',
    value: (d) => d.upfront.refundableCents,
    render: (d) => formatEUR(d.upfront.refundableCents),
    money: true,
  },
  {
    label: es.comparar.rowSavingsLeft,
    better: 'high',
    value: (d) => d.savingsAfterUpfrontCents,
    render: (d) => formatEUR(d.savingsAfterUpfrontCents),
    money: true,
  },
  {
    label: es.comparar.rowMargin,
    better: 'none',
    value: () => null,
    render: (d) => marginText(d),
  },
  {
    label: es.comparar.rowMissing,
    better: 'low',
    value: (d) => d.coverage.total - d.coverage.withAmount,
    render: (d) => String(d.coverage.total - d.coverage.withAmount),
  },
];

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
    derived: derive(scenario, state.settings, es.resumen.furnitureLine, store.todayDate),
  }));

  // Differences are measured from where you are standing. If the active
  // scenario is not one of the compared ones, the first column is the ground.
  const hereIndex = Math.max(
    0,
    columns.findIndex((c) => c.scenario.id === state.activeScenarioId),
  );
  const here = columns[hereIndex];
  const same = onlyDifferences ? identicalConcepts(scenarios) : 0;

  const template = `200px repeat(${columns.length}, minmax(150px, 1fr))`;

  return (
    <Panel
      label={`${es.comparar.panel} · ${scenarios.length}`}
      actions={
        <>
          <span>
            {es.comparar.against} {here.scenario.name}
          </span>
          <Button variant="onInk" onClick={() => setOnlyDifferences(!onlyDifferences)}>
            {onlyDifferences ? es.comparar.onlyDifferencesOn : es.comparar.onlyDifferences}
          </Button>
        </>
      }
    >
      <div className="tblwrap">
        <div className="cmp" style={{ gridTemplateColumns: template }}>
          <div className="ch corner" />
          {columns.map((column, i) => (
            <div key={column.scenario.id} className={i === hereIndex ? 'ch here' : 'ch'}>
              <b>{column.scenario.name}</b>
              <em>{es.situacion[column.scenario.situacion]}</em>
              <VerdictTag
                verdict={column.derived.verdict}
                shortfallCents={column.derived.shortfallCents}
                compact
              />
            </div>
          ))}

          {ROWS.map((row) => {
            const base = row.value(here.derived);
            return (
              <div key={row.label} style={{ display: 'contents' }}>
                <div className="rl">{row.label}</div>
                {columns.map((column, i) => {
                  const value = row.value(column.derived);
                  const isHere = i === hereIndex;
                  const diff = value === null || base === null ? null : value - base;
                  const good =
                    diff === null || diff === 0 || row.better === 'none'
                      ? ''
                      : (row.better === 'high') === diff > 0
                          ? 'good'
                          : 'bad';
                  return (
                    <div
                      key={column.scenario.id}
                      className={isHere ? 'cc here' : 'cc'}
                    >
                      <span className="cv">{row.render(column.derived)}</span>
                      <span className={`cd ${isHere ? 'here' : good}`}>
                        {isHere
                          ? es.comparar.here
                          : diff === null
                            ? es.common.none
                            : diff === 0
                              ? es.comparar.equal
                              : row.money === true
                                ? formatSignedEUR(diff)
                                : (diff > 0 ? '+' : '') + String(diff)}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {same > 0 && (
            <div className="same">
              {same} {es.comparar.sameRowPrefix}
              <button type="button" className="reveal" onClick={() => setShowSame(!showSame)}>
                {showSame ? es.comparar.hide : es.comparar.show}
              </button>
            </div>
          )}

          {same > 0 &&
            showSame &&
            identicalLabels(scenarios).map((label) => (
              <div key={label} style={{ display: 'contents' }}>
                <div className="rl">{label}</div>
                {columns.map((column, i) => (
                  <div key={column.scenario.id} className={i === hereIndex ? 'cc here' : 'cc'}>
                    <span className="cv">{sameAmount(column.scenario, label)}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>

      <div className="pb">
        <Insight label={es.comparar.insightLabel}>
          <SummarySentence columns={columns} />
        </Insight>
        <p className="micro" style={{ marginTop: 10 }}>
          {es.comparar.note}
        </p>
      </div>
    </Panel>
  );
}

function marginText(d: Derived): string {
  if (d.sixth.kind === 'runway') {
    return d.sixth.months === null
      ? es.resumen.runwayNone
      : `${formatMonths(d.sixth.months)} ${es.comparar.monthsSuffix}`;
  }
  if (d.sixth.kind === 'buffer') {
    return d.sixth.covered ? es.comparar.bufferCovered : formatEUR(d.sixth.savingsAfterUpfrontCents);
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
