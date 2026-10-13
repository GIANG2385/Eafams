import type { IsoDate } from './types';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

export function isValidIso(s: unknown): s is IsoDate {
  if (typeof s !== 'string') return false;
  const match = ISO.exec(s);
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function parseIso(s: IsoDate): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/**
 * Completed years at `asOf`. Assumption A-4: a 29 Feb birthday counts on 1 Mar
 * in non-leap years. This is the only place that rule lives.
 */
export function completedYears(dob: IsoDate, asOf: IsoDate): number {
  const b = parseIso(dob);
  const a = parseIso(asOf);
  let bm = b.m;
  let bd = b.d;
  if (bm === 2 && bd === 29 && !isLeapYear(a.y)) {
    bm = 3;
    bd = 1;
  }
  let years = a.y - b.y;
  if (a.m < bm || (a.m === bm && a.d < bd)) years -= 1;
  return years;
}
