import type { ReactNode } from 'react';
import { splitEUR } from '../lib/money';
import type { Cents } from '../types';

/** Sign, not category. A KPI is green, red or amber because of what it means. */
export type ValueTone = 'plain' | 'pos' | 'neg' | 'warn';

const TONE: Record<ValueTone, string> = {
  plain: 'val',
  pos: 'val pos',
  neg: 'val neg',
  warn: 'val warn',
};

interface Props {
  label: string;
  /** A money value, split into display-size big part and small decimals. */
  cents?: Cents;
  /** Anything that is not money: `Cubierto`, a count, a month figure. */
  value?: ReactNode;
  /** Small trailing unit for a non-money value, e.g. `,00 €/mes`. */
  unit?: ReactNode;
  tone?: ValueTone;
  sub?: ReactNode;
  hero?: boolean;
  /** Render `+` on a positive money value. */
  signed?: boolean;
}

/** label → value → sub-line. 1 px gutters read as hairlines (DESIGN-SYSTEM §4). */
export function KpiCard({ label, cents, value, unit, tone = 'plain', sub, hero = false, signed = false }: Props) {
  const money = cents === undefined ? null : splitEUR(cents, signed);
  return (
    <div className={hero ? 'kpi hero' : 'kpi'}>
      <div className="lbl">{label}</div>
      <div className={TONE[tone]}>
        {money !== null ? (
          <>
            {money.big}
            <small>{money.small}</small>
          </>
        ) : (
          <>
            {value}
            {unit !== undefined && <small>{unit}</small>}
          </>
        )}
      </div>
      {sub !== undefined && <div className="sub">{sub}</div>}
    </div>
  );
}
