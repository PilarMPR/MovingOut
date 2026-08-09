import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'plain' | 'accent' | 'outline' | 'onInk';

const VARIANT: Record<ButtonVariant, string> = {
  plain: 'btn',
  accent: 'btn k',
  outline: 'btn ol',
  onInk: 'btn on-ink',
};

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  small?: boolean;
  danger?: boolean;
  children: ReactNode;
}

/** Mono 9 px uppercase. The accent variants carry interaction, never meaning. */
export function Button({ variant = 'plain', small = false, danger = false, children, ...rest }: Props) {
  const className = [VARIANT[variant], small ? 'sm' : '', danger ? 'danger' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={className} {...rest}>
      {children}
    </button>
  );
}
