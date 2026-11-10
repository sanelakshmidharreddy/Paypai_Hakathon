# Intelligent PayPal Payment Failure & Recovery Platform

> **PayPal AI Hackathon — Project Phase 2: AI Payment Failure Analysis & Intelligent Recovery Engine**

An intelligent, merchant-focused full-stack application designed to monitor PayPal transactions, decode cryptic payment failure/decline responses into verified evidence, prevent duplicate charges, and provide actionable recovery pathways powered by OpenAI and deterministic rules.

---

## 1. Problem Statement

Small and medium-sized online merchants frequently suffer from abandoned or interrupted PayPal checkout transactions. When a payment fails or is refused:
- Merchants receive opaque error codes (e.g. `INSTRUMENT_DECLINED`, `PAYER_ACTION_REQUIRED`, `ORDER_ALREADY_CAPTURED`) with zero guidance on what happened or what action to take next.
- False assumptions occur: interrupted checkouts are mistaken for declines; timeouts are blindly retried leading to duplicate charges.
- Customers become frustrated, churn, and abandoned sales are lost.

This platform bridges that gap by transforming raw PayPal response payloads into structured, evidence-backed explanations and safe merchant recovery actions.

---

## 2. Main AI & Recovery Architecture (Phase 2)

```
                            [ PayPal REST API Response / Sandbox Event ]
                                                │
                                                ▼
                        ┌───────────────────────────────────────────────┐
                        │   Deterministic Error Classification Engine   │
                        │        (backend/src/services/classification)  │
                        └───────────────────────┬───────────────────────┘
                                                │
                                ┌───────────────┴───────────────┐
                                ▼                               ▼
                     [ Safety Guardrails ]             [ Evidence Extractor ]
                     - Retry Safety Level              - CONFIRMED Facts
                     - Double-charge Prevention        - POSSIBLE Hypotheses
                     - Outcome Normalization           - UNKNOWN Info
                                │                               │
                                └───────────────┬───────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────────┐
                                │      OpenAI Engine Service    │
                                │    (GPT-4o-mini / Fallback)   │
                                └───────────────┬───────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
           [ SQLite Database ]                               [ Merchant Frontend ]
      - Table: ai_analyses                               - Plain-English Explanation
      - Complete Analysis History                        - Confirmed vs Unknown Cards
      - Audit Timeline Events                            - Retry Safety Banner
                                                         - Customer-Friendly Message (1-click copy)
```

---

## 3. Core Principles & Safety Guardrails

1. **Evidence-Based Explanations**: The AI only explains actual transaction data and verified PayPal response fields. It **never invents payment failure reasons**.
2. **Three-Tier Evidence Categorization**:
   - **CONFIRMED**: Facts directly established by PayPal response information (e.g., "PayPal received an explicit decline from the buyer's issuing bank", "HTTP 422 returned with issue INSTRUMENT_DECLINED").
   - **POSSIBLE**: Plausible hypotheses grounded in domain knowledge (e.g., "Insufficient balance, daily transaction limit, or bank security hold"), explicitly stated as possibilities without claiming bank-internal certainty.
   - **UNKNOWN**: Specific information PayPal does *not* disclose (e.g., "The exact internal bank decline reason is not provided due to financial privacy laws").
3. **Deterministic Safety First**:
   - `SAFE_WITH_NEW_METHOD`: Customer can retry with a different card or PayPal balance.
   - `DO_NOT_RETRY`: Hazardous to retry (e.g. order already captured or merchant restricted).
   - `VERIFY_FIRST`: Network timeout or pending eCheck — must verify status with PayPal API before retrying.
   - `SAFE_TO_RETRY`: Buyer cancelled/abandoned checkout session.
4. **Never Change Payment Status**: The AI provides analysis and recovery guidance; it is never permitted to mutate actual financial transaction state or trigger unauthorized retries.
5. **Instant Offline Fallback**: If the OpenAI API is unreachable, unconfigured, or encounters quota limits, the platform seamlessly runs its deterministic PayPal expert engine (`source: 'DETERMINISTIC_FALLBACK'`). The app never crashes or displays fabricated output.

---

## 4. Payment Failure Classification Catalog

The engine deterministically classifies relevant PayPal error issues:

