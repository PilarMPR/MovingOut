import { useState } from 'react';
import { AddRow } from '../components/AddRow';
import { Button } from '../components/Button';
import { EditableAmount, EditableText } from '../components/EditableCell';
import { Chip } from '../components/FilterBar';
import { Insight } from '../components/Insight';
import { Select } from '../components/Select';
import { es, plural } from '../i18n/es';
import { formatDate } from '../lib/history';
import { formatEUR } from '../lib/money';
import { byProduct, hasAmount, monthOf, sumAmounts } from '../lib/purchases';
import { idsOf, labelOf, labelsOf } from '../lib/taxonomy';
import type { Store } from '../state/store';
import type { Purchase } from '../types';

/**
 * The mobile fork of the shopping log — a different component from the same
 * `Purchase[]`, not a responsive table (DESIGN-SYSTEM.md §6).
 *
 * This is the screen the fork rule was written for. Compras is the one part of
 * the app used *standing in a shop*, several times a week, on a phone, and on
 * the desktop grid its most important column — the amount — is second from the
 * right, behind a horizontal scroll. Here it is the right-hand half of line one.
 *
 * Two things differ from CostesMobile, and both come from this being a log
 * rather than a table:
 *
 *   · **Cards are grouped by day**, with the day's own total in the header.
 *     One shop is four or five lines entered together, and "what did today
 *     cost" is a question you ask at the till rather than at the end of a
 *     month. It reuses the `.room` group header Muebles already has.
 *   · **The sticky footer carries the monthly equivalent**, not the total. The
 *     total is not comparable to anything else in the app; the equivalent is
 *     the figure that enters salidas, and watching it move is the whole reason
 *     to type an amount on a phone.
 */

interface DayGroup {
  date: string;
  purchases: Purchase[];
  totalCents: number;
}

/** Newest day first, and newest-entered first inside a day. */
function byDay(purchases: readonly Purchase[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const purchase of purchases) {
    const found = groups.get(purchase.date);
    if (found === undefined) {
      groups.set(purchase.date, { date: purchase.date, purchases: [purchase], totalCents: 0 });
    } else {
      found.purchases.push(purchase);
    }
  }
  const days = [...groups.values()];
  for (const day of days) {
    day.totalCents = sumAmounts(day.purchases);
    day.purchases.reverse();
  }
  return days.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
}

interface CardProps {
  purchase: Purchase;
  store: Store;
  categoryIds: string[];
  categoryLabels: Record<string, string>;
  open: boolean;
  onToggle: () => void;
}

