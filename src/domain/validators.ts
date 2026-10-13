export interface ProfileInput {
  residentialAddress: string;
  residentialPostalCode: string;
  mailingAddress: string;
  mailingPostalCode: string;
  mobile: string;
  email: string;
}
export type ProfileErrors = Partial<Record<keyof ProfileInput | 'form', string>>;

const MOBILE = /^[89]\d{7}$/;
const POSTAL = /^\d{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** R-PROF-1 formats: mobile 8 digits starting 8/9, postal code 6 digits. */
export function validateProfile(input: ProfileInput): ProfileErrors {
  const e: ProfileErrors = {};
  if (!input.residentialAddress.trim()) e.residentialAddress = 'Enter a residential address';
  if (!POSTAL.test(input.residentialPostalCode.trim())) e.residentialPostalCode = 'Postal code must be 6 digits';
  if (!input.mailingAddress.trim()) e.mailingAddress = 'Enter a mailing address';
  if (!POSTAL.test(input.mailingPostalCode.trim())) e.mailingPostalCode = 'Postal code must be 6 digits';
  if (!MOBILE.test(input.mobile.trim())) e.mobile = 'Mobile must be 8 digits starting with 8 or 9';
  if (!EMAIL.test(input.email.trim())) e.email = 'Enter a valid email address';
  return e;
}

export function maskNric(nric: string): string {
  if (nric.length < 5) return '*'.repeat(nric.length);
  return `${nric[0]}****${nric.slice(-4)}`;
}
