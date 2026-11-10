# Devpost Project Submission Content

> **Project Name:** Intelligent PayPal Payment Failure & Recovery  
> **Hackathon:** PayPal AI Hackathon  
> **Repository:** [https://github.com/sanelakshmidharreddy/Paypai_Hakathon](https://github.com/sanelakshmidharreddy/Paypai_Hakathon)

---

## 1. Project Title
**Intelligent PayPal Payment Failure & Recovery**

---

## 2. Project Tagline
*Transform cryptic PayPal declines into verified evidence, safety guardrails, and automated customer recovery workflows.*

---

## 3. Project Description
**Intelligent PayPal Payment Failure & Recovery** is a merchant-centric platform designed to solve one of the costliest pain points in e-commerce: abandoned and failed PayPal checkouts.

When a payment fails, merchants typically receive cryptic error codes (e.g., `INSTRUMENT_DECLINED`, `PAYER_ACTION_REQUIRED`, `ORDER_ALREADY_CAPTURED`). Merchants are left guessing whether the failure was caused by a bank block, an expired card, or customer hesitation. Many merchants blindly retry failed payments, causing duplicate billing or repeated declines that frustrate customers.

Our platform changes that by integrating directly with PayPal's REST APIs and Webhooks to extract ground truth. It classifies errors across 17 deterministic conditions, enforces retry safety rules (preventing double-charges on completed orders), and uses OpenAI (GPT-4o-mini) to provide an evidence-based explanation broken into:
- **Confirmed Facts**: What the PayPal API response explicitly proves.
- **Possible Causes**: Plausible hypotheses grounded in domain knowledge.
- **Unknown Information**: What banking privacy laws keep undisclosed.
- **Actionable Steps**: Clear next steps for the merchant and customer.
- **Ready-to-Send Communication**: A tailored message the merchant can copy and send directly to the buyer to recover the sale.

If the OpenAI API is unreachable, the system automatically falls back to an offline deterministic expert engine with zero downtime.

---

## 4. Problem Statement
E-commerce businesses lose 15–20% of revenue to abandoned checkouts and payment failures. Cryptic API error messages leave merchants without guidance. Misclassifying interrupted sessions as card declines or blindly retrying uncertain payments leads to customer churn, duplicate charges, and lost revenue.

---

## 5. Proposed Solution
An intelligent recovery application that:
- Executes server-verified PayPal checkout captures.
- Listens to verified PayPal webhooks with signature checks and idempotency.
- Enforces strict financial retry safety guardrails.
- Uses OpenAI `gpt-4o-mini` with strict factual boundaries to explain failures and generate recovery messages.
- Provides merchants with a filterable dashboard tracking revenue at risk and recovery opportunities.

---

## 6. Key Features
- **PayPal Sandbox Checkout**: Real PayPal JavaScript SDK buttons with backend order creation and capture.
- **Secure Webhooks**: Listens to 6 key events with cryptographic signature verification and duplicate event rejection.
- **Evidence-Based AI Explanations**: Plain-English breakdown into Confirmed Facts, Possible Causes, and Unknowns.
- **Retry Safety Guardrails**: Flags whether retrying is safe (`SAFE_WITH_NEW_METHOD`), dangerous (`DO_NOT_RETRY`), or requires status verification (`VERIFY_FIRST`).
- **One-Click Customer Messages**: Pre-drafted recovery communications ready to send to buyers.
- **Offline Deterministic Fallback**: Automatic expert rule analysis if OpenAI is unconfigured.
- **Filterable Dashboard**: Real-time KPIs with filters for status, date range, and failure categories.
- **Integrated Test Simulator**: 8 one-click scenarios to demonstrate bank declines, expired cards, timeouts, and duplicate captures.

---

## 7. Innovation and Impact
Unlike generic chatbots that hallucinate reasons for payment failures, our engine is bounded by verified API response data. It respects customer privacy by acknowledging what is unknown, enforces double-billing protection, and provides merchants with an immediate revenue recovery workflow.

---

## 8. Technical Details
- **Live Demo URL**: `[INSERT_YOUR_VERCEL_FRONTEND_URL_HERE]`
- **Public GitHub Repository**: [https://github.com/sanelakshmidharreddy/Paypai_Hakathon](https://github.com/sanelakshmidharreddy/Paypai_Hakathon)
- **AI Model**: OpenAI `gpt-4o-mini` via official `openai` SDK.
- **Deterministic Rules vs. AI**:
  - *Deterministic*: Error classification (17 conditions), outcome categorization, duplicate capture prevention, retry safety guardrails, webhook signature verification.
  - *AI (GPT-4o-mini)*: Synthesizing the evidence triad, contextual explanations, and empathetic customer recovery messaging.
