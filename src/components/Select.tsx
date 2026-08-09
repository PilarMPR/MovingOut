import type { Status } from '../types';

interface Props<T extends string> {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Entradas read green in the tipo column — direction is meaning, not decoration. */
  incoming?: boolean;
}

/** The enum select used across the grid. Table mono, no chrome until hover. */
export function Select<T extends string>({
  value,
  options,
  labels,
  onChange,
  ariaLabel,
  incoming = false,
}: Props<T>) {
  return (
    <select
      className={incoming ? 'ie auto in' : 'ie auto'}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  );
}

interface StatusProps {
  value: Status;
  options: readonly Status[];
  labels: Record<Status, string>;
  onChange: (value: Status) => void;
  ariaLabel: string;
}

/**
 * A `<select>` whose colour is driven by its selected value, so the table is
 * readable at a glance: activo → green, pendiente → amber, pagado → stone
 * with a ✓, pausado → stone outline (and the row dims to 50 %).
 *
 * `pagado` and `pausado` get no hue at all. Neither is good or bad — one is
 * settled, one is deliberately excluded — which is why there is no info token.
 */
export function StatusSelect({ value, options, labels, onChange, ariaLabel }: StatusProps) {
  return (
    <select
      className={`ie auto st-${value}`}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value as Status)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  );
}
