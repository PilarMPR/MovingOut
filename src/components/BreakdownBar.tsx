import { formatEUR, formatPercent } from '../lib/money';
import type { Cents } from '../types';

interface Props {
  label: string;
  /** Share of the total, printed at the end of the leader. `null` with no total. */
  percent: number | null;
  /** Width relative to the largest bar, 0–1. Kept separate from `percent` so a
   *  60 % row does not render at 60 % of the track and look like the whole. */
  fraction: number;
  amountCents: Cents;
  /** Fade with rank: one accent tone at descending opacity, never a hue. */
  opacity: number;
  /** Conceptos in this category with no amount yet. */
  missingCount?: number;
  /** Every concepto here is paused — no bar, and the word instead of a number. */
  pausedLabel?: string;
}

/**
 * Label · dotted leader · amount · share, and the bar underneath.
 *
 * Categories never get a colour of their own: the moment `vivienda` is blue,
 * green stops meaning "good" (DESIGN-SYSTEM.md §1). Rank is carried by
 * opacity on the one accent tone, which is decoration and orders the list —
 * it is never read as a value.
 */
export function BreakdownBar({
  label,
  percent,
  fraction,
  amountCents,
  opacity,
  missingCount = 0,
  pausedLabel,
}: Props) {
  if (pausedLabel !== undefined) {
    return (
      <div className="bar">
        <div className="bh">
          <span className="bl off">{label}</span>
          <span className="lead" />
          <span className="ba off">{pausedLabel}</span>
          <span className="bp" />
        </div>
        <span className="bt" />
      </div>
    );
  }

  const width = Math.max(0, Math.min(100, fraction * 100));

  return (
    <div className="bar">
      <div className="bh">
        <span className="bl">{label}</span>
        <span className="lead" />
        <span className="ba">
          {formatEUR(amountCents)}
          {missingCount > 0 && <em> +{missingCount}</em>}
        </span>
        <span className="bp">{percent === null ? '' : formatPercent(percent)}</span>
      </div>
      <span className="bt">
        <span className="bf" style={{ width: `${width}%`, opacity }} />
      </span>
    </div>
  );
}
