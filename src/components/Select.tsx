import type { Direction, Status } from '../types';

/** `strong` marks a value that carries weight (esencial); `oneoff` marks `único`. */
export type SelectVariant = 'plain' | 'strong' | 'oneoff';

const VARIANT: Record<SelectVariant, string> = {
  plain: 'ie auto',
  strong: 'ie auto strong',
  oneoff: 'ie auto oneoff',
};

interface Props<T extends string> {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
  ariaLabel: string;
  variant?: SelectVariant;
}

/** The enum select used across the grid. Table mono, no chrome until hover. */
export function Select<T extends string>({
  value,
  options,
  labels,
  onChange,
  ariaLabel,
  variant = 'plain',
}: Props<T>) {
  return (
    <select
      className={VARIANT[variant]}
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
 * readable at a glance: activo → green, pendiente → amber, pagado → blue,
 * pausado → no hue at all (and the row dims to 50 %).
 *
 * `pagado` is blue because it is informational — settled is a fact, not a
 * result. `pausado` gets the neutral pill: it is a deliberate absence, and
 * colouring it would make it a judgement.
 */
export function StatusSelect({ value, options, labels, onChange, ariaLabel }: StatusProps) {
  return (
    <select
      className={`pillsel st-${value}`}
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

interface DirectionProps {
  value: Direction;
  options: readonly Direction[];
  labels: Record<Direction, string>;
  onChange: (value: Direction) => void;
  ariaLabel: string;
}

/**
 * Direction gets the same pill treatment, green in and red out. This is the one
 * place a colour states which way the money moves, and it is why the amount
 * itself can stay black: the sign lives on the row, not on the number.
 */
export function DirectionSelect({ value, options, labels, onChange, ariaLabel }: DirectionProps) {
  return (
    <select
      className={`pillsel dir-${value}`}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value as Direction)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  );
}
