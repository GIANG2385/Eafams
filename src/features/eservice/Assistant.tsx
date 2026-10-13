import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../components/StateView';
import { announcePanelOpen, useCloseWhenOtherPanelOpens } from '../../components/panelBus';
import { Badge, Button } from '../../components/ui';
import type { AssistantReply, AssistantState } from '../../domain/assistant';
import { ask } from '../../services/assistant';

interface Msg {
  from: 'user' | 'bot';
  text: string;
  reply?: AssistantReply;
}
const TYPING_MS = import.meta.env.MODE === 'test' ? 0 : 1000;

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [state, setState] = useState<AssistantState>({ pending: null });
  const [typing, setTyping] = useState(false);
  useCloseWhenOtherPanelOpens('assistant', () => setOpen(false));

  async function send() {
    const text = input.trim();
    if (!text || typing) return;
    setMsgs((m) => [...m, { from: 'user', text }]);
    setInput('');
    setTyping(true);
    try {
      const out = await ask(text, state);
      if (TYPING_MS > 0) await new Promise((r) => setTimeout(r, TYPING_MS));
      setState(out.state);
      setMsgs((m) => [...m, { from: 'bot', text: out.reply.text, reply: out.reply }]);
    } catch (e) {
      setMsgs((m) => [...m, { from: 'bot', text: errorMessage(e) }]);
    } finally {
      setTyping(false);
    }
  }

  if (!open) {
    return (
      <Button className="fixed bottom-3 left-3 z-40 shadow" onClick={() => { announcePanelOpen('assistant'); setOpen(true); }}>
        Help assistant
      </Button>
    );
  }
  return (
    <div role="dialog" aria-label="Help assistant" className="fixed bottom-3 left-3 z-40 flex h-96 w-80 flex-col rounded-lg border border-slate-400 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b p-2">
        <div>
          <strong>Help assistant</strong> <Badge tone="blue">AI assistant (scripted)</Badge>
        </div>
        <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
      </div>
      <div role="log" aria-live="polite" className="flex-1 space-y-2 overflow-y-auto p-2 text-sm">
        {msgs.length === 0 && <p className="text-slate-600">Ask how to pay fees, view transactions or update your details.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.from === 'user' ? 'text-right' : ''}>
            <p className={`inline-block rounded px-2 py-1 ${m.from === 'user' ? 'bg-indigo-100' : 'bg-slate-100'}`}>{m.text}</p>
            {m.reply?.followUp && <p className="mt-1 inline-block rounded bg-slate-100 px-2 py-1">{m.reply.followUp}</p>}
            {m.reply?.link && (
              <p><Link className="text-indigo-700 underline" to={m.reply.link.to}>{m.reply.link.label}</Link></p>
            )}
          </div>
        ))}
        {typing && <p className="text-slate-500">Assistant is typing…</p>}
      </div>
      <form className="flex gap-2 border-t p-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <label className="sr-only" htmlFor="assistant-input">Your question</label>
        <input id="assistant-input" className="flex-1 rounded border border-slate-400 px-2 py-1 text-sm" value={input} onChange={(e) => setInput(e.target.value)} />
        <Button type="submit" disabled={!input.trim() || typing}>Send</Button>
      </form>
    </div>
  );
}
