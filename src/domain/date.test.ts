import { completedYears, isValidIso, parseIso } from './date';

describe('isValidIso', () => {
  test.each([
    ['2026-10-13', true],
    ['2024-02-29', true],
    ['2025-02-29', false],
    ['2026-13-01', false],
    ['2026-1-1', false],
    ['', false],
  ])('%s -> %s', (s, ok) => expect(isValidIso(s)).toBe(ok));
  test('non-string is invalid', () => expect(isValidIso(undefined)).toBe(false));
});

describe('completedYears', () => {
  test.each([
    ['2019-10-13', '2026-10-12', 6],
    ['2019-10-13', '2026-10-13', 7],
    ['2010-10-13', '2026-10-12', 15],
    ['2010-10-13', '2026-10-13', 16],
    ['2012-02-29', '2019-02-28', 6],
    ['2012-02-29', '2019-03-01', 7],
    ['2012-02-29', '2020-02-29', 8],
    ['2030-01-01', '2026-10-13', -4],
  ])('dob %s as of %s -> %i', (dob, asOf, years) => {
    expect(completedYears(dob, asOf)).toBe(years);
  });
});

test('parseIso splits parts', () => {
  expect(parseIso('2026-10-13')).toEqual({ y: 2026, m: 10, d: 13 });
});
