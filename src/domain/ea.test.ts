import { accountOf, assessEaEligibility, balanceOf, noAccountReason, runEaCreation } from './ea';
import { addAccount, dbWith, mkStudent } from './testing';

const TODAY = '2026-10-13';

describe('assessEaEligibility', () => {
  test.each([
    ['turns 7 today', { dob: '2019-10-13' }, true, undefined],
    ['one day before 7', { dob: '2019-10-14' }, false, 'UNDER_7'],
    ['15y364d', { dob: '2010-10-14' }, true, undefined],
    ['turns 16 today', { dob: '2010-10-13' }, false, 'AT_OR_OVER_16'],
    ['permanent resident', { dob: '2018-01-01', citizenship: 'PR' as const }, false, 'NOT_CITIZEN'],
    ['foreign student', { dob: '2018-01-01', citizenship: 'FOREIGN' as const }, false, 'NOT_CITIZEN'],
    ['dob in the future', { dob: '2031-01-01' }, false, 'UNDER_7'],
    ['dob missing', { dob: null }, false, 'MISSING_DATA'],
    ['dob malformed', { dob: '13/10/2019' }, false, 'MISSING_DATA'],
    ['dob impossible date', { dob: '2019-02-30' }, false, 'MISSING_DATA'],
    ['citizenship missing', { citizenship: null }, false, 'MISSING_DATA'],
    ['personId empty', { personId: '' }, false, 'MISSING_DATA'],
  ])('%s', (_name, patch, eligible, reason) => {
    const v = assessEaEligibility(mkStudent(patch), false, TODAY);
    expect(v.eligible).toBe(eligible);
    if (!v.eligible) expect(v.reason).toBe(reason);
  });

  test('existing account wins over age', () => {
    const v = assessEaEligibility(mkStudent({ dob: '2018-01-01' }), true, TODAY);
    expect(v).toEqual({ eligible: false, reason: 'ALREADY_HAS_ACCOUNT' });
  });
});

describe('runEaCreation', () => {
  const students = [
    mkStudent({ personId: 'a', name: 'Eligible', dob: '2019-03-10' }),
    mkStudent({ personId: 'b', name: 'Too young', dob: '2020-01-15' }),
    mkStudent({ personId: 'c', name: 'PR', dob: '2016-08-09', citizenship: 'PR' }),
    mkStudent({ personId: 'd', name: 'Broken', dob: null }),
  ];

  test('creates only for eligible students with zero balance, logs reasons', () => {
    const { db, run } = runEaCreation(dbWith({ students }), TODAY);
    expect(db.accounts).toHaveLength(1);
    expect(db.accounts[0]).toMatchObject({ personId: 'a', status: 'ACTIVE', openedOn: TODAY, closedOn: null });
    expect(balanceOf(db, db.accounts[0].id)).toBe(0);
    expect(run.kind).toBe('EA_CREATE');
    expect(run.results.find((r) => r.personId === 'b')).toMatchObject({ outcome: 'SKIPPED', reason: 'UNDER_7' });
    expect(run.results.find((r) => r.personId === 'c')).toMatchObject({ reason: 'NOT_CITIZEN' });
    expect(run.results.find((r) => r.personId === 'd')).toMatchObject({ reason: 'MISSING_DATA' });
    expect(db.runs).toHaveLength(1);
  });

  test('is idempotent: second run creates nothing new', () => {
    const first = runEaCreation(dbWith({ students }), TODAY);
    const second = runEaCreation(first.db, TODAY);
    expect(second.db.accounts).toHaveLength(1);
    expect(second.run.results.filter((r) => r.outcome === 'CREATED')).toHaveLength(0);
  });

  test('does not mutate its input', () => {
    const input = dbWith({ students });
    runEaCreation(input, TODAY);
    expect(input.accounts).toHaveLength(0);
    expect(input.runs).toHaveLength(0);
  });

  test('a late record that is already 9 gets an account immediately', () => {
    const { db } = runEaCreation(dbWith({ students: [mkStudent({ personId: 'late', dob: '2017-02-02' })] }), TODAY);
    expect(accountOf(db, 'late')?.status).toBe('ACTIVE');
  });
});

describe('balance and no-account reason', () => {
  test('balance is the signed ledger sum', () => {
    const { db, accountId } = addAccount(dbWith({}), 'a', 50000);
    expect(balanceOf(db, accountId)).toBe(50000);
  });

  test('noAccountReason explains why a student has none', () => {
    expect(noAccountReason(mkStudent({ citizenship: 'PR' }), TODAY)).toBe('NOT_CITIZEN');
    expect(noAccountReason(mkStudent({ dob: '2020-01-15' }), TODAY)).toBe('UNDER_7');
    expect(noAccountReason(mkStudent({ dob: '2019-03-10' }), TODAY)).toBe('NOT_YET_CREATED');
  });
});
