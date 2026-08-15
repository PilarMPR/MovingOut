import { useRef, useState } from 'react';
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

interface NameProps {
  value: string;
  /**
   * Commits on blur or Enter, never on keystroke. The store may hand back a
   * *different* name than the one typed — it dedupes, and it refuses a blank —
   * so the input drops its draft on commit and re-reads `value`. Typing over
   * the name of another scenario therefore snaps to "Piso 2" when you leave the
   * field, rather than sitting there as a lie until the next reload.
   */
  onCommit: (value: string) => void;
  ariaLabel: string;
  /** `fin` on paper, `in-dark` in the ink header. */
  className?: string;
  autoFocus?: boolean;
  /** Fired after commit or cancel, for callers that show the input on demand. */
  onDone?: () => void;
}

/**
 * A name you have to be able to tell apart in a list: the scenario name, today.
 * Distinct from `EditableText`, which writes on every keystroke because nothing
 * downstream of a concepto's label cares what half of it looks like.
 */
export function EditableName({
  value,
  onCommit,
  ariaLabel,
  className = 'fin',
  autoFocus,
  onDone,
}: NameProps) {
  const [draft, setDraft] = useState<string | null>(null);
  // Escape blurs, and blur commits — so the cancel has to survive the trip.
  // Clearing the draft in the key handler is not enough: `blur()` fires its
  // handler synchronously, before React has re-rendered the input.
  const cancelled = useRef(false);

  return (
    <input
      className={className}
      value={draft ?? value}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      onFocus={(event) => {
        setDraft(value);
        event.currentTarget.select();
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => {
        setDraft(null);
        if (cancelled.current) cancelled.current = false;
        else onCommit(event.target.value);
        onDone?.();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          cancelled.current = true;
          event.currentTarget.blur();
        }
      }}
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
  // See EditableName: Escape has to hand the cancel to the blur handler, since
  // clearing the draft here does not reach the DOM before blur reads it.
  const cancelled = useRef(false);

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
      onBlur={(event) => {
        if (cancelled.current) {
          cancelled.current = false;
          setDraft(null);
          return;
        }
        commit(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          cancelled.current = true;
          event.currentTarget.blur();
        }
      }}
    />
  );
}
