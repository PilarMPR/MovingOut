import { Tag } from './Tag';
import type { TagTone } from './Tag';
import type { DotTone } from './Panel';
import { es } from '../i18n/es';
import { formatEUR } from '../lib/money';
import type { VerdictKind } from '../lib/derive';

/**
 * The verdict has one wording and one colour, and both live here — the header,
 * Resumen and Comparar all print it, and three copies of the same sentence is
 * three chances to disagree about the answer.
 *
 * `sindatos` is neutral on purpose. It is not a mild yes and not a mild no —
 * it is the absence of an answer, and colouring it would make it one.
 */
export const VERDICT_TONE: Record<VerdictKind, TagTone> = {
  sindatos: 'neutral',
  ok: 'green',
  justo: 'amber',
  falta: 'red',
};

export const VERDICT_DOT: Record<VerdictKind, DotTone> = {
  sindatos: 'accent',
  ok: 'green',
  justo: 'amber',
  falta: 'red',
};

/** `compact` drops the `/mes` tail, for a cell that already has a column header. */
export function verdictText(verdict: VerdictKind, shortfallCents: number, compact = false): string {
  if (verdict === 'falta') {
    return es.verdict.faltaPrefix + formatEUR(shortfallCents) + (compact ? '' : es.verdict.faltaSuffix);
  }
  if (verdict === 'justo') return es.verdict.justo;
  return verdict === 'sindatos' ? es.verdict.sindatos : es.verdict.ok;
}

interface Props {
  verdict: VerdictKind;
  shortfallCents: number;
  big?: boolean;
  compact?: boolean;
}

export function VerdictTag({ verdict, shortfallCents, big = false, compact = false }: Props) {
  return (
    <Tag tone={VERDICT_TONE[verdict]} big={big}>
      {verdictText(verdict, shortfallCents, compact)}
    </Tag>
  );
}
