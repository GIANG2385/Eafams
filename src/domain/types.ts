export type IsoDate = string;
export type Cents = number;
export type Citizenship = 'SC' | 'PR' | 'FOREIGN';
export type EnrolmentStatus = 'ENROLLED' | 'TRANSFERRED' | 'LEFT';
export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type AccountStatus = 'ACTIVE' | 'CLOSED';
export type LedgerType = 'TOPUP_SEED' | 'DEMO_FUNDS' | 'FEE_DEBIT' | 'CPF_TRANSFER';
export type ChargeStatus = 'OUTSTANDING' | 'PENDING_PAYMENT' | 'PAID';
export type PaymentMethod = 'EA' | 'ONLINE';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
export type GatewayOutcome = 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';

export interface School { id: string; code: string; name: string; status: EntityStatus }
export interface SchoolUser { id: string; name: string; schoolId: string }
export interface Level { id: string; schoolId: string; name: string; status: EntityStatus }
export interface SchoolClass { id: string; levelId: string; name: string; academicYear: string; status: EntityStatus }
export interface Student {
  personId: string;
  name: string;
  dob: IsoDate | null;
  citizenship: Citizenship | null;
  address: string;
  classId: string | null;
  enrolmentStatus: EnrolmentStatus;
}
export interface Guardian {
  id: string;
  displayName: string;
  maskedNric: string;
  residentialAddress: string;
  residentialPostalCode: string;
  mailingAddress: string;
  mailingPostalCode: string;
  mobile: string;
  email: string;
}
export interface ParentStudentLink { guardianId: string; personId: string }
export interface EducationAccount {
  id: string;
  personId: string;
  status: AccountStatus;
  openedOn: IsoDate;
  closedOn: IsoDate | null;
}
export interface LedgerEntry {
  id: string;
  accountId: string;
  type: LedgerType;
  amountCents: Cents; // credit > 0, debit < 0
  postedAt: IsoDate;
  ref: string;
  idempotencyKey: string | null;
}
export interface CpfTransfer {
  id: string;
  accountId: string;
  amountCents: Cents;
  status: 'SUCCEEDED' | 'FAILED';
  ref: string;
  at: IsoDate;
}
export interface FeeType { id: string; code: string; name: string; description: string; status: EntityStatus }
export interface FeeComponent {
  id: string;
  code: string;
  name: string;
  calcType: 'FIXED' | 'PERCENT';
  amountCents: Cents; // used when FIXED
  rateBp: number; // basis points, used when PERCENT (900 = 9%)
  effectiveFrom: IsoDate;
  effectiveTo: IsoDate | null;
  status: EntityStatus;
}
export interface FeeTypeComponent { feeTypeId: string; componentId: string; order: number }
export type BatchTarget =
  | { kind: 'CLASS'; ids: string[] }
  | { kind: 'LEVEL'; ids: string[] }
  | { kind: 'STUDENTS'; ids: string[] };
export interface FeeBatch {
  id: string;
  schoolId: string;
  feeTypeId: string;
  target: BatchTarget;
  dueOn: IsoDate;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: IsoDate | null;
}
export interface ChargeLine { componentId: string; label: string; amountCents: Cents }
export interface Charge {
  id: string;
  personId: string;
  batchId: string;
  feeTypeId: string;
  feeTypeName: string;
  lines: ChargeLine[];
  subsidyCents: Cents;
  totalCents: Cents;
  dueOn: IsoDate;
  status: ChargeStatus;
}
export interface Payment {
  id: string;
  referenceNo: string;
  personId: string;
  chargeIds: string[];
  method: PaymentMethod;
  status: PaymentStatus;
  idempotencyKey: string;
  gatewayRef: string | null;
  totalCents: Cents;
  createdAt: IsoDate;
}
export interface ProfileChange {
  id: string;
  guardianId: string;
  field: string;
  oldValue: string;
  newValue: string;
  at: IsoDate;
}
export interface JobResult {
  personId: string | null;
  label: string;
  outcome: string;
  reason?: string;
  amountCents?: Cents;
}
export interface JobRun {
  id: string;
  kind: 'IMPORT' | 'EA_CREATE' | 'EA_CLOSE';
  asOf: IsoDate;
  results: JobResult[];
}
export interface Settings {
  today: IsoDate;
  gatewayMode: 'ASK' | GatewayOutcome | 'RANDOM';
  timeoutResolution: 'SUCCEEDED' | 'FAILED' | 'STILL_PENDING';
  singpass: 'OK' | 'FAIL';
  source: 'OK' | 'DENIED';
  cpf: 'OK' | 'FAIL';
  latency: 'off' | 'normal' | 'slow';
  failNext: boolean;
}
export interface Db {
  version: number;
  seq: number;
  settings: Settings;
  schools: School[];
  schoolUsers: SchoolUser[];
  levels: Level[];
  classes: SchoolClass[];
  students: Student[];
  guardians: Guardian[];
  links: ParentStudentLink[];
  accounts: EducationAccount[];
  ledger: LedgerEntry[];
  cpfTransfers: CpfTransfer[];
  feeTypes: FeeType[];
  feeComponents: FeeComponent[];
  feeTypeComponents: FeeTypeComponent[];
  batches: FeeBatch[];
  charges: Charge[];
  payments: Payment[];
  profileChanges: ProfileChange[];
  runs: JobRun[];
}
