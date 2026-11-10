# Intelligent PayPal Payment Failure & Recovery Platform

> **PayPal AI Hackathon — Project Phase 1: Foundation & PayPal Sandbox Integration**

An intelligent, merchant-focused full-stack application designed to monitor PayPal transactions, decode unclear payment decline/failure messages, prevent duplicate charges, and provide actionable recovery pathways.

---

## 1. Problem Statement

Small and medium-sized online merchants frequently suffer from abandoned or interrupted PayPal checkout transactions. When a payment fails or is refused:
- Merchants often receive cryptic error messages (e.g., `INSTRUMENT_DECLINED`, `TRANSACTION_REFUSED`) with zero actionable guidance.
- Interrupted checkouts (e.g., buyer closed window or aborted) are often misclassified as financial declines.
- Customer support costs rise while recoverable sales are lost.
- This application provides deep transaction observability, real PayPal Sandbox checkout integration, server-side status verification, and sets the stage for AI-driven recovery explanations in Phase 2.

---

## 2. Key Features (Phase 1)

- **Real PayPal Sandbox Integration**:
  - Full OAuth 2.0 Client Credentials flow with in-memory caching and token expiration safety buffers.
  - Server-side Order Creation (`POST /v2/checkout/orders`) with intent `CAPTURE`.
  - Server-side Order Capture (`POST /v2/checkout/orders/{id}/capture`) with `Prefer: return=representation`.
  - Direct server-to-server PayPal status verification via `GET /v2/checkout/orders/{id}`.
- **Safety & Guardrails**:
  - **Duplicate Capture Prevention**: Enforces idempotency and checks whether orders have already been captured or completed before triggering PayPal capture.
  - **Zero Cardholder Data Storage**: No credit card numbers or CVVs are ever handled or stored.
  - **No False Positives**: Payment completion is never assumed based on client callbacks alone; it is verified with PayPal REST API.
  - **Status Precision**: Interrupted/abandoned checkouts (`CANCELLED`) are cleanly distinguished from card declines (`DECLINED`) or system errors (`FAILED`).
- **Merchant Dashboard & Analytics**:
  - High-level KPIs: Total transactions, successful revenue collected, failed volume at risk, and success rate.
  - Top payment failure cause breakdown (e.g. `INSTRUMENT_DECLINED`, `PAYER_ACTION_REQUIRED`).
- **Interactive Sandbox Checkout & Edge-Case Simulator**:
  - Live PayPal buttons rendered via the PayPal JavaScript SDK for real sandbox accounts.
  - One-click Sandbox Edge-Case triggers (`INSTRUMENT_DECLINED`, `PENDING_REVIEW`, `BUYER_CANCELLED`, `COMPLETED`) to test all response handling.
- **SQLite Audit Trail**:
  - Zero-configuration local database using Node.js native `node:sqlite`.
  - Detailed audit timeline tracking every step (`ORDER_CREATED` &rarr; `BUYER_APPROVED` &rarr; `CAPTURE_COMPLETED` / `PAYMENT_DECLINED`).
  - Pre-structured database columns ready for Phase 2 AI recovery recommendations.

---

## 3. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, PayPal JavaScript SDK (`@paypal/react-paypal-js`).
- **Backend**: Node.js v24, Express.js, Native `node:sqlite` DatabaseSync.
- **Database**: SQLite (stored in `./data/transactions.db`).
- **Payment Gateway**: PayPal REST API (Sandbox environment).

---

## 4. Project Structure

