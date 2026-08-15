import { BreakdownBar } from '../components/BreakdownBar';
import { Insight } from '../components/Insight';
import type { InsightTone } from '../components/Insight';
import { KpiCard } from '../components/KpiCard';
import { Panel } from '../components/Panel';
import { Tag } from '../components/Tag';
import { VERDICT_DOT } from '../components/VerdictTag';
import { es, plural } from '../i18n/es';
import { formatEUR, formatMonths, formatPercent } from '../lib/money';
import { labelOf } from '../lib/taxonomy';
import type { Derived, SixthKpi } from '../lib/derive';
import type { Store } from '../state/store';

const INSIGHT_TONE: Record<Derived['verdict'], InsightTone> = {
  sindatos: 'neutral',
  ok: 'green',
  justo: 'amber',
  falta: 'red',
};

/**
 * The sixth KPI changes identity with the sign of the balance. The label
 * changes; the slot does not move — and there is no branch in which a positive
 * balance reports runway, which is why `∞ meses` can never render.
 */
function SixthCard({ sixth }: { sixth: SixthKpi }) {
  if (sixth.kind === 'runway') {
    return (
      <KpiCard
        label={es.resumen.kpiRunway}
        value={sixth.months === null ? es.resumen.runwayNone : formatMonths(sixth.months)}
        tone="neg"
        sub={
          sixth.months === null ? undefined : (
            <>
              {formatEUR(sixth.savingsAfterUpfrontCents)} {es.resumen.runwaySubPrefix}
              <br />
              {formatEUR(sixth.deficitCents)}
              {es.resumen.runwaySubSuffix}
            </>
          )
        }
      />
    );
  }

  if (sixth.kind === 'margin') {
    return (
      <KpiCard
        label={es.resumen.kpiMargin}
        cents={sixth.balanceCents}
        tone="warn"
        signed
        sub={
          sixth.monthsPerHundred === null ? undefined : (
            <>
              {es.resumen.marginShockPrefix}
              <br />
              {formatMonths(sixth.monthsPerHundred)} {es.resumen.marginShockSuffix}
            </>
          )
        }
      />
    );
  }

  const noTarget = sixth.targetCents === 0;
  return (
    <KpiCard
      label={es.resumen.kpiBuffer}
      value={
        noTarget
          ? es.resumen.bufferNoTarget
          : sixth.covered
            ? es.resumen.bufferCovered
            : es.resumen.bufferShort
      }
      tone={noTarget ? 'plain' : sixth.covered ? 'info' : 'warn'}
      sub={
        noTarget ? (
          es.resumen.bufferNoTargetSub
        ) : (
          <>
            {es.resumen.bufferSubPrefix} {formatEUR(sixth.targetCents)}
            <br />
            {es.resumen.bufferSubMiddle} {formatEUR(sixth.savingsAfterUpfrontCents)}{' '}
            {es.resumen.bufferSubSuffix}
          </>
        )
      }
    />
  );
}

function InsightSentence({ derived }: { derived: Derived }) {
  const { totals, verdict, sixth, runwayMonths, coverage } = derived;
  const missing = coverage.total - coverage.withAmount;

  if (totals.inCents === 0 && totals.outCents === 0) {
    return <>{es.resumen.insightNoData}</>;
  }

  const tail =
    missing > 0 ? (
      <>
        {' '}
        {plural(missing, es.resumen.insightCoveragePrefixOne, es.resumen.insightCoveragePrefix)}{' '}
        <b>{missing}</b>{' '}
        {plural(missing, es.resumen.insightCoverageSuffixOne, es.resumen.insightCoverageSuffix)}
      </>
    ) : null;

  if (verdict === 'falta') {
    return (
      <>
        {es.resumen.insightFaltaPrefix} <b>{formatEUR(derived.shortfallCents)}</b>{' '}
        {es.resumen.insightFaltaSuffix}{' '}
        {runwayMonths === null ? (
          es.resumen.insightNoRunway
        ) : (
          <>
            {es.resumen.insightRunwayPrefix} <b>{formatMonths(runwayMonths)}</b>{' '}
            {es.resumen.insightRunwaySuffix}
          </>
        )}
        {tail}
      </>
    );
  }

  if (verdict === 'justo') {
    return (
      <>
        {es.resumen.insightJustoPrefix} <b>{formatEUR(totals.balanceCents)}</b>{' '}
        {es.resumen.insightJustoSuffix}{' '}
        {sixth.kind === 'margin' && sixth.monthsPerHundred !== null && (
          <>
            {es.resumen.marginShockPrefix} <b>{formatMonths(sixth.monthsPerHundred)}</b>{' '}
            {es.resumen.marginShockSuffix}.
          </>
        )}
        {tail}
      </>
    );
  }

  const target = sixth.kind === 'buffer' ? sixth.targetCents : 0;
  return (
    <>
      {es.resumen.insightOkPrefix} <b>{formatEUR(totals.balanceCents)}</b> {es.resumen.insightOkSuffix}{' '}
      {target === 0 ? (
        es.resumen.insightBufferNoTarget
      ) : derived.bufferCovered ? (
        es.resumen.insightBufferCovered
      ) : (
        <>
          {es.resumen.insightBufferShortPrefix}{' '}
          <b>{formatEUR(derived.savingsAfterUpfrontCents)}</b>{' '}
          {es.resumen.insightBufferShortMiddle} {formatEUR(target)}.
        </>
      )}
      {tail}
    </>
  );
}

