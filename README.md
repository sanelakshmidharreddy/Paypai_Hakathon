# Intelligent PayPal Payment Failure & Recovery Platform

> **Empowering online merchants with deterministic PayPal response decoding, verified evidence extraction, and safe AI-guided checkout recovery.**

---

## 1. Project Title
**Intelligent PayPal Payment Failure & Recovery Platform**

---

## 2. Tagline
*Stop losing revenue to cryptic payment declines — decode PayPal failures into verified evidence and actionable recovery pathways.*

---

## 3. Project Description
The **Intelligent PayPal Payment Failure & Recovery Platform** is a merchant-focused SaaS application built for the **PayPal AI Hackathon**. It monitors PayPal checkout orders, safely verifies payment statuses via server-side REST APIs and secure webhooks, deterministically categorizes failure reasons, and synthesizes actionable recovery guidance using **OpenAI (GPT-4o-mini)** backed by an instant offline deterministic expert engine.

---

## 4. Problem Statement
Small and medium-sized online merchants lose up to 15–20% of initiated checkouts due to payment failures, bank declines, and buyer abandonment:
- Merchants receive opaque errors (e.g. `INSTRUMENT_DECLINED`, `PAYER_ACTION_REQUIRED`, `ORDER_ALREADY_CAPTURED`) with zero explanation of what went wrong.
- False assumptions lead to revenue loss: abandoned checkouts are misdiagnosed as bank declines; network timeouts are blindly retried, risking hazardous double-charges.
- Customer support costs escalate while high-intent shoppers abandon purchases.

---

## 5. Proposed Solution
Our platform bridges this gap with an evidence-grounded approach:
1. **Server-Side PayPal Verification**: Captures orders server-side, queries PayPal REST APIs directly, and verifies webhook signatures to establish indisputable facts.
2. **Deterministic Error Classification**: Categorizes PayPal errors across 17 distinct conditions and enforces strict retry safety rules (`SAFE_WITH_NEW_METHOD`, `DO_NOT_RETRY`, `VERIFY_FIRST`).
3. **AI Evidence Triad (GPT-4o-mini)**: Strictly separates **Confirmed Facts**, **Possible Hypotheses**, and **Unknown Information**, refusing to fabricate private banking reasons.
4. **Actionable Merchant & Customer Workflows**: Delivers operational instructions and ready-to-send customer recovery templates with one-click copying.

---

## 6. Key Features
- **PayPal Sandbox Checkout Integration**: Real JavaScript SDK buttons, order creation (`intent=CAPTURE`), server-side capture, and status polling.
- **Duplicate Capture Prevention**: Enforces idempotency to prevent double-billing.
- **Secure Webhook Pipeline**: Listens to 6 key lifecycle events (`CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.REFUNDED`, `CHECKOUT.PAYMENT-APPROVAL.REVERSED`) with PayPal signature verification and event idempotency.
- **Evidence-Based AI Explanations**: OpenAI `gpt-4o-mini` extracts root causes strictly bounded by verified PayPal data.
- **Zero-Downtime Deterministic Fallback**: Automatic offline expert diagnosis if OpenAI API is unavailable or unconfigured.
- **Audit Event Timeline**: Chronological event logs (`ORDER_CREATED` &rarr; `BUYER_APPROVED` &rarr; `CAPTURE_COMPLETED` / `PAYMENT_DECLINED` &rarr; `AI_ANALYSIS_COMPLETED`).
- **Interactive Sandbox Edge-Case Simulator**: One-click simulation of 8 real-world conditions for hackathon testing and demoing.
- **Filterable Merchant Dashboard**: Interactive filters for payment status, timeframe (7d, 14d, 30d, all), and error category with clear `DEMO FIXTURE` vs `SANDBOX LIVE` badges.

---

## 7. Innovation and Impact
- **No Hallucinations / Strict Grounding**: Unlike generic chatbots, our AI engine is bounded by deterministic rules. It never guesses internal bank decisions or claims false confidence percentages.
- **Retry Safety Guardrails**: Hardcoded financial safety rules prevent merchants from double-charging customers on already captured orders or repeating declined card charges.
- **Immediate Merchant ROI**: Transforms cryptic errors into personalized, empathetic customer emails that recover abandoned carts.

