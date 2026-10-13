import { replyTo } from './assistant';

const none = { pending: null } as const;

test('a payment question gets a follow-up before the answer (R-AI-1)', () => {
  const out = replyTo('How do I pay a fee?', none);
  expect(out.reply.followUp).toMatch(/education account or online/i);
  expect(out.state.pending).toBe('PAY_METHOD');
});

test('the follow-up answer is resolved and the context is cleared', () => {
  const ea = replyTo('education account', { pending: 'PAY_METHOD' });
  expect(ea.reply.text).toMatch(/select the fees/i);
  expect(ea.state.pending).toBeNull();
  const online = replyTo('online please', { pending: 'PAY_METHOD' });
  expect(online.reply.text).toMatch(/sandbox|online payment/i);
});

test('personal data questions are refused and redirected, never answered', () => {
  for (const q of ['What is my balance?', 'how much do I owe', 'what is my payment status']) {
    const out = replyTo(q, none);
    expect(out.reply.text).toMatch(/can.t look up personal/i);
    expect(out.reply.link?.to).toBe('/eservice/children');
  }
});

test('profile questions: ask which field when unclear, answer directly when clear', () => {
  const vague = replyTo('I want to change my details', none);
  expect(vague.reply.followUp).toMatch(/address, mobile number or email/i);
  expect(vague.state.pending).toBe('PROFILE_FIELD');
  const clear = replyTo('how do I change my mobile number', none);
  expect(clear.reply.link?.to).toBe('/eservice/profile');
  expect(clear.reply.followUp).toBeUndefined();
});

test('unknown input falls back to the school contact and keeps no pending context', () => {
  const out = replyTo('asdf qwerty', { pending: 'PAY_METHOD' });
  expect(out.reply.text).toMatch(/couldn.t understand/i);
  expect(out.reply.text).toMatch(/contact your child.s school/i);
  expect(out.state.pending).toBeNull();
});

test('greeting and transaction history are covered', () => {
  expect(replyTo('hello', none).reply.text).toMatch(/hello/i);
  expect(replyTo('where is my transaction history', none).reply.link?.to).toBe('/eservice/children');
});
