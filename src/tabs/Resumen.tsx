import { BreakdownBar } from '../components/BreakdownBar';
import { Insight } from '../components/Insight';
import { KpiCard } from '../components/KpiCard';
import { Panel } from '../components/Panel';
import { Tag } from '../components/Tag';
import type { TagTone } from '../components/Tag';
import type { DotTone } from '../components/Panel';
import { es, plural } from '../i18n/es';
import { formatDate } from '../lib/history';
import {
  formatEUR,
  formatMonths,
  formatPercent,
  formatSignedEUR,
} from '../lib/money';
import type { Derived, SixthKpi } from '../lib/derive';
import type { Store } from '../state/store';

const VERDICT_TONE: Record<Derived['verdict'], TagTone> = {
  ok: 'green',
  justo: 'amber',
  falta: 'red',
};

const VERDICT_DOT: Record<Derived['verdict'], DotTone> = {
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

  return (
    <KpiCard
      label={es.resumen.kpiBuffer}
      value={sixth.covered ? es.resumen.bufferCovered : es.resumen.bufferShort}
      tone={sixth.covered ? 'plain' : 'warn'}
      sub={
        <>
          {es.resumen.bufferSubPrefix} {formatEUR(sixth.targetCents)}
          <br />
          {es.resumen.bufferSubMiddle} {formatEUR(sixth.savingsAfterUpfrontCents)}{' '}
          {es.resumen.bufferSubSuffix}
        </>
      }
    />
  );
}

function InsightSentence({ derived }: { derived: Derived }) {
  const { totals, verdict, sixth, runwayMonths, coverage } = derived;
  const missing = coverage.total - coverage.withAmount;

  if (totals.inCents === 0 && totals.outCents === 0) {
    return <Insight>{es.resumen.insightNoData}</Insight>;
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
      <Insight>
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
      </Insight>
    );
  }

  if (verdict === 'justo') {
    return (
      <Insight>
        {es.resumen.insightJustoPrefix} <b>{formatEUR(totals.balanceCents)}</b>{' '}
        {es.resumen.insightJustoSuffix}{' '}
        {sixth.kind === 'margin' && sixth.monthsPerHundred !== null && (
          <>
            {es.resumen.marginShockPrefix} <b>{formatMonths(sixth.monthsPerHundred)}</b>{' '}
            {es.resumen.marginShockSuffix}.
          </>
        )}
        {tail}
      </Insight>
    );
  }

  const target = sixth.kind === 'buffer' ? sixth.targetCents : 0;
  return (
    <Insight>
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
    </Insight>
  );
}