function Card({ purchase, store, categoryIds, categoryLabels, open, onToggle }: CardProps) {
  const priced = hasAmount(purchase);

  return (
    // No status stripe: a purchase has no state to report — it happened. The
    // dash colour marks the one thing that *is* worth reporting, a row whose
    // amount has not been typed yet, which is the same thing the desktop grid
    // says with a dashed `— —`.
    <div className={`mcard${priced ? '' : ' s-blank'}${open ? ' open' : ''}`}>
      <button
        type="button"
        className="m1 mtap"
        onClick={onToggle}
        aria-expanded={open}
      >
        <b>{purchase.product}</b>
        <span className={priced ? undefined : 'empty'}>
          {priced ? formatEUR(purchase.amountCents) : es.compras.empty}
        </span>
      </button>

      <div className="m2">
        <span>{categoryLabels[purchase.category] ?? purchase.category}</span>
        <span>{purchase.note ?? ''}</span>
      </div>

      {open && (
        <div className="mopen">
          <div className="mrow">
            <EditableText
              value={purchase.product}
              ariaLabel={es.compras.colProduct}
              onChange={(product) => store.patchPurchase(purchase.id, { product })}
            />
          </div>
          <div className="mrow">
            <EditableAmount
              cents={purchase.amountCents}
              hasAmount={priced}
              emptyLabel={es.compras.empty}
              ariaLabel={es.compras.colAmount}
              onCommit={(cents) => store.patchPurchase(purchase.id, { amountCents: cents ?? 0 })}
            />
          </div>
          <div className="mrow">
            <input
              className="ie date"
              type="date"
              value={purchase.date}
              aria-label={es.compras.colDate}
              onChange={(event) => store.patchPurchase(purchase.id, { date: event.target.value })}
            />
            <Select
              value={purchase.category}
              options={categoryIds}
              labels={categoryLabels}
              ariaLabel={es.compras.colCategory}
              onChange={(category) => store.patchPurchase(purchase.id, { category })}
            />
          </div>
          <div className="mrow">
            <EditableText
              value={purchase.note ?? ''}
              ariaLabel={es.compras.colNote}
              placeholder={es.compras.notePlaceholder}
              onChange={(note) => store.patchPurchase(purchase.id, { note })}
            />
          </div>
          <div className="mrow">
            <Button small danger onClick={() => store.removePurchase(purchase.id)}>
              {es.compras.delete}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ComprasMobile({ store }: { store: Store }) {
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'month'>('all');
  const { scenario, derived } = store;
  const { spend, overlaps } = derived;

  const categoryIds = idsOf(store.state.categories);
  const categoryLabels = labelsOf(store.state.categories);
  const currentMonth = monthOf(store.todayDate);

  const shown =
    view === 'month'
      ? scenario.purchases.filter((purchase) => monthOf(purchase.date) === currentMonth)
      : scenario.purchases;
  const days = byDay(shown);
  const products = byProduct(scenario.purchases, store.todayDate);

  return (
    <>
      <div className="mbar">
        <Chip on={view === 'all'} onClick={() => setView('all')}>
          {es.compras.filterAll}
        </Chip>
        <Chip on={view === 'month'} onClick={() => setView('month')}>
          {es.compras.filterMonth}
        </Chip>
        <span className="mcount">
          {formatEUR(spend.totalCents)} · {spend.days}{' '}
          {plural(spend.days, es.compras.mDay, es.compras.mDays)}
          {spend.provisional && ` · ${es.compras.mProvisional}`}
        </span>
      </div>

      {/* The one thing on this screen that says a figure elsewhere in the app is
          currently wrong, so it stays above the list here as it does on desktop. */}
      {overlaps.length > 0 && (
        <div className="pad">
          <Insight label={es.compras.overlapLabel} tone="amber">
            {overlaps.map((overlap) => (
              <span key={overlap.category}>
                {es.compras.overlapPrefix}{' '}
                <b>{labelOf(store.state.categories, overlap.category)}</b>{' '}
                {es.compras.overlapMiddle} <b>{overlap.entryIds.length}</b>{' '}
                {plural(
                  overlap.entryIds.length,
                  es.compras.overlapEstimateOne,
                  es.compras.overlapEstimateMany,
                )}{' '}
                {es.compras.overlapSuffix}{' '}
              </span>
            ))}
            <span className="row-actions" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn sm"
                onClick={() => store.pauseEntries(overlaps.flatMap((overlap) => overlap.entryIds))}
              >
                {es.compras.overlapButton}
              </button>
            </span>
          </Insight>
        </div>
      )}

      {days.length === 0 && (
        <div className="empty-note">
          {scenario.purchases.length === 0 ? es.compras.emptyLog : es.compras.emptyMonth}
        </div>
      )}

      {days.map((day) => (
        <div key={day.date}>
          <div className="room">
            <span>{formatDate(day.date)}</span>
            <span className="cnt">{formatEUR(day.totalCents)}</span>
          </div>
          {day.purchases.map((purchase) => (
            <Card
              key={purchase.id}
              purchase={purchase}
              store={store}
              categoryIds={categoryIds}
              categoryLabels={categoryLabels}
              open={open === purchase.id}
              onToggle={() => setOpen(open === purchase.id ? null : purchase.id)}
            />
          ))}
        </div>
      ))}

      {/* The figure the log exists to produce, where it can be watched moving. */}
      <div className="mfoot">
        <b>{es.compras.colMonthly}</b>
        <span className={spend.monthlyCents > 0 ? 'neg' : undefined}>
          {formatEUR(spend.monthlyCents)}
          {es.common.perMonth}
        </span>
      </div>

      <AddRow
        label={es.compras.add}
        onClick={() => store.addPurchase({ product: es.compras.newProduct })}
      />

      {products.length > 0 && (
        <div className="pad">
          <div className="mgrp">{es.compras.panelProducts}</div>
          <div className="ledger">
            {products.map((line) => (
              <div className="lrow" key={line.key}>
                <span className="ll">
                  {line.product}
                  <span className="micro">
                    ×{line.count} · {formatEUR(line.monthlyCents)}
                    {es.common.perMonth}
                  </span>
                </span>
                <span className="lv">{formatEUR(line.totalCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
