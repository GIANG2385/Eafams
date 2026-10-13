import { createBatchDraft, publishBatch } from '../domain/batch';
import { DB_VERSION, defaultSettings, emptyDb } from '../domain/emptyDb';
import { nextId } from '../domain/ids';
import { startOnlinePayment } from '../domain/payment';
import type { Persona } from '../domain/profile';
import type { SourceRecord } from '../domain/importer';
import type { Db, FeeComponent, Student } from '../domain/types';

const TODAY = '2026-10-13';

const addr = (n: number) => ({
  residentialAddress: `${n} Orchard Lane #05-0${n % 9}`,
  residentialPostalCode: '238888',
  mailingAddress: `${n} Orchard Lane #05-0${n % 9}`,
  mailingPostalCode: '238888',
});

export const PERSONAS: Persona[] = [
  { id: 'g-tan', displayName: 'Tan Mei Ling', nric: 'S1234567A', profile: { ...addr(12), mobile: '81234567', email: 'mei.ling@example.com' } },
  { id: 'g-ong', displayName: 'Ong Kok Wai', nric: 'S2345678B', profile: { ...addr(24), mobile: '91234568', email: 'kok.wai@example.com' } },
  { id: 'g-koh', displayName: 'Koh Siew Hui', nric: 'S3456789C', profile: { ...addr(36), mobile: '81234569', email: 'siew.hui@example.com' } },
  { id: 'g-nair', displayName: 'Rajesh Nair', nric: 'S4567890D', profile: { ...addr(48), mobile: '91234570', email: 'rajesh@example.com' } },
  { id: 'g-lim', displayName: 'Lim Pei Shan', nric: 'S5678901E', profile: { ...addr(60), mobile: '81234571', email: 'pei.shan@example.com' } },
  { id: 'g-none', displayName: 'Test Parent (no linked child)', nric: 'S6789012F', profile: { ...addr(72), mobile: '91234572', email: 'no.child@example.com' } },
];

export const SOURCE_FIXTURE: SourceRecord[] = [
  { personId: 'src-101', name: 'Rylan Goh', dob: '2018-04-02', citizenship: 'SC', address: '3 Bishan Road' },
  { personId: 'src-102', name: 'Alicia Teo', dob: '2017-12-20', citizenship: 'SC', address: '8 Clementi Ave' },
  { personId: 'src-103', name: 'Kai Wen Lee', dob: '2014-07-07', citizenship: 'PR', address: '21 Jurong East St' },
  { personId: 'src-104', name: 'Sara Mohd', dob: '2019-05-30', citizenship: 'FOREIGN', address: '5 Tampines Close' },
  { personId: 'src-105', name: 'Missing Dob', citizenship: 'SC' },
  { personId: 'src-106', name: 'Bad Citizenship', dob: '2016-01-01', citizenship: 'ALIEN' },
  { personId: 'st-01', name: 'Aiden Tan', dob: '2019-03-10', citizenship: 'SC', address: '9 Bukit Timah Road (updated)' },
  { personId: 'src-108', name: 'Nur Elena', dob: '2019-10-10', citizenship: 'SC', address: '14 Woodlands Drive' },
];

const comp = (id: string, code: string, name: string, amountCents: number): FeeComponent => ({
  id, code, name, calcType: 'FIXED', amountCents, rateBp: 0, effectiveFrom: '2026-01-01', effectiveTo: null, status: 'ACTIVE',
});

function student(personId: string, name: string, dob: string, citizenship: Student['citizenship'], classId: string): Student {
  return { personId, name, dob, citizenship, address: '1 Seed Street', classId, enrolmentStatus: 'ENROLLED' };
}

function credit(db: Db, personId: string, cents: number, postedAt: string): Db {
  const acc = db.accounts.find((a) => a.personId === personId)!;
  const l = nextId(db, 'led');
  return {
    ...l.db,
    ledger: [...l.db.ledger, { id: l.id, accountId: acc.id, type: 'TOPUP_SEED', amountCents: cents, postedAt, ref: 'Seed credit', idempotencyKey: null }],
  };
}

