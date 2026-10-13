export interface AssistantReply {
  text: string;
  followUp?: string;
  link?: { label: string; to: string };
}
export interface AssistantState {
  pending: 'PAY_METHOD' | 'PROFILE_FIELD' | null;
}

const has = (s: string, re: RegExp) => re.test(s);
const done: AssistantState = { pending: null };

/** Scripted, deterministic helper. It explains how to use the portal and never reads personal data. */
export function replyTo(input: string, state: AssistantState): { reply: AssistantReply; state: AssistantState } {
  const t = input.toLowerCase().trim();

  if (has(t, /\b(my|his|her)\b.*\b(balance|owe|status|payments?)\b/) || has(t, /how much (do i|is|does)/)) {
    return {
      reply: {
        text: 'I can’t look up personal information such as balances or payment status. You can see it on your child’s account page.',
        link: { label: 'Open my children', to: '/eservice/children' },
      },
      state: done,
    };
  }

  if (state.pending === 'PAY_METHOD') {
    if (has(t, /education account|\bea\b|balance/)) {
      return {
        reply: {
          text: 'Open your child’s fees, select the fees you want to pay, choose Education Account, review and confirm. The Education Account is only available when the balance covers the total.',
          link: { label: 'Open my children', to: '/eservice/children' },
        },
        state: done,
      };
    }
    if (has(t, /online|card|gateway|bank/)) {
      return {
        reply: {
          text: 'Open your child’s fees, select the fees, choose Online payment and confirm. You will complete the payment on the payment provider page (a sandbox in this prototype).',
          link: { label: 'Open my children', to: '/eservice/children' },
        },
        state: done,
      };
    }
  }

  if (state.pending === 'PROFILE_FIELD' && has(t, /address|mobile|phone|number|email/)) {
    return profileAnswer();
  }

  if (has(t, /\b(hi|hello|hey)\b/)) {
    return { reply: { text: 'Hello! I can help you use the e-Service portal: paying fees, viewing transactions or updating your details.' }, state: done };
  }
  if (has(t, /pay|fee|charge|outstanding|bill/)) {
    const q = 'Would you like to pay with the Education Account or online?';
    return { reply: { text: 'I can help you pay fees.', followUp: q }, state: { pending: 'PAY_METHOD' } };
  }
  if (has(t, /address|mobile|phone|email/)) return profileAnswer();
  if (has(t, /detail|profile|personal|contact/)) {
    const q = 'Which detail would you like to change: address, mobile number or email?';
    return { reply: { text: 'You can update your contact details on the Profile page.', followUp: q }, state: { pending: 'PROFILE_FIELD' } };
  }
  if (has(t, /transaction|history|statement/)) {
    return {
      reply: {
        text: 'Transactions are shown on your child’s account page. You can filter by date and type and print a statement.',
        link: { label: 'Open my children', to: '/eservice/children' },
      },
      state: done,
    };
  }
  if (has(t, /singpass|login|log in|sign in/)) {
    return { reply: { text: 'You sign in with SingPass. After signing in you will only see the children linked to you.' }, state: done };
  }
  return {
    reply: { text: 'Sorry, I couldn’t understand that. For more help, please contact your child’s school.' },
    state: done,
  };
}

function profileAnswer(): { reply: AssistantReply; state: AssistantState } {
  return {
    reply: {
      text: 'You can change your address, mobile number and email on the Profile page. Your name and NRIC come from SingPass and cannot be edited.',
      link: { label: 'Open Profile', to: '/eservice/profile' },
    },
    state: done,
  };
}
