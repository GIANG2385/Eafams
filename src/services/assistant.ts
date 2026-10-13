import { replyTo } from '../domain/assistant';
import type { AssistantReply, AssistantState } from '../domain/assistant';
import { ServiceError, call } from './core';

export function ask(text: string, state: AssistantState): Promise<{ reply: AssistantReply; state: AssistantState }> {
  return call(() => {
    const t = text.trim();
    if (!t) throw new ServiceError('VALIDATION', 'Type a question first.');
    if (t.length > 500) throw new ServiceError('VALIDATION', 'Please keep your question under 500 characters.');
    return replyTo(t, state);
  });
}