function openAccount(db: Db, personId: string): Db {
  const a = nextId(db, 'ea');
  return { ...a.db, accounts: [...a.db.accounts, { id: a.id, personId, status: 'ACTIVE', openedOn: '2026-01-02', closedOn: null }] };
}

function charge(db: Db, schoolId: string, feeTypeId: string, personId: string): Db {
  const d = createBatchDraft(db, { schoolId, feeTypeId, target: { kind: 'STUDENTS', ids: [personId] }, dueOn: '2026-11-30' });
  return publishBatch(d.db, d.batch.id, TODAY).db;
}

export function createSeed(): Db {
  let db: Db = emptyDb();
  const mode = (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE;
  db.settings = { ...defaultSettings(), today: TODAY, latency: mode === 'test' ? 'off' : 'normal' };
  db.version = DB_VERSION;

  db.schools = [
    { id: 'sch-01', code: 'SCH-01', name: 'Sunrise Primary', status: 'ACTIVE' },
    { id: 'sch-02', code: 'SCH-02', name: 'Harbour Secondary', status: 'ACTIVE' },
    { id: 'sch-03', code: 'SCH-03', name: 'Lakeside Primary', status: 'ACTIVE' },
  ];
  db.schoolUsers = [
    { id: 'school-sch-01', name: 'Nadia Karim', schoolId: 'sch-01' },
    { id: 'school-sch-02', name: 'Ethan Ng', schoolId: 'sch-02' },
  ];
  const lv = (id: string, schoolId: string, name: string) => ({ id, schoolId, name, status: 'ACTIVE' as const });
  db.levels = [
    lv('lv-01', 'sch-01', 'Primary 1'), lv('lv-02', 'sch-01', 'Primary 2'), lv('lv-03', 'sch-01', 'Primary 5'),
    lv('lv-04', 'sch-02', 'Secondary 3'), lv('lv-05', 'sch-02', 'Secondary 4'),
    lv('lv-06', 'sch-03', 'Primary 2'), lv('lv-07', 'sch-03', 'Primary 3'), lv('lv-08', 'sch-03', 'Primary 4'),
  ];
  const cl = (id: string, levelId: string, name: string) => ({ id, levelId, name, academicYear: '2026', status: 'ACTIVE' as const });
  db.classes = [
    cl('cl-01', 'lv-01', '1A'), cl('cl-02', 'lv-02', '2A'), cl('cl-03', 'lv-03', '5A'),
    cl('cl-04', 'lv-04', '3A'), cl('cl-05', 'lv-05', '4A'),
    cl('cl-06', 'lv-06', '2A'), cl('cl-07', 'lv-07', '3A'), cl('cl-08', 'lv-08', '4A'),
  ];
  db.students = [
    student('st-01', 'Aiden Tan', '2019-03-10', 'SC', 'cl-02'),
    student('st-02', 'Chloe Tan', '2020-01-15', 'SC', 'cl-01'),
    student('st-03', 'Marcus Lim', '2011-05-02', 'SC', 'cl-04'),
    student('st-04', 'Priya Nair', '2016-08-09', 'PR', 'cl-03'),
    student('st-05', 'Wei Jie Ong', '2017-02-02', 'SC', 'cl-08'),
    student('st-06', 'Mei Xin Ong', '2010-09-30', 'SC', 'cl-05'),
    student('st-07', 'Daniel Koh', '2018-06-01', 'SC', 'cl-07'),
    student('st-08', 'Hui Ning Koh', '2019-10-01', 'SC', 'cl-06'),
    student('st-09', 'Jia Wen Koh', '2010-10-05', 'SC', 'cl-05'),
  ];
  db.links = [
    { guardianId: 'g-tan', personId: 'st-01' }, { guardianId: 'g-tan', personId: 'st-02' },
    { guardianId: 'g-ong', personId: 'st-05' }, { guardianId: 'g-ong', personId: 'st-06' },
    { guardianId: 'g-koh', personId: 'st-07' }, { guardianId: 'g-koh', personId: 'st-08' }, { guardianId: 'g-koh', personId: 'st-09' },
    { guardianId: 'g-nair', personId: 'st-04' },
    { guardianId: 'g-lim', personId: 'st-03' },
  ];

  db.feeComponents = [
    comp('fc-term', 'TERM', 'Term fee', 10000),
    comp('fc-mat', 'MAT', 'Materials', 1000),
    comp('fc-music', 'MUSIC', 'Music class', 3200),
    comp('fc-trip', 'TRIP', 'School trip', 7800),
    comp('fc-damage', 'DAMAGE', 'Damage repair', 1800),
    comp('fc-misc', 'MISC', 'Miscellaneous', 5500),
    comp('fc-act', 'ACT', 'Activity', 4100),
    { ...comp('fc-gst', 'GST', 'GST 9%', 0), calcType: 'PERCENT', rateBp: 900 },
  ];
  const ft = (id: string, code: string, name: string) => ({ id, code, name, description: '', status: 'ACTIVE' as const });
  db.feeTypes = [
    ft('ft-school', 'SCHOOL', 'School fee'), ft('ft-music', 'MUSIC', 'Music class'), ft('ft-trip', 'TRIP', 'School trip'),
    ft('ft-misc', 'MISC', 'Miscellaneous fee'), ft('ft-damage', 'DAMAGE', 'Damage charge'), ft('ft-act', 'ACT', 'Activity fee'),
  ];
  const link = (feeTypeId: string, ids: string[]) => ids.map((componentId, i) => ({ feeTypeId, componentId, order: i + 1 }));
  db.feeTypeComponents = [
    ...link('ft-school', ['fc-term', 'fc-mat', 'fc-gst']),
    ...link('ft-music', ['fc-music', 'fc-gst']),
    ...link('ft-trip', ['fc-trip', 'fc-gst']),
    ...link('ft-misc', ['fc-misc', 'fc-gst']),
    ...link('ft-damage', ['fc-damage', 'fc-gst']),
    ...link('ft-act', ['fc-act', 'fc-gst']),
  ];

  for (const id of ['st-01', 'st-03', 'st-05', 'st-06', 'st-07', 'st-09']) db = openAccount(db, id);
  for (let i = 0; i < 25; i++) {
    const year = 2024 + Math.floor(i / 12);
    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String(5 + (i % 20)).padStart(2, '0');
    db = credit(db, 'st-01', 2000, `${year}-${month}-${day}`);
  }
  db = credit(db, 'st-03', 4000, '2026-01-02');
  db = credit(db, 'st-05', 30000, '2026-01-02');
  db = credit(db, 'st-06', 12000, '2026-01-02');
  db = credit(db, 'st-07', 25000, '2026-01-02');
  db = credit(db, 'st-09', 8000, '2026-01-02');

  db = charge(db, 'sch-01', 'ft-school', 'st-01');
  db = charge(db, 'sch-01', 'ft-music', 'st-02');
  db = charge(db, 'sch-02', 'ft-trip', 'st-03');
  db = charge(db, 'sch-01', 'ft-misc', 'st-04');
  db = charge(db, 'sch-03', 'ft-act', 'st-05');
  db = charge(db, 'sch-03', 'ft-music', 'st-05');
  db = charge(db, 'sch-03', 'ft-damage', 'st-07');
  db = charge(db, 'sch-02', 'ft-act', 'st-09');
  const pendingCharge = db.charges.find((c) => c.personId === 'st-09')!;
  db = startOnlinePayment(db, { personId: 'st-09', chargeIds: [pendingCharge.id], idempotencyKey: 'seed-st-09' }, TODAY).db;
  return db;
}
