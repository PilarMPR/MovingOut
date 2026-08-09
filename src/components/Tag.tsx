import type { ReactNode } from 'react';

export type TagTone = 'green' | 'red' | 'amber' | 'stone' | 'neutral' | 'accent';

const TONE: Record<TagTone, string> = {
  green: 'tag g',
  red: 'tag r',
  amber: 'tag a',
  stone: 'tag s',
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
 * The accent tone is for interaction affordances only — a verdict is never
 * accent, and a number is never accent at all.
 */
export function Tag({ tone, big = false, children }: Props) {
  return <span className={TONE[tone] + (big ? ' big' : '')}>{children}</span>;
}
