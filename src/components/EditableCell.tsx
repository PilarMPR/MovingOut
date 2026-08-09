import { useState } from 'react';
import { formatEUR, parseAmount, toEditableString } from '../lib/money';
import type { Cents } from '../types';

/**
 * The inline-editable table cell. Transparent input in table mono; rest,
 * hover, focus and empty states all live in CSS.
 *
 * There is no save button, and there is no modal. The whole Costes tab is one
 * editable grid.
 */

interface TextProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  align?: 'left' | 'right';
}

/** Labels and notes write straight to state on every keystroke. */
export function EditableText({ value, onChange, ariaLabel, placeholder, align = 'left' }: TextProps) {
  return (
    <input
      className={align === 'right' ? 'ie r' : 'ie'}
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

interface AmountProps {
  cents: Cents;
  hasAmount: boolean;
  /** `null` means the user cleared the cell — a blank, which is not a zero. */
  onCommit: (cents: Cents | null) => void;
  ariaLabel: string;
  /** Rendered when there is no amount. A dash is an admission; a zero is a claim. */
  emptyLabel: string;
}

/**
 * Amounts commit on blur or Enter, not on keystroke — every commit is one
 * revision in the price history, and a revision per keypress would turn the
 * changelog into noise (IND002).
 *
 * Focus strips the currency format and leaves the raw number.
 */
export function EditableAmount({ cents, hasAmount, onCommit, ariaLabel, emptyLabel }: AmountProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    setDraft(null);
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === emptyLabel) {
      onCommit(null);
      return;
    }
    const parsed = parseAmount(trimmed);
    // Unparseable input leaves the stored estimate alone rather than zeroing it.
    if (parsed !== null) onCommit(Math.abs(parsed));
  };

  const resting = hasAmount ? formatEUR(cents) : emptyLabel;
  const empty = !hasAmount && draft === null;

  return (
    <input
      className={empty ? 'ie r empty' : 'ie r'}
      value={draft ?? resting}
      aria-label={ariaLabel}
      inputMode="decimal"
      onFocus={() => setDraft(hasAmount ? toEditableString(cents) : '')}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
    />
  );
}