---

## 8. Technology Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, PayPal JavaScript SDK (`@paypal/react-paypal-js`).
- **Backend**: Node.js v24, Express.js, Native `node:sqlite` DatabaseSync.
- **AI Engine**: OpenAI API (`gpt-4o-mini`) via official `openai` SDK with deterministic rule engine fallback.
- **Database**: SQLite (`./data/transactions.db`) with persistent disk volume support.
- **Payment Gateway**: PayPal REST API (Sandbox) + PayPal Webhooks.

---

## 9. Application Architecture

```
                                  [ Customer Browser ]
                                           │
                        ┌──────────────────┴──────────────────┐
                        │                                     │
                 (Initiates Order)                   (PayPal Approval)
                        │                                     │
                        ▼                                     ▼
             [ Express.js Backend ] ◄──────────────► [ PayPal Sandbox REST API ]
                        │                             - OAuth 2.0 Token Flow
             (Duplicate Capture Check)                - Orders v2 (intent=CAPTURE)
             (Status Reconciliation)                  - Webhook Signature Verify
                        │
                        ▼
             ┌──────────────────────────────────────────────────┐
             │    Deterministic Error Classification Engine     │
             │   - 17 PayPal Issue Categories                   │
             │   - Retry Safety Guardrails (SAFE / DO NOT RETRY)│
             └──────────────────────────┬───────────────────────┘
                                        │
                                        ▼
             ┌──────────────────────────────────────────────────┐
             │           OpenAI Analysis Service                │
             │   - Model: gpt-4o-mini                           │
             │   - Strict Evidence Triad (CONFIRMED/POSSIBLE/   │
             │     UNKNOWN)                                     │
             │   - Instant Offline Deterministic Fallback       │
             └──────────────────────────┬───────────────────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        ▼                               ▼
              [ SQLite Database ]             [ Merchant Frontend ]
              - transactions Table            - KPI Stats & Filters
              - ai_analyses Table             - Diagnostic Detail View
              - webhook_events Table          - 1-Click Message Copy
```

---

## 10. Project Folder Structure

```
Paypai_Hakathon/
├── package.json                         # Root concurrently orchestration
├── .env.example                         # Root configuration template
├── .gitignore                           # Git exclusion rules
├── LICENSE                              # MIT License
├── README.md                            # Comprehensive technical documentation
├── backend/
│   ├── package.json                     # Express, SQLite, OpenAI dependencies
│   ├── render.yaml                      # Render deployment blueprint with persistent disk
│   ├── server.js                        # Express server entrypoint
│   ├── test/
│   │   ├── run-tests.js                 # Automated test runner
│   │   └── test-suite.js                # 7-stage comprehensive test assertions
│   └── src/
│       ├── config/
│       │   ├── env.js                   # Environment validation & defaults
│       │   └── paypal.js                # Statuses & supported currencies
│       ├── database/
│       │   ├── db.js                    # SQLite connection & schema migrations
│       │   └── seed.js                  # Realistic demo seed records
│       ├── services/
│       │   ├── aiService.js             # OpenAI integration & deterministic fallback
│       │   ├── classificationService.js # Deterministic PayPal error classifier
│       │   ├── recoveryService.js       # Safe merchant & customer recovery rules
│       │   ├── paypalService.js         # OAuth2, Orders v2, Captures, Webhook verify
│       │   ├── transactionService.js    # Transactions CRUD, timeline, metrics
│       │   └── webhookService.js        # Webhook idempotency & status sync
│       ├── controllers/
│       │   ├── transactionController.js # List, detail, analyze, history, refresh
│       │   ├── paypalController.js      # Create, capture, cancel, simulate
│       │   ├── webhookController.js     # Webhook listener, logs, simulate
│       │   ├── dashboardController.js   # Filtered KPI metrics & failure causes
│       │   └── healthController.js      # System diagnostics
│       └── routes/
│           ├── transactionRoutes.js     # /api/transactions/*
│           ├── paypalRoutes.js          # /api/paypal/*
│           ├── dashboardRoutes.js       # /api/dashboard/*
│           └── index.js
└── frontend/
    ├── package.json                     # React 19, Tailwind, Lucide dependencies
    ├── vercel.json                      # Vercel SPA routing & API proxy configuration
    ├── vite.config.js                   # Vite dev server & proxy settings
    ├── tailwind.config.js               # PayPal theme colors
    └── src/
        ├── App.jsx                      # Page router & modal coordinator
        ├── main.jsx                     # DOM mount
        ├── api/                         # API service layer
        │   ├── client.js
        │   ├── transactionApi.js
        │   ├── paypalApi.js
        │   └── dashboardApi.js
        ├── components/
        │   ├── common/                  # StatusBadge, StatCard, Modal, AlertBanner
        │   ├── layout/                  # Navbar, Sidebar, Layout
        │   └── checkout/                # CheckoutSimulatorModal
        └── pages/
            ├── DashboardPage.jsx        # Filterable KPIs, failure categories, recent table
            ├── TransactionsPage.jsx     # Search, status pills, pagination
            ├── TransactionDetailPage.jsx# AI Analysis, Evidence Triad, Message Copy
            └── SettingsPage.jsx         # Connection diagnostics & setup guide
```

