import { describe, expect, it } from 'vitest';
import { uniqueName } from './naming';

describe('uniqueName', () => {
  it('leaves a free name alone', () => {
    expect(uniqueName(['Piso centro'], 'Escenario nuevo')).toBe('Escenario nuevo');
    expect(uniqueName([], 'Escenario nuevo')).toBe('Escenario nuevo');
  });

  it('numbers a collision, and keeps numbering', () => {
    // The bug this exists for: pressing "Nuevo escenario" three times gave
    // three identically named scenarios and a picker that looked inert.
    expect(uniqueName(['Escenario nuevo'], 'Escenario nuevo')).toBe('Escenario nuevo 2');
    expect(uniqueName(['Escenario nuevo', 'Escenario nuevo 2'], 'Escenario nuevo')).toBe(
      'Escenario nuevo 3',
    );
  });

  it('fills a gap rather than always counting to the end', () => {
    expect(uniqueName(['Piso', 'Piso 3'], 'Piso')).toBe('Piso 2');
  });

  it('compares on trimmed names, because that is what a reader sees', () => {
    expect(uniqueName(['  Piso  '], 'Piso')).toBe('Piso 2');
  });

  it('terminates on a list full of collisions', () => {
    const taken = ['Piso', 'Piso 2', 'Piso 3', 'Piso 4'];
    expect(uniqueName(taken, 'Piso')).toBe('Piso 5');
  });

  it('handles the duplicate-a-copy case', () => {
    expect(uniqueName(['Piso', 'Piso (copia)'], 'Piso (copia)')).toBe('Piso (copia) 2');
  });
});
