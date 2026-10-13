import type { Cents } from './types';

export function formatSgd(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = (abs % 100).toString().padStart(2, '0');
  return `${sign}S$${whole}.${frac}`;
}

/** Integer half-up percentage; rateBp is basis points (900 = 9%). */
export function percentOf(cents: Cents, rateBp: number): Cents {
  return Math.floor((cents * rateBp + 5000) / 10000);
}