---

## 11. Installation Instructions

### Prerequisites
- Node.js v18+ (Node.js v24 recommended)
- npm v9+

### Install Dependencies
From the repository root directory:
```powershell
npm run install:all
```
*This installs root, backend, and frontend packages simultaneously.*

---

## 12. Environment Variable Setup

Copy `.env.example` to `backend/.env`:
```powershell
copy .env.example backend\.env
```

Configure `backend/.env`:
```env
# Server
PORT=5000
NODE_ENV=development

# PayPal Sandbox REST API Credentials
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret_here
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id_here

# OpenAI API (For AI Payment Explanations)
OPENAI_API_KEY=your_openai_api_key_here

# SQLite Database Storage
DATABASE_FILE=./data/transactions.db
```

> **Security Guardrail**: Never expose `PAYPAL_CLIENT_SECRET` or `OPENAI_API_KEY` to the client. The frontend only receives the public `PAYPAL_CLIENT_ID` via `GET /api/paypal/config`.

---

## 13. PayPal Sandbox Setup

1. Log in to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Under **Apps & Credentials**, select the **Sandbox** tab.
3. Click **Create App** &rarr; Select **Merchant** &rarr; Name it `Intelligent-Payment-Recovery`.
4. Copy the generated **Client ID** and **Secret** into `backend/.env`.
5. Under **Testing Tools &rarr; Sandbox Accounts**:
   - Note the default **Personal (Buyer)** account email and password to use during test checkouts.
6. (Optional Webhooks): Under your Sandbox app, click **Add Webhook**, enter your webhook URL (or local ngrok URL) `/api/paypal/webhook`, select all payment events, and copy the **Webhook ID** into `PAYPAL_WEBHOOK_ID`.

---

## 14. AI API Setup (OpenAI)