```
Paypai_Hakathon/
├── package.json              # Root orchestration scripts
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore rules
├── LICENSE                   # MIT License
├── README.md                 # Full documentation
├── backend/
│   ├── package.json          # Express dependencies
│   ├── .env.example          # Backend environment template
│   ├── .env                  # Active local config (uncommitted)
│   ├── server.js             # Express application entrypoint
│   └── src/
│       ├── config/
│       │   ├── env.js        # Environment validation & loading
│       │   └── paypal.js     # PayPal status constants & configuration
│       ├── database/
│       │   ├── db.js         # SQLite connection & schema migration
│       │   └── seed.js       # Realistic initial transactions seeder
│       ├── utils/
│       │   ├── logger.js     # Structured console logger
│       │   ├── idGenerator.js# Unique transaction & event ID generators
│       │   └── paypalErrors.js # PayPal error catalog & human interpreter
│       ├── services/
│       │   ├── paypalService.js      # PayPal OAuth2, orders, and capture API
│       │   └── transactionService.js # Transactions, timeline, metrics
│       ├── controllers/
│       │   ├── paypalController.js    # Create order, capture, cancel, test
│       │   ├── transactionController.js # List, filter, detail, sync
│       │   ├── dashboardController.js   # KPI stats & activity analytics
│       │   └── healthController.js      # Health and connection diagnostics
│       ├── routes/
│       │   ├── paypalRoutes.js
│       │   ├── transactionRoutes.js
│       │   ├── dashboardRoutes.js
│       │   └── index.js
│       └── middleware/
│           ├── errorHandler.js
│           └── requestLogger.js
└── frontend/
    ├── package.json          # React + Vite dependencies
    ├── vite.config.js        # Dev server & backend proxy config
    ├── tailwind.config.js    # Tailwind styling config
    ├── postcss.config.js
    ├── index.html            # HTML shell
    └── src/
        ├── index.css
        ├── main.jsx
        ├── App.jsx           # Master navigation & state
        ├── api/              # API Service Layer
        │   ├── client.js
        │   ├── paypalApi.js
        │   ├── transactionApi.js
        │   └── dashboardApi.js
        ├── components/
        │   ├── common/       # StatusBadge, StatCard, Modal, AlertBanner
        │   ├── layout/       # Navbar, Sidebar, Layout
        │   └── checkout/     # CheckoutSimulatorModal
        ├── pages/
        │   ├── DashboardPage.jsx
        │   ├── TransactionsPage.jsx
        │   ├── TransactionDetailPage.jsx
        │   └── SettingsPage.jsx
        └── utils/
            └── formatters.js # Currency and date formatters
```

---

## 5. How to Obtain PayPal Sandbox Credentials

1. Go to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Log in with your standard PayPal account.
3. In the left navigation, click on **Apps & Credentials**.
4. Select the **Sandbox** tab (not Live).
5. Click **Create App**:
   - **App Name**: `Intelligent-Payment-Recovery`
   - **App Type**: `Merchant`
6. Once created, copy:
   - **Client ID**
   - **Secret**
7. Navigate to **Testing Tools** &rarr; **Sandbox Accounts** to view your pre-created Sandbox accounts:
   - **Business Account**: Used by your merchant app.
   - **Personal Account**: Used as the test buyer to approve checkouts during testing. Note down the buyer's email and password.

---

## 6. Configuration & Environment Setup

Create `backend/.env` (or copy from `.env.example`):

```bash
# Server port
PORT=5000
NODE_ENV=development

# PayPal Sandbox REST API Credentials
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret_here
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=

# OpenAI API Key (Prepared for Phase 2 - AI Recovery)
OPENAI_API_KEY=your_openai_api_key_here

# SQLite Database
DATABASE_FILE=./data/transactions.db
```

> **Security Note**: Never expose `PAYPAL_CLIENT_SECRET` or `OPENAI_API_KEY` in frontend code. The frontend only receives the safe public `PAYPAL_CLIENT_ID` from the `/api/paypal/config` endpoint.

---

## 7. Installation & Startup Commands

### Option A: Run Both Frontend & Backend Concurrently (Recommended)

From the project root:

```bash
# 1. Install all dependencies (root, backend, frontend)
npm run install:all

# 2. Start both backend (port 5000) and frontend (port 5173) concurrently
npm run dev
```

### Option B: Run in Separate Terminals

**Terminal 1 — Backend API:**
```bash
cd backend
npm install
npm start
```
The backend starts at `http://localhost:5000`.

**Terminal 2 — Frontend UI:**
```bash
cd frontend
npm install
npm run dev
```
The frontend starts at `http://localhost:5173`. Open your browser to `http://localhost:5173`.

---

