# Demo Video Script (< 3 Minutes)

> **Target Duration:** 2 Minutes 40 Seconds  
> **Platform:** YouTube (Public or Unlisted)  
> **Hackathon:** PayPal AI Hackathon

---

## YouTube Video Metadata

- **Title**: Intelligent PayPal Payment Failure & Recovery — PayPal AI Hackathon Demo
- **Description**: Demonstration of the Intelligent PayPal Payment Failure & Recovery platform for the PayPal AI Hackathon. Features real PayPal Sandbox checkout, secure webhooks, deterministic error classification, and evidence-grounded AI recovery recommendations using OpenAI GPT-4o-mini.
- **Suggested Thumbnail Text**: "Fixing Failed PayPal Checkouts with AI | PayPal AI Hackathon"

---

## Timed Video Script (2 Minutes 40 Seconds)

| Timestamp | Screen / Visual Action | Spoken Narration |
|---|---|---|
| **0:00 – 0:20** *(20s)* | Open merchant **Dashboard** displaying live KPI cards, success rate, and recent transactions. | *"Every day, online merchants lose thousands of dollars to failed PayPal checkouts. But when a payment fails, merchants are left with cryptic error codes like `INSTRUMENT_DECLINED` with no idea what happened or how to recover the sale. Welcome to the **Intelligent PayPal Payment Failure & Recovery Platform**, built for the PayPal AI Hackathon."* |
| **0:20 – 0:45** *(25s)* | Click **"Test PayPal Checkout"**. Show the modal with official PayPal buttons. | *"Our application implements a real, production-grade PayPal Sandbox integration. Let's run a live purchase. I'll click the official PayPal button powered by the PayPal JavaScript SDK. The backend generates a secure Order ID with intent `CAPTURE`. I log in with a Sandbox Personal Buyer account and click 'Pay Now'. The backend captures the order, validates the status server-side, and stores the record in SQLite."* |
| **0:45 – 1:15** *(30s)* | Open the Checkout Simulator modal &rarr; select **"Card Declined (422)"** or run a live decline. Show the failed transaction. | *"Now let's see what happens during a payment failure. Using our integrated Sandbox Simulator, let's trigger an `INSTRUMENT_DECLINED` scenario. The backend communicates with PayPal and receives an HTTP 422 Unprocessable Entity. Notice how our platform handles this: it doesn't crash, it doesn't blindly retry, and it doesn't misclassify it as an abandoned checkout. It logs the exact PayPal issue code, capture ID, and debug ID into an audit event timeline."* |
| **1:15 – 1:55** *(40s)* | Open the **Transaction Details** page. Click **"Analyze Payment with AI"**. | *"Let's click 'Analyze Payment with AI'. Our backend evaluates the transaction through our deterministic error engine and synthesizes it with OpenAI's `gpt-4o-mini`. Look at how the results are presented: First, a prominent **Retry Safety Banner** warns that retrying with the same card is unsafe, but trying another payment method is safe. Next, our **Evidence Triad**: Confirmed Facts directly verified from PayPal; Possible Causes like daily limits or bank holds; and crucially, Unknown Information—what banking privacy laws keep hidden. We never invent fake reasons."* |
| **1:55 – 2:15** *(20s)* | Scroll to the **"Customer Message"** section and click **"Copy Message"**. | *"Next, the system gives the merchant an immediate recovery action: a pre-formatted, customer-friendly message. With one click, the merchant can copy this text and send it to the buyer: 'Your card was declined by the issuer. To complete your purchase, please select an alternate card in your PayPal wallet.' This turns an abandoned checkout into a recovered sale."* |
| **2:15 – 2:30** *(15s)* | Click **"Refresh PayPal Status"** button and open the **Settings** page. | *"We also support live status synchronization with the PayPal REST API and secure webhook handling with signature verification and idempotency protection to prevent duplicate event processing. If the AI API is ever offline, our deterministic expert engine runs automatically with zero downtime."* |
| **2:30 – 2:40** *(10s)* | Return to the **Dashboard** showing updated revenue at risk and recovered sales. | *"By combining verified PayPal data with evidence-grounded AI, we help merchants recover lost sales safely and intelligently. Thank you!"* |

---

## Recording Checklist

- [ ] Browser window resolution: 1920x1080 (1080p).
- [ ] Zoom level set to 100% or 110% for clear text visibility.
- [ ] Clean browser window (hide bookmarks bar, close personal tabs).
- [ ] Quiet recording environment with good microphone audio.
- [ ] Ensure video length is **under 3 minutes** (script targets ~2m 40s).