export function Resumen({ store }: { store: Store }) {
  const { derived, scenario, state } = store;
  const { totals, upfront, breakdown, coverage } = derived;

  const largest = breakdown.length > 0 ? breakdown[0].monthlyCents : 0;
  const noIncome = totals.inCents === 0;

  return (
    <div className="stack">
      <Panel
        label={`${es.resumen.verdictPanel} · ${scenario.name}`}
        tone={VERDICT_DOT[derived.verdict]}
        actions={<span>{es.situacion[scenario.situacion]}</span>}
      >
        <div className="kgrid k5">
          <KpiCard
            label={es.resumen.kpiIn}
            cents={totals.inCents}
            tone={totals.inCents > 0 ? 'pos' : 'plain'}
            sub={
              <>
                {totals.inCount}{' '}
                {plural(totals.inCount, es.costes.totalConcept, es.costes.totalConcepts)}
                <br />
                {es.resumen.inSub}
              </>
            }
          />
          <KpiCard
            label={es.resumen.kpiOut}
            cents={totals.outCents}
            tone={totals.outCents > 0 ? 'neg' : 'plain'}
            sub={
              // The log is a salida but it is not a concepto, so it gets its own
              // line rather than being folded into a count of rows that does not
              // include it.
              derived.spend.monthlyCents > 0 ? (
                <>
                  {es.resumen.outSubPrefix} {coverage.withAmount} {es.resumen.outSubMiddle}{' '}
                  {coverage.total} {es.resumen.outSubSuffix}
                  <br />+ {formatEUR(derived.spend.monthlyCents)} {es.resumen.outSubLogged}
                </>
              ) : (
                <>
                  {es.resumen.outSubPrefix} {coverage.withAmount} {es.resumen.outSubMiddle}{' '}
                  {coverage.total}
                  <br />
                  {es.resumen.outSubSuffix}
                </>
              )
            }
          />
          <KpiCard
            label={es.resumen.kpiBalance}
            cents={totals.balanceCents}
            tone={
              derived.verdict === 'falta'
                ? 'neg'
                : derived.verdict === 'justo'
                  ? 'warn'
                  : derived.verdict === 'sindatos'
                    ? 'plain'
                    : 'pos'
            }
            signed
            hero
            sub={
              derived.balanceShareOfIn === null ? (
                es.resumen.balanceSub
              ) : (
                <>
                  {formatPercent(derived.balanceShareOfIn)} {es.resumen.balanceShare}
                </>
              )
            }
          />
          <KpiCard label={es.resumen.kpiUpfront} cents={upfront.cashCents} sub={es.resumen.upfrontSub} />

          <KpiCard
            label={es.resumen.kpiSpend}
            cents={upfront.spendCents}
            tone="warn"
            sub={
              <>
                {es.resumen.spendSubPrefix} {formatEUR(upfront.refundableCents)}
                <br />
                {es.resumen.spendSub}
              </>
            }
          />
          <SixthCard sixth={derived.sixth} />
          {/* A guideline, and it looks like one: the quietest number on the
              screen, with its assumption printed under it. It never gates. */}
          <KpiCard
            label={es.resumen.kpiMaxRent}
            cents={noIncome ? undefined : derived.maxAffordableRentCents}
            value={noIncome ? es.common.none : undefined}
            tone="quiet"
            sub={
              noIncome ? (
                es.resumen.guideNoIncome
              ) : (
                <>
                  {es.resumen.guideWhyPrefix} {state.settings.maxRentPercent} %{' '}
                  {es.resumen.guideWhyMiddle} {formatEUR(totals.inCents)}
                  {es.common.perMonth}
                  <br />
                  {es.resumen.guideWhySuffix}
                </>
              )
            }
          />
          <KpiCard
            label={es.resumen.kpiDrift}
            cents={derived.driftCents ?? undefined}
            value={derived.driftCents === null ? es.common.none : undefined}
            signed
            wide
            tone={
              derived.driftCents === null ? 'plain' : derived.driftCents > 0 ? 'neg' : 'pos'
            }
            sub={derived.driftCents === null ? es.resumen.driftNone : es.resumen.driftSub}
          />
        </div>
      </Panel>

      <div className="res-split">
        <Panel
          label={es.resumen.barsPanel}
          tone="blue"
          actions={
            <span>
              {formatEUR(totals.outCents)}
              {es.common.perMonth}
            </span>
          }
          // Two footnotes, and only one of them is ever a problem: the first says
          // part of the bars is observed rather than estimated, the second says
          // some of it is being counted twice. The warning wins the slot when
          // both apply — a duplicate total is worse than an unexplained one.
          body={
            derived.overlaps.length > 0 ? (
              <p className="upnote">
                {derived.overlaps.length === 1 ? (
                  <>
                    {es.resumen.barsOverlapPrefix}{' '}
                    <b>{labelOf(state.categories, derived.overlaps[0].category)}</b>{' '}
                    {es.resumen.barsOverlapSuffix}
                  </>
                ) : (
                  es.resumen.barsOverlapMany
                )}
              </p>
            ) : derived.spend.monthlyCents > 0 ? (
              <p className="upnote">
                {es.resumen.barsLoggedPrefix} <b>{formatEUR(derived.spend.monthlyCents)}</b>{' '}
                {es.resumen.barsLoggedSuffix}
              </p>
            ) : undefined
          }
        >
          {breakdown.length === 0 ? (
            <div className="empty-note">{es.resumen.insightNoData}</div>
          ) : (
            <div className="bars">
              {breakdown.map((slice, i) => (
                <BreakdownBar
                  key={slice.category}
                  label={labelOf(state.categories, slice.category)}
                  percent={slice.percent}
                  fraction={largest === 0 ? 0 : (slice.monthlyCents / largest) * 0.92}
                  amountCents={slice.monthlyCents}
                  opacity={Math.max(0.38, 1 - i * 0.13)}
                  missingCount={slice.missingCount}
                  pausedLabel={slice.allPaused ? es.resumen.barsPaused : undefined}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel label={es.resumen.upfrontPanel} tone="amber">
          <div className="ledger">
            {upfront.lines.length === 0 && (
              <div className="empty-note">{es.resumen.ledgerEmpty}</div>
            )}
            {upfront.lines.map((line) => (
              <div className={line.shouldNotPay ? 'lrow flagged' : 'lrow'} key={line.id}>
                <span className="ll">
                  {line.label}
                  {line.refundable && <Tag tone="blue">{es.resumen.refundable}</Tag>}
                  {line.shouldNotPay && <Tag tone="red">{es.resumen.shouldNotPay}</Tag>}
                </span>
                <span className="lv">{formatEUR(line.amountCents)}</span>
              </div>
            ))}
          </div>

          {/* The two figures the ledger exists to separate. The gap between
              them is exactly the fianza, which is why they sit side by side. */}
          <div className="upsum">
            <div className="upboxes">
              <div className="upbox">
                <div className="ul">{es.resumen.ledgerUpfront}</div>
                <div className="uv">{formatEUR(upfront.cashCents)}</div>
              </div>
              <div className="upbox warn">
                <div className="ul">{es.resumen.ledgerSpend}</div>
                <div className="uv">{formatEUR(upfront.spendCents)}</div>
              </div>
            </div>
            <p className="upnote">
              {upfront.refundableCents > 0 ? (
                <>
                  {es.resumen.fianzaNotePrefix} {formatEUR(upfront.refundableCents)}{' '}
                  {es.resumen.fianzaNoteMiddle} <b>{es.resumen.fianzaNoteWord}</b>{' '}
                  {es.resumen.fianzaNoteSuffix}
                </>
              ) : (
                es.resumen.ledgerNote
              )}
              {upfront.missingCount > 0 && (
                <>
                  <br />
                  {upfront.missingCount}{' '}
                  {plural(
                    upfront.missingCount,
                    es.resumen.ledgerMissingOne,
                    es.resumen.ledgerMissing,
                  )}
                </>
              )}
            </p>
          </div>
        </Panel>
      </div>

      <Insight label={es.resumen.insightPanel} tone={INSIGHT_TONE[derived.verdict]}>
        <InsightSentence derived={derived} />
      </Insight>
    </div>
  );
}