| PayPal Error / Condition | Classification | Outcome | Retry Safety | Primary Action |
|---|---|---|---|---|
| `INSTRUMENT_DECLINED` | Card / Instrument Declined | `DECLINED` | `SAFE_WITH_NEW_METHOD` | Prompt buyer for alternate card or PayPal balance |
| `CARD_EXPIRED` | Expired Card | `DECLINED` | `SAFE_WITH_NEW_METHOD` | Prompt buyer to update expiration or select active card |
| `INSUFFICIENT_FUNDS` | Insufficient Balance | `DECLINED` | `SAFE_WITH_NEW_METHOD` | Top up account or switch funding instrument |
| `PAYER_ACTION_REQUIRED` | 3D Secure / OTP Required | `INTERRUPTED` | `SAFE_TO_RETRY` | Buyer must complete bank SMS / biometric verification |
| `ORDER_NOT_APPROVED` | Incomplete Approval | `INTERRUPTED` | `SAFE_TO_RETRY` | Buyer must click "Approve" in PayPal window |
| `ORDER_ALREADY_CAPTURED` | Duplicate Capture Attempt | `COMPLETED` | `DO_NOT_RETRY` | Do not retry. Payment was already collected! |
| `ORDER_ALREADY_AUTHORIZED` | Pre-Authorized Order | `PENDING` | `VERIFY_FIRST` | Capture existing authorization hold |
| `PAYEE_ACCOUNT_RESTRICTED` | Merchant Account Locked | `FAILED` | `DO_NOT_RETRY` | Contact PayPal Merchant Support immediately |
| `MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED` | Attempt Limit Reached | `FAILED` | `DO_NOT_RETRY` | Create a brand new checkout order session |
| `INTERNAL_SERVER_ERROR` | PayPal Server Error | `FAILED` | `VERIFY_FIRST` | Check PayPal status page and verify order status |
| `SERVICE_UNAVAILABLE` | PayPal API Downtime | `FAILED` | `VERIFY_FIRST` | Wait briefly and verify order status before retry |
| `AUTHENTICATION_FAILURE` | Invalid Credentials (401) | `FAILED` | `DO_NOT_RETRY` | Fix PAYPAL_CLIENT_ID / SECRET in backend/.env |
| `PERMISSION_DENIED` | Missing API Scope (403) | `FAILED` | `DO_NOT_RETRY` | Review app permissions in PayPal Developer Portal |
| `NETWORK_TIMEOUT` | Dropped Connection | `INTERRUPTED` | `VERIFY_FIRST` | Query GET /v2/checkout/orders/{id} before retry |
| `BUYER_CANCELLED` | Abandoned Checkout | `CANCELLED` | `SAFE_TO_RETRY` | Re-open cart or send abandoned cart reminder |
| `PENDING_REVIEW` | eCheck / Fraud Hold | `PENDING` | `DO_NOT_RETRY` | Wait for settlement (do not ship merchandise yet) |
| `UNKNOWN_ERROR` | Unclassified Issue | `UNKNOWN` | `VERIFY_FIRST` | Inspect raw payload and verify order status |

---

## 5. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, PayPal JavaScript SDK.
- **Backend**: Node.js v24, Express.js, Native `node:sqlite` DatabaseSync.
- **AI Engine**: OpenAI API (`gpt-4o-mini`) with full deterministic rule-based fallback.
- **Database**: SQLite (`./data/transactions.db`).
- **Payment Gateway**: PayPal REST API (Sandbox).

---

## 6. Project Structure

