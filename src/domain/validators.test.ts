import { maskNric, validateProfile } from './validators';

const ok = {
  residentialAddress: '12 Orchard Lane #05-01',
  residentialPostalCode: '238888',
  mailingAddress: '12 Orchard Lane #05-01',
  mailingPostalCode: '238888',
  mobile: '81234567',
  email: 'parent@example.com',
};

test('accepts a valid profile', () => expect(validateProfile(ok)).toEqual({}));

test.each([
  ['mobile starts with 7', { mobile: '71234567' }, 'mobile'],
  ['mobile 7 digits', { mobile: '8123456' }, 'mobile'],
  ['mobile letters', { mobile: '8123abcd' }, 'mobile'],
  ['postal 5 digits', { residentialPostalCode: '12345' }, 'residentialPostalCode'],
  ['mailing postal letters', { mailingPostalCode: 'ABCDEF' }, 'mailingPostalCode'],
  ['email without domain', { email: 'parent@' }, 'email'],
  ['blank address', { residentialAddress: '   ' }, 'residentialAddress'],
])('rejects %s', (_n, patch, field) => {
  const errors = validateProfile({ ...ok, ...patch });
  expect(Object.keys(errors)).toEqual([field]);
});

test('mobile starting with 9 is fine', () => expect(validateProfile({ ...ok, mobile: '91234567' })).toEqual({}));

test('maskNric keeps first letter and last four characters', () => {
  expect(maskNric('S1234567A')).toBe('S****567A');
});