1. Obtain an API key from [platform.openai.com](https://platform.openai.com/api-keys).
2. Set `OPENAI_API_KEY=sk-...` in `backend/.env`.
3. The platform uses model `gpt-4o-mini` with structured JSON responses.
4. *Zero-Downtime Guarantee*: If the key is omitted or invalid, the platform automatically runs its deterministic expert fallback engine without error.

---

## 15. Database Setup (SQLite)

- Zero configuration required.
- Uses Node.js native `DatabaseSync` (`node:sqlite`).
- Database initializes automatically on server boot with schemas, indices, and sample demo transactions in `./data/transactions.db`.
- Seed data can be re-run at any time with `npm run seed`.

---

## 16. How to Run Frontend

```powershell
npm run start:frontend
```
Frontend runs on **http://localhost:5173**.

---

## 17. How to Run Backend

```powershell
npm run start:backend
```
Backend API runs on **http://localhost:5000**.
Health check: **http://localhost:5000/api/health**.

### Concurrently (Frontend + Backend):
```powershell
npm run dev
```

---

## 18. Testing Instructions

Run the complete 7-stage automated verification suite:
```powershell
npm test
```
Tests:
1. System Health & Sandbox OAuth authentication.
2. Filtered Dashboard metrics calculation.
3. PayPal Webhook delivery, verification, and duplicate event idempotency.
4. Payment failure edge-case simulation (`INSTRUMENT_DECLINED`, `CARD_EXPIRED`, `ORDER_ALREADY_CAPTURED`, `NETWORK_TIMEOUT`).
5. AI analysis and deterministic fallback generation.
6. Order status synchronization with PayPal REST API.
7. Webhook audit log persistence in SQLite.

---

## 19. API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health, SQLite status & PayPal connectivity |
| `GET` | `/api/paypal/config` | Public PayPal Client ID & environment flags |
| `POST` | `/api/paypal/create-order` | Creates PayPal order with intent `CAPTURE` |
| `POST` | `/api/paypal/capture-order` | Captures approved order with duplicate protection |
| `POST` | `/api/paypal/cancel-order` | Logs buyer checkout abandonment |
| `GET` | `/api/paypal/order/:orderId` | Live status query directly from PayPal REST API |
| `POST` | `/api/paypal/simulate` | Simulates payment scenarios for demo and testing |
| `POST` | `/api/paypal/webhook` | Verified PayPal webhook receiver |
| `GET` | `/api/paypal/webhooks` | Lists stored webhook audit logs |
| `POST` | `/api/paypal/webhooks/simulate` | Simulates webhook event delivery |
| `GET` | `/api/transactions` | Lists transactions with search, pagination, and filters |
| `GET` | `/api/transactions/:id` | Full transaction audit details & event timeline |
| `POST` | `/api/transactions/:id/analyze` | Generates AI Payment Failure & Recovery Analysis |
| `GET` | `/api/transactions/:id/analysis` | Retrieves analysis history for a transaction |
| `POST` | `/api/transactions/:id/refresh` | Synchronizes status with PayPal REST API |
| `GET` | `/api/dashboard/stats` | Filterable KPIs (status, timeframe, error category) |
| `GET` | `/api/dashboard/activity` | Daily checkout trends & top failure categories |

---

## 20. Deployment Instructions

### Frontend (Vercel)
1. Push your repository to GitHub.
2. In Vercel, import the repository and set the **Root Directory** to `frontend`.
3. In `frontend/vercel.json`, update the backend destination URL:
   ```json
   { "source": "/api/(.*)", "destination": "https://your-backend.onrender.com/api/$1" }
   ```
4. Deploy.

### Backend (Render)
1. Create a **Web Service** on [Render.com](https://render.com) pointing to your repo.
2. Set **Root Directory** to `backend`.
3. **Important — Persistent Disk for SQLite**:
   Render containers have ephemeral filesystems. To permanently store SQLite data, add a **Persistent Disk**:
   - **Mount Path**: `/var/data`
   - **Size**: 1 GB
   - **Environment Variable**: `DATABASE_FILE=/var/data/transactions.db`
4. Set environment variables on Render:
   - `NODE_ENV=production`
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`
   - `PAYPAL_WEBHOOK_ID`
   - `OPENAI_API_KEY`
5. Deploy and verify health at `https://your-backend.onrender.com/api/health`.

---

## 21. Known Limitations
1. **Issuer Privacy**: Bank-internal decline reasons (e.g. credit limit vs fraud flag) are not disclosed by credit card networks. The platform identifies plausible causes but clearly labels them as `POSSIBLE` rather than guaranteed facts.
2. **Sandbox Emulation**: Real financial card declines cannot be triggered with random card numbers in Sandbox; testing utilizes PayPal's documented negative testing headers and the integrated Sandbox Edge-Case Simulator.
3. **Webhook Public Host**: PayPal webhook delivery requires a publicly accessible HTTPS endpoint (or tunneling via ngrok during local development).

---

## License

MIT License — see [LICENSE](file:///LICENSE) for details.