```
Paypai_Hakathon/
├── package.json                          # Concurrently scripts
├── .env.example                          # Environment template
├── .gitignore
├── LICENSE                               # MIT License
├── README.md                             # Complete documentation
├── backend/
│   ├── package.json                      # Express & OpenAI dependencies
│   ├── .env.example
│   ├── .env                              # Active local environment
│   ├── server.js                         # Server entrypoint
│   └── src/
│       ├── config/
│       │   ├── env.js                    # PayPal & OpenAI environment flags
│       │   └── paypal.js                 # Status constants
│       ├── database/
│       │   ├── db.js                     # SQLite schema & ai_analyses migration
│       │   └── seed.js                   # Seed transactions
│       ├── services/
│       │   ├── aiService.js              # OpenAI integration, evidence prompt & fallback
│       │   ├── classificationService.js  # Deterministic PayPal error classifier
│       │   ├── recoveryService.js        # Recovery workflows & safety rules
│       │   ├── paypalService.js          # PayPal REST API OAuth & capture
│       │   └── transactionService.js     # Transactions CRUD & timeline
│       ├── controllers/
│       │   ├── transactionController.js  # Analysis, history, refresh, list, detail
│       │   ├── paypalController.js       # Order creation, capture, test scenarios
│       │   ├── dashboardController.js    # Metrics & failure cause analytics
│       │   └── healthController.js       # System & PayPal connection diagnostics
│       ├── routes/
│       │   ├── transactionRoutes.js      # /api/transactions/* (analyze, refresh, history)
│       │   ├── paypalRoutes.js           # /api/paypal/* (create, capture, simulate)
│       │   ├── dashboardRoutes.js        # /api/dashboard/*
│       │   └── index.js
│       ├── middleware/
│       │   ├── errorHandler.js
│       │   └── requestLogger.js
│       └── utils/
│           ├── logger.js
│           ├── idGenerator.js
│           └── paypalErrors.js
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── api/
        │   ├── client.js
        │   ├── transactionApi.js         # analyzeTransaction, getAnalysisHistory, refreshStatus
        │   ├── paypalApi.js
        │   └── dashboardApi.js
        ├── components/
        │   ├── checkout/
        │   │   └── CheckoutSimulatorModal.jsx # Real PayPal buttons + 8 Edge-Case Triggers
        │   ├── common/
        │   │   ├── StatusBadge.jsx
        │   │   ├── StatCard.jsx
        │   │   └── Modal.jsx
        │   └── layout/
        │       ├── Navbar.jsx
        │       ├── Sidebar.jsx
        │       └── Layout.jsx
        └── pages/
            ├── DashboardPage.jsx
            ├── TransactionsPage.jsx
            ├── TransactionDetailPage.jsx # AI Diagnostic Panel, Evidence Cards & History
            └── SettingsPage.jsx
```

---

## 7. Installation & Startup Instructions

### Single Command (Root):
```powershell
npm run dev
```
Starts backend API (`http://localhost:5000`) and frontend dashboard (`http://localhost:5173`) concurrently.

### Separate Terminals:
**Backend:**
```powershell
npm run start:backend
```
**Frontend:**
```powershell
npm run start:frontend
```

---

## 8. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/transactions/:id/analyze` | Generates AI Payment Failure & Recovery Analysis |
| `GET` | `/api/transactions/:id/analysis` | Retrieves latest analysis and historical snapshots |
| `POST` | `/api/transactions/:id/refresh` | Re-verifies live status directly with PayPal REST API |
| `GET` | `/api/transactions` | Lists transactions with pagination, search, and status filtering |
| `GET` | `/api/transactions/:id` | Fetches transaction audit details & event timeline |
| `POST` | `/api/paypal/create-order` | Creates PayPal order with intent `CAPTURE` |
| `POST` | `/api/paypal/capture-order` | Captures approved order with duplicate-capture protection |
| `POST` | `/api/paypal/simulate` | Triggers test scenarios (`DECLINE`, `EXPIRED_CARD`, `TIMEOUT`, etc.) |
| `GET` | `/api/dashboard/stats` | Aggregated metrics (totals, success rate, lost revenue) |
| `GET` | `/api/health` | Health, SQLite status, PayPal & OpenAI configuration check |

---

## 9. Demonstrating & Testing Phase 2

1. Open [http://localhost:5173](http://localhost:5173).
2. Go to **Transactions** or click **Test PayPal Checkout**.
3. In the Simulator modal, select **Sandbox Edge-Case Simulator**:
   - Click **Card Declined (422)** (`INSTRUMENT_DECLINED`)
   - Click **Expired Card** (`CARD_EXPIRED`)
   - Click **Already Captured** (`ORDER_ALREADY_CAPTURED`)
   - Click **Network Timeout** (`NETWORK_TIMEOUT`)
   - Click **Account Restricted** (`PAYEE_ACCOUNT_RESTRICTED`)
4. Open the generated transaction's **Details** page:
   - Click **Analyze Payment with AI**:
     - Inspect the **Retry Safety Guardrail Banner** (`SAFE_WITH_NEW_METHOD` vs `DO_NOT_RETRY`).
     - Review **Confirmed Facts** (verified from PayPal).
     - Review **Possible Causes** (plausible hypotheses without false certainty).
     - Review **Unknown Information** (what PayPal does not disclose).
     - Review **Recommended Merchant Action** and **Customer Action**.
     - Click **Copy Message** to copy the ready-to-send customer notification.
   - Click **Refresh PayPal Status** to query PayPal REST API and verify status in real time.
   - Inspect the **Analysis History** dropdown to review past analysis runs.

---

## License

MIT License — see [LICENSE](file:///LICENSE) for details.
