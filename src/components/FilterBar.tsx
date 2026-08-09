import type { ReactNode } from 'react';

/** Sits inside the panel, between the ink header and the table body. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filters">{children}</div>;
}

export function FilterLabel({ children, gap = false }: { children: ReactNode; gap?: boolean }) {
  return <span className={gap ? 'fl gap' : 'fl'}>{children}</span>;
}

interface ChipProps {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** Chips, not a dropdown row — the filter state has to be readable at a glance. */
export function Chip({ on, onClick, children }: ChipProps) {
  return (
    <button type="button" className={on ? 'chip on' : 'chip'} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}