## 8. Backend API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health, SQLite status & PayPal OAuth connectivity check |
| `GET` | `/api/paypal/config` | Returns safe public client ID and environment configuration |
| `POST` | `/api/paypal/create-order` | Creates PayPal order with intent `CAPTURE` & stores transaction |
| `POST` | `/api/paypal/capture-order` | Captures approved order with duplicate-capture protection |
| `POST` | `/api/paypal/cancel-order` | Records buyer checkout abandonment |
| `GET` | `/api/paypal/order/:orderId` | Live status check directly with PayPal REST API |
| `POST` | `/api/paypal/simulate` | Triggers a simulated scenario (`SUCCESS`, `DECLINE`, `PENDING`, `CANCEL`) |
| `GET` | `/api/transactions` | Lists transactions with pagination, search, and status filtering |
| `GET` | `/api/transactions/:id` | Fetches transaction audit details & event timeline |
| `POST` | `/api/transactions/:id/sync` | Re-verifies transaction with PayPal REST API and updates DB |
| `GET` | `/api/dashboard/stats` | Aggregated metrics (totals, success rate, lost revenue) |
| `GET` | `/api/dashboard/activity` | Top failure reasons & daily checkout activity |

---

## 9. Transaction Lifecycle & State Machine

```
               [ User initiates checkout ]
                           │
                           ▼
                    ┌──────────────┐
                    │   CREATED    │
                    └──────┬───────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
    [ Buyer Cancels ]             [ Buyer Approves ]
            │                             │
            ▼                             ▼
     ┌─────────────┐               ┌─────────────┐
     │  CANCELLED  │               │  APPROVED   │
     └─────────────┘               └──────┬──────┘
                                          │
                               [ Capture Attempt ]
                                          │
                  ┌───────────────────────┼───────────────────────┐
                  ▼                       ▼                       ▼
           ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
           │  COMPLETED  │         │   PENDING   │         │  DECLINED / │
           │             │         │  (eCheck)   │         │   FAILED    │
           └─────────────┘         └─────────────┘         └─────────────┘
```

Supported States:
- `CREATED`: PayPal Order generated on backend, awaiting buyer interaction.
- `APPROVED`: Buyer confirmed purchase inside PayPal checkout window.
- `COMPLETED`: Funds successfully captured and verified via PayPal REST API.
- `PENDING`: Payment captured but funds held for clearance (e.g. eCheck, risk review).
- `DECLINED`: Financial decline from issuing bank (e.g., `INSTRUMENT_DECLINED`).
- `FAILED`: System or risk refusal (e.g., `TRANSACTION_REFUSED`).
- `CANCELLED`: Buyer explicitly abandoned or closed the PayPal popup.

---

## 10. PayPal Sandbox Testing Guide

1. Click **Test PayPal Checkout** in the top navigation bar.
2. In the modal:
   - **Tab 1: Live PayPal Sandbox Checkout**:
     - Make sure `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are configured.
     - The real PayPal button will render.
     - Click the PayPal button, log in with your **Sandbox Personal (Buyer)** account, and confirm the purchase.
     - The backend will capture the order, log the capture ID, and redirect to the transaction audit details.
   - **Tab 2: Sandbox Edge-Case Simulator**:
     - Provides instant testing of all edge conditions:
       - **Successful Capture**: Simulates standard $49.99 payment.
       - **Instrument Declined (422)**: Simulates issuing bank decline with error interpretation.
       - **Pending Settlement**: Simulates eCheck with `PENDING_REVIEW` caution.
       - **Buyer Abandonment**: Simulates interrupted checkout (`BUYER_CANCELLED`).
3. Click on any transaction row in the **Transactions** view to review the step-by-step timeline and diagnostic recommendations.

---

## 11. Ready for Prompt 2 (AI Integration)

The database schema and architecture already include fields ready for Phase 2:
- `ai_analysis_status` (`pending`, `analyzed`, `actioned`)
- `ai_analysis_summary` (AI-generated explanation of the failure)
- `ai_recovery_recommendation` (Recommended next steps for the merchant)
- `ai_merchant_action` (Specific customer outreach or retry action)
- `raw_paypal_response` (Complete JSON payload preserved for LLM context extraction)

---

## License

MIT License — see [LICENSE](file:///LICENSE) for details.
