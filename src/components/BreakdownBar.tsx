import { formatEUR, formatPercent } from '../lib/money';
import type { Cents } from '../types';

interface Props {
  label: string;
  /** Share of the total, used for the label. `null` when there is no total. */
  percent: number | null;
  /** Width relative to the largest bar, 0–1. Kept separate from `percent` so a
   *  60 % row does not render at 60 % of the track and look like the whole. */
  fraction: number;
  amountCents: Cents;
  /** Fade with rank: one warm tone at descending opacity, never a hue. */
  opacity: number;
  /** Conceptos in this category with no amount yet. */
  missingCount?: number;
  /** Every concepto here is paused — no bar, and the word instead of a number. */
  pausedLabel?: string;
}

/**
 * label · track · fill · amount, in one tone at descending opacity.
 *
 * Categories never get a colour of their own: the moment `vivienda` is blue,
 * green stops meaning "good" (DESIGN-SYSTEM.md §1).
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
        <span className="bl off">{label}</span>
        <span className="bt" />
        <span className="ba off">{pausedLabel}</span>
      </div>
    );
  }

  const width = Math.max(0, Math.min(100, fraction * 100));
  const inBar = percent !== null && percent >= 12 ? formatPercent(percent) : '';

  return (
    <div className="bar">
      <span className="bl">{label}</span>
      <span className="bt">
        <span className="bf" style={{ width: `${width}%`, opacity }}>
          {inBar}
        </span>
      </span>
      <span className="ba">
        {formatEUR(amountCents)}
        {missingCount > 0 && <em> +{missingCount}</em>}
      </span>
    </div>
  );
}
