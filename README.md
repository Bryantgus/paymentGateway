Payment gateway demo (Stripe, test mode)

A learning project: card payments with Stripe's Payment Element, a signed webhook, and an idempotency lab that shows, in a working app, what goes wrong with duplicate webhooks and partial failures, and how to fix it.

Node.js + Express + TypeScript, Clean Architecture, SQLite (node:sqlite). Test-mode keys only: the server refuses to start with anything else. Card data never touches the server (Stripe draws the form in an iframe).

Run it

Requires Node 20+ (tested with 24) and a Stripe account in test mode.

npm install
cp .env.example .env     # fill in sk_test_..., pk_test_... and, for webhooks, whsec_...
npm run dev              # http://localhost:3000

Webhooks locally (second terminal, STRIPE_WEBHOOK_SECRET from stripe listen --print-secret):

stripe listen --events payment_intent.succeeded,payment_intent.payment_failed --forward-to localhost:3000/webhook

The CLI must be logged in to the same Stripe account as your keys (otherwise use --api-key). Test card: 4242 4242 4242 4242 (the ? button in the app lists more).

The idea: idempotency

Stripe delivers webhooks "at least once", and a request without a response may or may not have arrived. So the same event can show up twice, or fail halfway.

Problem	Cause	Fix
Double click creates two orders and payments	No way to tell a retry from a new purchase	Idempotency-Key header (one UUID per purchase attempt), stored in a unique column and passed to Stripe
Same webhook twice: 2 charges, 2 SMS	The handler is not safe to repeat	Reserve event.id with a unique constraint; if it already exists, answer 200 and do nothing
Paid in Stripe, never marked paid	The handler swallowed an error and answered 200, so Stripe stopped retrying	Reserve event + mark order + record charge in one transaction; on failure roll back and answer 500 so Stripe retries
Webhook lost for good	Stripe does not retry forever	Reconciliation: compare Stripe's succeeded payments with our orders, fix the gaps through the same idempotent code
	The SMS is sent after the transaction commits. The naive handler (naive-payment-succeeded.ts) is kept on purpose next to the fixed one (idempotent-payment-succeeded.ts).

The lab

The panel below the store has a switch to turn idempotency on and off:

Simulate double click: two identical requests at once. Off: two payments. On: the same one.
×2 on an order: delivers the same signed webhook twice. Off: 2 charges and 2 SMS. On: 1 and 1.
Failure rate: makes steps fail at random. Off: order paid with no charge or SMS. On: rollback, 500, and the retry finishes correctly.
Reconcile with Stripe: fixes orders paid in Stripe but still pending. Safe to run repeatedly.

The switch exists only for the demo. In a real system idempotency is never optional.

Structure

src/
├─ domain/            Pure types (products, orders, payment events)
├─ application/       Use cases and ports (interfaces)
├─ infrastructure/    Stripe, SQLite, fake SMS, lab simulation
├─ api/               Express routes, DTOs, error handler
├─ client/            TypeScript frontend (checkout and lab)
└─ composition-root.ts   Wires implementations to use cases

Dependencies point inward: domain ← application ← infrastructure. Only infrastructure/stripe imports the Stripe SDK. Rules and conventions: CLAUDE.md.

Limits and next steps

No test framework yet (the scenarios were checked with a throwaway script).
Reconciliation is a manual button, not a scheduled job, and has no alert.
If the process dies right after the commit, the SMS is lost (an outbox would fix it).
Planned: refunds and disputes.
