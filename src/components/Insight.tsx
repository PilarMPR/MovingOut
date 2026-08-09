import type { ReactNode } from 'react';

/**
 * The `--sunk` box with a 3 px accent left border. One plain-language sentence
 * that states the answer, at the bottom of Resumen.
 */
export function Insight({ children }: { children: ReactNode }) {
  return <div className="insight">{children}</div>;
}
