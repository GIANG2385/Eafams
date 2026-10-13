# Edufarm prototype

Clickable prototype (mock data, no backend) of an Education Account & fee-payment system.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit + flow tests
npm run build
```

All data is fictional and stored in the browser (localStorage). Use the Demo controls panel to reset data.

## Demo walkthrough (8–10 minutes)

All data is fictional. Use the **Demo controls** panel (bottom right) to reset data, change "today" and force outcomes.

1. **Parent sign-in** – e-Service Portal → pick *Tan Mei Ling* → first-login welcome. Try *SingPass: Validation fails* in Demo controls to see the return to login.
2. **Pay with Education Account** – Aiden Tan → View outstanding fees → select → Education Account → Review → Confirm. Balance drops; double-click debits once.
3. **Access control** – signed in as another parent, open `/eservice/children/st-05` → access denied.
4. **Online payment** – *Rajesh Nair* → Priya Nair (no Education Account) → Online payment → sandbox: success, failure (Retry), cancel, timeout then *Check status*.
5. **Insufficient balance** – *Lim Pei Shan* → Marcus Lim: Education Account is disabled with the reason.
6. **Profile and assistant** – Profile: invalid mobile is rejected, valid change appears in history. Ask the Help assistant how to pay.
7. **Admin** – Admin Portal: switch *Acting as* between HQ and a school user (school records are read-only for schools; HQ can edit schools and assign school users). Import students (two rejected rows). Fee types: GST is shared by every fee type. Fee batches: preview → publish; the parent sees the charge.
8. **Education Account lifecycle** – Education Accounts → Run age-7 job (Hui Ning Koh gets an account; rerun creates none) → Run closure job (Mei Xin Ong closes to CPF; Jia Wen Koh is blocked by a pending payment). Force *CPF transfer: Fails* to see the retry path.
