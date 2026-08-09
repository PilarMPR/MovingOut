interface Props {
  label: string;
  onClick: () => void;
}

/**
 * Dashed, full width, at the foot of the table. Deliberately not a floating
 * action button: adding a concepto is part of reading the table, not an
 * action that hovers over it.
 */
export function AddRow({ label, onClick }: Props) {
  return (
    <div className="pad">
      <button type="button" className="btn add" onClick={onClick}>
        {label}
      </button>
    </div>
  );
}
