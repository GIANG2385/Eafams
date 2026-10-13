import { formatSgd, percentOf } from './money';

test('formatSgd', () => {
  expect(formatSgd(0)).toBe('S$0.00');
  expect(formatSgd(11990)).toBe('S$119.90');
  expect(formatSgd(123456789)).toBe('S$1,234,567.89');
  expect(formatSgd(-500)).toBe('-S$5.00');
});

test('percentOf rounds half-up per call', () => {
  expect(percentOf(11000, 900)).toBe(990);
  expect(percentOf(3200, 900)).toBe(288);
  expect(percentOf(50, 900)).toBe(5); // 4.5 -> 5
  expect(percentOf(0, 900)).toBe(0);
});
