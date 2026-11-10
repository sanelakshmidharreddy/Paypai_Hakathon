/**
 * Intelligent Recovery Recommendation Engine
 * Applies deterministic business safety rules to produce merchant & customer recovery workflows.
 * Guarantees that:
 * 1. AI cannot change actual transaction status.
 * 2. No automatic retries, duplicate captures, or blind cancellations occur.
 * 3. Recovery guidance aligns with verified PayPal financial state.
 */

const { RETRY_SAFETY } = require('./classificationService');

function generateRecoveryPlan(classification, transaction) {
  const code = classification.classification;

  // Base recovery object
  const recoveryPlan = {
    classification: code,
    outcome: classification.outcome,
    retrySafety: classification.retrySafety,
    retrySafetyReason: classification.retrySafetyReason,
    merchantNextStep: classification.merchantAction,
    customerNextStep: classification.customerAction,
    customerMessageTemplate: classification.customerMessage,
    actionRequiredBy: 'NONE', // 'MERCHANT' | 'CUSTOMER' | 'BOTH' | 'NONE'
    recoveryStrategy: 'STANDARD', // 'PAYMENT_SWITCH' | 'AUTHENTICATION' | 'WAIT_CLEARANCE' | 'MERCHANT_FIX' | 'NO_RETRY'
    urgency: 'MEDIUM', // 'LOW' | 'MEDIUM' | 'HIGH'
  };

  switch (code) {
    case 'INSTRUMENT_DECLINED':
      recoveryPlan.actionRequiredBy = 'CUSTOMER';
      recoveryPlan.recoveryStrategy = 'PAYMENT_SWITCH';
      recoveryPlan.urgency = 'HIGH';
      break;

    case 'CARD_EXPIRED':
      recoveryPlan.actionRequiredBy = 'CUSTOMER';
      recoveryPlan.recoveryStrategy = 'PAYMENT_SWITCH';
      recoveryPlan.urgency = 'HIGH';
      break;

    case 'INSUFFICIENT_FUNDS':
      recoveryPlan.actionRequiredBy = 'CUSTOMER';
      recoveryPlan.recoveryStrategy = 'PAYMENT_SWITCH';
      recoveryPlan.urgency = 'HIGH';
      break;

    case 'PAYER_ACTION_REQUIRED':
      recoveryPlan.actionRequiredBy = 'CUSTOMER';
      recoveryPlan.recoveryStrategy = 'AUTHENTICATION';
      recoveryPlan.urgency = 'HIGH';
      break;

    case 'ORDER_NOT_APPROVED':
      recoveryPlan.actionRequiredBy = 'CUSTOMER';
      recoveryPlan.recoveryStrategy = 'AUTHENTICATION';
      recoveryPlan.urgency = 'MEDIUM';
      break;

    case 'ORDER_ALREADY_CAPTURED':
      recoveryPlan.actionRequiredBy = 'MERCHANT';
      recoveryPlan.recoveryStrategy = 'NO_RETRY';
      recoveryPlan.urgency = 'LOW';
      break;

    case 'PENDING_REVIEW':
      recoveryPlan.actionRequiredBy = 'MERCHANT';
      recoveryPlan.recoveryStrategy = 'WAIT_CLEARANCE';
      recoveryPlan.urgency = 'MEDIUM';
      break;

    case 'PAYEE_ACCOUNT_RESTRICTED':
      recoveryPlan.actionRequiredBy = 'MERCHANT';
      recoveryPlan.recoveryStrategy = 'MERCHANT_FIX';
      recoveryPlan.urgency = 'HIGH';
      break;

    case 'NETWORK_TIMEOUT':
      recoveryPlan.actionRequiredBy = 'MERCHANT';
      recoveryPlan.recoveryStrategy = 'VERIFY_STATUS';
      recoveryPlan.urgency = 'HIGH';
      break;

    case 'BUYER_CANCELLED':
      recoveryPlan.actionRequiredBy = 'CUSTOMER';
      recoveryPlan.recoveryStrategy = 'ABANDONED_CART_RECOVERY';
      recoveryPlan.urgency = 'LOW';
      break;

    case 'AUTHENTICATION_FAILURE':
    case 'PERMISSION_DENIED':
      recoveryPlan.actionRequiredBy = 'MERCHANT';
      recoveryPlan.recoveryStrategy = 'MERCHANT_FIX';
      recoveryPlan.urgency = 'HIGH';
      break;

    default:
      recoveryPlan.actionRequiredBy = 'MERCHANT';
      recoveryPlan.recoveryStrategy = 'INVESTIGATE';
      recoveryPlan.urgency = 'MEDIUM';
      break;
  }

  return recoveryPlan;
}

module.exports = {
  generateRecoveryPlan,
};

