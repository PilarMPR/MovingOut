import type { ReactNode } from 'react';

export type DotTone = 'accent' | 'green' | 'red' | 'amber' | 'blue';

const DOT_CLASS: Record<DotTone, string> = {
  accent: 'dot',
  green: 'dot g',
  red: 'dot r',
  amber: 'dot a',
  blue: 'dot b',
};

interface Props {
  /** Mono, 9 px, 0.2em tracking, uppercase. The panel's micro-label. */
  label: ReactNode;
  /** Panel state: accent when idle, semantic when it has something to say. */
  tone?: DotTone;
  /** Right side of the ink bar. There is no second toolbar. */
  actions?: ReactNode;
  /** Rendered flush, edge to edge — tables and KPI grids go here. */
  children?: ReactNode;
  /** Rendered inside the padded body. */
  body?: ReactNode;
}

/** Rounded card, light body, ink header bar (DESIGN-SYSTEM.md §4). */
export function Panel({ label, tone = 'accent', actions, children, body }: Props) {
  return (
    <section className="panel">
      <header className="ph">
        <div className="ph-l">
          <span className={DOT_CLASS[tone]} />
          {label}
        </div>
        {actions !== undefined && <div className="ph-r">{actions}</div>}
      </header>
      {children}
      {body !== undefined && <div className="pb">{body}</div>}
    </section>
  );
}
