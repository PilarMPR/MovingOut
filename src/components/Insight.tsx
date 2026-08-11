import type { ReactNode } from 'react';

/** The banner takes the sign of the answer it is stating. */
export type InsightTone = 'green' | 'amber' | 'red' | 'neutral';

const TONE: Record<InsightTone, string> = {
  green: 'insight g',
  amber: 'insight a',
  red: 'insight r',
  neutral: 'insight',
};

interface Props {
  /** Mono micro-label down the left — "LA RESPUESTA". */
  label?: string;
  tone?: InsightTone;
  children: ReactNode;
}

/**
 * One plain-language sentence that states the answer, tinted by the sign of
 * that answer, at the bottom of Resumen.
 *
 * `neutral` is not a mild yes. It is the absence of an answer, which is what
 * renders before there are enough amounts to give one.
 */
export function Insight({ label, tone = 'neutral', children }: Props) {
  return (
    <div className={TONE[tone]}>
      {label !== undefined && <span className="il">{label}</span>}
      <p>{children}</p>
    </div>
  );
}
