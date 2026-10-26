# Payment gateway (Stripe test-mode demo)

A learning project to understand how a payment gateway works with test cards. Node.js + Express + TypeScript, organized with **Clean Architecture**.

The card form is drawn by Stripe (Payment Element) inside an iframe, so card data **never goes through this server**.

> It only works with **test-mode** keys (`sk_test_…` / `pk_test_…`). The server refuses to start with any other.

## Requirements

- Node.js 20 or higher (tested with 24).
- A Stripe account with **test mode** (sandbox) enabled.

## Getting started

1. `npm install`
2. Copy `.env.example` as `.env` and fill in the keys (see the table below).
3. `npm run dev` and open http://localhost:3000

### Environment variables

| Variable | Required | Where to get it |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes | Dashboard → Developers → API keys (`sk_test_…`) |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Same page (`pk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Only for webhooks | `stripe listen --print-secret` (`whsec_…`) |
| `PORT` | No | Defaults to `3000` |
| `DATABASE_PATH` | No | SQLite file with orders, charges and events. Defaults to `data/demo.db` (`:memory:` for a temporary database) |

The `.env` file is in `.gitignore`. Don't paste the keys into chats, issues or screenshots.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Builds the client and starts the server with reload (`tsx watch`) |
| `npm run build` | Compiles the server (`dist/`) and the client (`public/js/`) |
| `npm start` | Builds and runs the compiled version |
| `npm run typecheck` | Checks the types of server and client without emitting files |

## How a payment works

```
Browser                      Your server                    Stripe
   │  GET /config  ─────────────▶│                              │
   │◀── publishable key + products│                              │
   │  POST /create-payment {product}▶│  paymentIntents.create ─▶│
   │◀── clientSecret ────────────│◀──────────────── PaymentIntent
   │  confirmPayment(card) ──────────────────────────────────▶ │  (Stripe iframe)
   │◀──────────────────────────────────────── result (UI)       │
   │                             │◀── webhook payment_intent.* ─│  ← the reliable source
```

- **The price lives on the server.** The client only sends the product id; the amount comes from the catalog.
- **The result the user sees is not the source of truth.** They can close the tab or lose their network. The real state of a payment is confirmed by the **webhook**, whose signature is verified on every call.

## Idempotency

An operation is idempotent if repeating it produces the same result as doing it once. In payments this matters because **you can't know whether a request without a response arrived or not**, and retrying blindly can charge twice. It is protected at three points:

| Where | Risk | Protection |
|---|---|---|
| Browser → `POST /create-payment` | A double click or retry creates two orders and two payments | `Idempotency-Key` header: one UUID per purchase attempt, reused on retries |
| Server → Stripe | The server retries after a timeout | The same key is passed to Stripe (`idempotencyKey`), which returns the same `PaymentIntent` for about 24 h |
| Stripe → `POST /webhook` | Stripe delivers "at least once": the same event can arrive repeated, or fail halfway | Deduplicated by `event.id` inside a transaction that also marks the order and records the charge |

**Scope of the key.** It identifies *one purchase attempt*, not the user or the device. Another product or a new purchase uses another key. The same purchase from another device is also another key: idempotency doesn't solve that, a business rule does (for example, a single pending order per cart). If the same key arrives with a different product, the server answers `409`.

### Lab

Below the store there is a panel with an **idempotency switch** to see the difference in a working application:

1. **Double submit when creating the payment.** "Simulate double click" fires two identical requests at once. With protection both return the same payment; without it, two are created.
2. **Duplicate webhook.** In the orders table, "×2" delivers the same payment notice twice. Without protection: 2 recorded charges and 2 SMS. With it: 1 and 1.
3. **Failure halfway through.** The failure selector makes each step fail at random. Without protection, the handler swallows the error, answers 200 and leaves the order paid without a charge or SMS (or a payment charged in Stripe that is never marked). With protection, everything is rolled back, it answers 500 and the retry finishes correctly.
4. **Reconciliation.** If a payment was charged in Stripe and not recorded, "Reconcile with Stripe" detects and fixes it. It acts as a safety net because webhooks can get lost; it can be run several times without duplicating anything.

The code with the problem (`naive-payment-succeeded.ts`) and the fixed one (`idempotent-payment-succeeded.ts`) sit side by side for comparison. The switch is only for the demo: in a real system idempotency is not optional.

> The "×1"/"×2" notices are simulated: the server calls itself with an event signed with `STRIPE_WEBHOOK_SECRET`. Real payments still come in through `stripe listen`. With idempotency enabled, an event for a payment that doesn't exist in the database (for example from `stripe trigger payment_intent.succeeded`, which creates its own payment) answers `404` so that Stripe retries it.

## Webhooks locally

Stripe can't call `localhost`. The [Stripe CLI](https://docs.stripe.com/stripe-cli) forwards the events to your machine.

1. Install it (`winget install Stripe.StripeCli` on Windows) and authorize with `stripe login`.
2. Get the secret and paste it into `STRIPE_WEBHOOK_SECRET`:
   ```
   stripe listen --print-secret
   ```
3. With the server running, in another terminal:
   ```
   stripe listen --events payment_intent.succeeded,payment_intent.payment_failed --forward-to localhost:3000/webhook
   ```
   The current CLI requires the events to be given with `--events` (or use `--all-snapshot`).
4. Test without paying: `stripe trigger payment_intent.succeeded`. The server console should print `✅ Payment approved …`.

> **The CLI must listen to the same account your keys use.** If you have several test environments, `stripe login` may authorize a different one than your `.env`, and then no events will ever arrive. To force it, add `--api-key <your sk_test_>` to the `stripe listen` command (and get the `whsec_` with that same key). You can check it with `stripe get /v1/account`, which must show the same `acct_…` as your key.

### Where to see the logs

1. **Server terminal** (`npm run dev`): what the use cases print.
2. **`stripe listen` terminal**: every event sent and the response (`[200]` fine, `[400]` invalid signature, `[500]` error in your code).
3. **Stripe Dashboard** (test mode, correct account): *Payments*, and *Workbench → Events / Logs*. Filter the events by `payment_intent`.

## Test cards

In the app, the **?** button (bottom-right corner) opens a modal with the cards grouped by scenario: successful payment, declined, 3D Secure and fraud. Use any future date, any CVC and any postal code. Full official list: https://docs.stripe.com/testing

The most used: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (declined), `4000 0000 0000 9995` (insufficient funds), `4000 0000 0000 3220` (mandatory 3D Secure).

## Architecture

Clean Architecture, with dependencies always pointing inward: `domain` ← `application` ← `infrastructure`, and `api` as the HTTP layer.

```
src/
├─ main.ts                  Minimal startup
├─ app.ts                   createApp(): builds Express without listening (so it can be tested without opening a port)
├─ composition-root.ts      The only place that wires implementations to use cases
├─ config/env.ts            Reads and validates .env at startup
├─ domain/                  Pure rules and types, no dependencies
│  ├─ products/product.ts
│  ├─ orders/order.ts
│  └─ payments/payment-event.ts      Payment events in our vocabulary
├─ application/             Use cases and ports (interfaces)
│  ├─ payments/             create-payment, naive-/idempotent-payment-succeeded, reconcile-payments
│  ├─ webhooks/handle-webhook.ts
│  ├─ lab/                  Lab state and simulations
│  ├─ ports/                PaymentGateway, OrderRepository, UnitOfWork, ProcessedEventStore, SmsSender...
│  └─ errors.ts
├─ infrastructure/          Implements the ports
│  ├─ stripe/               Gateway, webhook verifier, webhook simulator
│  ├─ persistence/sqlite/   Orders, charges, processed events and transactions (node:sqlite)
│  ├─ simulation/           Lab settings and fault injector
│  ├─ sms/                  Fake SMS (recorded in the database)
│  ├─ catalog/              In-memory catalog
│  └─ logging/              Console logger
├─ api/                     HTTP: routes/, middleware/ (errors in one place), dto/
└─ client/                  TypeScript frontend (api, checkout, lab, help-modal, dom, format…)

public/                     Static HTML and CSS; the compiled JS goes to public/js/ (ignored by git)
```

Only `infrastructure/stripe` knows the Stripe SDK. Switching gateway or catalog is done in the infrastructure and in `composition-root.ts`, without touching use cases or routes.

More detail on the rules and conventions in [`CLAUDE.md`](CLAUDE.md).

### Endpoints

| Method and route | Description |
|---|---|
| `GET /config` | Publishable key and product catalog |
| `POST /create-payment` | Creates the order and the `PaymentIntent`. Body: `{ "product": "<id>" }`, `Idempotency-Key` header → `{ "clientSecret": "…" }`. `400` without a key, `409` if the key was used with another product |
| `POST /webhook` | Receives Stripe events (raw body, verified signature). `200` only if the event was handled |
| `GET /simulation/state` | Settings, orders, charges, SMS and processed events (what the lab renders) |
| `PUT /simulation/settings` | `{ "idempotency": bool, "faultRatePercent": 0-100 }` |
| `POST /simulation/orders/:id/webhook` | Simulates an order's payment notice. Body: `{ "times": 1-5 }` |
| `POST /simulation/reconcile` | Compares Stripe's charges with the orders and fixes the pending ones |
| `POST /simulation/reset` | Deletes orders, charges, SMS and events |

## Pending (upcoming features)

### Refunds
Return all or part of an already charged payment, initiated by the merchant. It implies a `RefundPayment` use case, a new method on the `PaymentGateway` port, a route and handling of the `refund.*` events in the webhook. Stripe offers test cards for asynchronous refunds (`4000 0000 0000 7726` and `4000 0000 0000 5126`).

### Disputes (chargebacks)
When the customer claims the charge **from their bank** instead of asking you for a refund. The bank gives them the money back and takes it from the merchant's account while it is resolved, and a dispute fee is usually charged as well. Cycle: it opens (`charge.dispute.created`), the merchant has a deadline (typically 7 to 21 days) to submit evidence and the bank decides: won or lost (`charge.dispute.closed`). There is an earlier phase, the *inquiry*, which if resolved there avoids the formal chargeback. It implies handling the `charge.dispute.*` events, a `disputed` status on orders and a way to submit evidence. Stripe has test cards that generate disputes (for example `4000 0000 0000 0259`).
