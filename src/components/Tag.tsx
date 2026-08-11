import type { ReactNode } from 'react';

export type TagTone = 'green' | 'red' | 'amber' | 'blue' | 'neutral' | 'accent';

const TONE: Record<TagTone, string> = {
  green: 'tag g',
  red: 'tag r',
  amber: 'tag a',
  blue: 'tag b',
  neutral: 'tag x',
  accent: 'tag k',
};

interface Props {
  tone: TagTone;
  big?: boolean;
  children: ReactNode;
}

/**
 * Mono 8 px, uppercase, pill radius. Verdicts and states.
 *
 * `blue` is the informational tone: `pagado`, `devolvible`, `pago único` —
 * facts that are neither good nor bad. `neutral` is for `pausado`, which is
 * an absence rather than a fact, and gets no hue at all.
 *
 * The accent tone is for interaction affordances only — a verdict is never
 * accent, and a number is never accent at all.
 */
export function Tag({ tone, big = false, children }: Props) {
  return <span className={TONE[tone] + (big ? ' big' : '')}>{children}</span>;
}
