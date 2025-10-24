# Wagers API

Backend service for a wagering wallet domain built with NestJS, Prisma, and SQLite. It exposes endpoints to create users, inspect balances, and perform deposits or withdrawals while capturing audit logs and emitting OpenTelemetry traces.

## Stack

- Node.js + NestJS (REST API, module architecture)
- Prisma ORM with SQLite (wallets, transactions, audit logs)
- Stripe SDK (mock-friendly payment processor abstraction)
- Zod validation (`nestjs-zod` global pipe)
- OpenTelemetry (NodeSDK + console exporter) for basic HTTP tracing
- Jest unit tests

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- No external database required (SQLite file is created automatically)

### Installation

```bash
npm install
```

Create a `.env` file (already committed for convenience) and adjust the values where necessary:

```
DATABASE_URL="file:./dev.db"
APP_PORT=3000
APP_NAME="Wagers API"
STRIPE_SECRET_KEY="sk_test_placeholder"
STRIPE_WEBHOOK_SECRET="whsec_placeholder"
```

> When `STRIPE_SECRET_KEY` is left as the placeholder, the payment provider automatically switches to a mock mode so deposits/withdrawals can be exercised without live credentials.

### Database

Prisma migrations are not yet generated. For local development:

```bash
npx prisma migrate dev --name init
```

This command creates the local SQLite database (`dev.db`) and generates the Prisma client.

### Running the API

```bash
npm run start:dev
```

The service listens on `http://localhost:3000/api/v1` by default. Telemetry is enabled by default and streams spans to stdout via the OpenTelemetry console exporter. Disable with `ENABLE_TELEMETRY=false` if needed.

## API Summary

| Method | Endpoint                                  | Description                            |
| ------ | ----------------------------------------- | -------------------------------------- |
| POST   | `/api/v1/users`                           | Create a user and provision a wallet   |
| GET    | `/api/v1/users/:userId`                   | Retrieve user profile                  |
| GET    | `/api/v1/users/:userId/wallet`            | Fetch wallet balance details           |
| GET    | `/api/v1/users/:userId/wallet/transactions` | List wallet transactions (desc order) |
| POST   | `/api/v1/users/:userId/wallet/deposit`    | Deposit funds into the wallet          |
| POST   | `/api/v1/users/:userId/wallet/withdraw`   | Withdraw funds from the wallet         |

### Sample Deposit Request

```http
POST /api/v1/users/<userId>/wallet/deposit
Content-Type: application/json

{
  "amount": "50.00",
  "currency": "USD",
  "metadata": {
    "source": "stripe-test"
  },
  "idempotencyKey": "optional-key"
}
```

Responses include wallet snapshots (balance, version) and the stored transaction record. Amounts are returned as fixed-point strings.

## Tests

```bash
npm run test
```

Current coverage focuses on wallet funding flows. Additional integration tests (using a transient SQLite database or Postgres for parity) can be layered on once the migrations are finalized.

## Observability

`src/telemetry/telemetry.ts` boots an OpenTelemetry `NodeSDK` with auto-instrumentations for HTTP/Express and writes spans to stdout. Swap in OTLP exporters or collectors as the solution evolves.

## Next Steps / Enhancements

- Persist migrations and provision seed scripts for demo environments.
- Add DB-backed idempotency keys and state machine enforcement for transaction lifecycles.
- Expand payment provider to call Stripe in live environments and reconcile asynchronous webhooks.
- Implement wagering flows that consume wallet balances and produce payouts.
- Harden optimistic locking on wallets and transactions (version field already in place).