export function Resumen({ store }: { store: Store }) {
  const { derived, scenario, state } = store;
  const { totals, upfront, breakdown, coverage } = derived;
  const missing = coverage.total - coverage.withAmount;

  const verdictText =
    derived.verdict === 'falta'
      ? es.verdict.faltaPrefix + formatEUR(derived.shortfallCents) + es.verdict.faltaSuffix
      : derived.verdict === 'justo'
        ? es.verdict.justo
        : es.verdict.ok;

  const verdictSub =
    derived.verdict === 'falta'
      ? es.verdict.faltaSub
      : derived.verdict === 'justo'
        ? es.verdict.justoSub
        : es.verdict.okSub;

  const largest = breakdown.length > 0 ? breakdown[0].monthlyCents : 0;

  return (
    <div className="stack">
      <Panel
        label={es.resumen.verdictPanel}
        tone={VERDICT_DOT[derived.verdict]}
        actions={
          <span>
            {es.resumen.createdOn} {formatDate(scenario.createdAt)} · {es.resumen.driftLabel}{' '}
            {derived.driftCents === null
              ? es.resumen.driftNone
              : formatSignedEUR(derived.driftCents) + es.common.perMonth}
          </span>
        }
      >
        <div className="pb row-actions">
          <Tag tone={VERDICT_TONE[derived.verdict]} big>
            {verdictText}
          </Tag>
          <span className="cell-note">{verdictSub}</span>
        </div>

        <div className="kgrid k6">
          <KpiCard
            label={es.resumen.kpiIn}
            cents={totals.inCents}
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
            sub={
              <>
                {es.resumen.outSubPrefix} {coverage.withAmount} {es.resumen.outSubMiddle}{' '}
                {coverage.total}
                <br />
                {es.resumen.outSubSuffix}
              </>
            }
          />
          <KpiCard
            label={es.resumen.kpiBalance}
            cents={totals.balanceCents}
            tone={derived.verdict === 'falta' ? 'neg' : derived.verdict === 'justo' ? 'warn' : 'pos'}
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
          <KpiCard
            label={es.resumen.kpiUpfront}
            cents={upfront.cashCents}
            sub={es.resumen.upfrontSub}
          />
          <KpiCard
            label={es.resumen.kpiSpend}
            cents={upfront.spendCents}
            sub={es.resumen.spendSub}
          />
          <SixthCard sixth={derived.sixth} />
        </div>

        <div className="guide">
          {totals.inCents === 0 ? (
            <span className="why">{es.resumen.guideNoIncome}</span>
          ) : (
            <>
              <b>
                {es.resumen.guidePrefix} {formatEUR(derived.maxAffordableRentCents)}
                {es.common.perMonth}
              </b>
              <span className="why">
                {es.resumen.guideWhyPrefix} {state.settings.maxRentPercent} %{' '}
                {es.resumen.guideWhyMiddle} {formatEUR(totals.inCents)}
                {es.resumen.guideWhySuffix}
              </span>
            </>
          )}
        </div>
      </Panel>

      <div className="res-split">
        <Panel
          label={es.resumen.barsPanel}
          actions={
            <span>
              {formatEUR(totals.outCents)}
              {es.common.perMonth}
            </span>
          }
          body={
            breakdown.length === 0 ? (
              <div className="empty-note">{es.resumen.insightNoData}</div>
            ) : (
              breakdown.map((slice, i) => (
                <BreakdownBar
                  key={slice.category}
                  label={es.category[slice.category]}
                  percent={slice.percent}
                  fraction={largest === 0 ? 0 : (slice.monthlyCents / largest) * 0.92}
                  amountCents={slice.monthlyCents}
                  opacity={Math.max(0.34, 1 - i * 0.11)}
                  missingCount={slice.missingCount}
                  pausedLabel={slice.allPaused ? es.resumen.barsPaused : undefined}
                />
              ))
            )
          }
        />

        <Panel
          label={es.resumen.upfrontPanel}
          actions={<span>{es.resumen.upfrontPanelTag}</span>}
          body={
            <>
              <div className="ledger">
                {upfront.lines.length === 0 && (
                  <div className="empty-note">{es.resumen.ledgerEmpty}</div>
                )}
                {upfront.lines.map((line) => (
                  <div
                    className={line.shouldNotPay ? 'lrow flagged' : 'lrow'}
                    key={line.id}
                  >
                    <span className="ll">
                      {line.label}
                      {line.refundable && <Tag tone="green">{es.resumen.refundable}</Tag>}
                      {line.shouldNotPay && <Tag tone="red">{es.resumen.shouldNotPay}</Tag>}
                    </span>
                    <span className="lv">{formatEUR(line.amountCents)}</span>
                  </div>
                ))}
                <div className="lrow sum">
                  <span className="ll">{es.resumen.ledgerUpfront}</span>
                  <span className="lv">{formatEUR(upfront.cashCents)}</span>
                </div>
                <div className="lrow sum tight">
                  <span className="ll">{es.resumen.ledgerSpend}</span>
                  <span className="lv">{formatEUR(upfront.spendCents)}</span>
                </div>
              </div>
              <div className="micro" style={{ marginTop: 9 }}>
                {es.resumen.ledgerNote}
                {upfront.missingCount > 0 && (
                  <>
                    <br />
                    {upfront.missingCount}{' '}
                    {plural(upfront.missingCount, es.resumen.ledgerMissingOne, es.resumen.ledgerMissing)}
                  </>
                )}
              </div>
            </>
          }
        />
      </div>

      <Panel
        label={es.resumen.insightPanel}
        tone={missing > 0 ? 'amber' : 'accent'}
        body={<InsightSentence derived={derived} />}
      />
    </div>
  );
}
