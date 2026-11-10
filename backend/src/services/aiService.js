const OpenAI = require('openai');
const config = require('../config/env');
const db = require('../database/db');
const logger = require('../utils/logger');
const { generateEventId } = require('../utils/idGenerator');
const { classifyTransaction } = require('./classificationService');
const { generateRecoveryPlan } = require('./recoveryService');

/**
 * Initialize OpenAI client if API key is provided
 */
let openaiClient = null;
if (config.openai.apiKey) {
  openaiClient = new OpenAI({
    apiKey: config.openai.apiKey,
  });
}

/**
 * Build deterministic baseline analysis (used directly or as fallback)
 */
function buildDeterministicAnalysis(transaction, classification, recoveryPlan, fallbackReason = null) {
  const analysisId = `analysis_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id: analysisId,
    transaction_id: transaction.id,
    error_classification: classification.classification,
    explanation: classification.title + ': ' + (transaction.error_message || classification.confirmedFacts[0] || 'Payment could not be completed.'),
    likely_reason: classification.possibleExplanations.length > 0 ? classification.possibleExplanations[0] : null,
    confirmed_facts: classification.confirmedFacts,
    possible_explanations: classification.possibleExplanations,
    unknown_information: classification.unknownInformation,
    confidence_level: classification.confidenceLevel,
    merchant_action: recoveryPlan.merchantNextStep,
    customer_action: recoveryPlan.customerNextStep,
    retry_safety: recoveryPlan.retrySafety,
    retry_safety_reason: recoveryPlan.retrySafetyReason,
    customer_message: recoveryPlan.customerMessageTemplate,
    model_used: null,
    source: fallbackReason ? 'DETERMINISTIC_FALLBACK' : 'DETERMINISTIC_ENGINE',
    fallback_reason: fallbackReason,
    created_at: new Date().toISOString(),
  };
}

/**
 * Perform AI Payment Failure & Recovery Analysis
 * Combines deterministic rule verification with LLM synthesis, backed by instant offline fallback
 */
async function analyzeTransaction(transaction) {
  if (!transaction) {
    throw new Error('Transaction record is required for analysis.');
  }

  // 1. Run deterministic classification and safety plan first
  const classification = classifyTransaction(transaction);
  const recoveryPlan = generateRecoveryPlan(classification, transaction);

  // 2. Check if OpenAI is available
  if (!config.openai.apiKey || !openaiClient) {
    logger.info(`OpenAI API key not set. Using deterministic rule-based analysis for transaction ${transaction.id}.`);
    const fallback = buildDeterministicAnalysis(
      transaction,
      classification,
      recoveryPlan,
      'OpenAI API key is not configured in backend/.env. Using deterministic PayPal expert analysis.'
    );
    saveAnalysisToDatabase(fallback);
    return fallback;
  }

  // 3. Attempt OpenAI analysis with strictly bounded prompt
  try {
    logger.info(`Requesting OpenAI analysis for transaction ${transaction.id} (Classification: ${classification.classification})...`);

    const systemPrompt = `You are the PayPal Payment Failure & Recovery Intelligence Assistant for an online merchant dashboard.
Your job is to explain payment transactions, failure codes, and recovery steps based STRICTLY on actual verified evidence.

CORE PRINCIPLES (NEVER VIOLATE):
1. Explain actual transaction information and evidence; DO NOT invent payment failure reasons.
2. DO NOT claim to know the customer's bank's exact internal reason unless explicitly established in the PayPal response.
3. Categorize evidence cleanly into:
   - CONFIRMED: Directly supported by the PayPal API response data.
   - POSSIBLE: Reasonable hypotheses based on domain context, clearly stated as possibilities without false certainty.
   - UNKNOWN: Information that PayPal does NOT disclose (e.g. customer's exact bank balance, card account status).
4. Do not invent confidence percentages. Use one of three confidence levels: HIGH, MEDIUM, LOW.
5. Provide actionable, safe merchant and customer next steps.
6. Check retry safety:
   - If payment already captured -> DO_NOT_RETRY (double-charge hazard)
   - If instrument declined -> SAFE_WITH_NEW_METHOD (must use different card/wallet balance)
   - If network timeout or pending review -> VERIFY_FIRST (must check PayPal status first)
   - If customer cancelled -> SAFE_TO_RETRY (safe to re-open checkout)

You must respond in valid JSON matching this schema:
{
  "explanation": "Simple, clear 2-3 sentence overview of what happened",
  "likely_reason": "Most plausible cause based on the evidence",
  "confirmed_facts": ["Fact 1 verified from PayPal", "Fact 2"],
  "possible_explanations": ["Plausible hypothesis 1", "Plausible hypothesis 2"],
  "unknown_information": ["Specific detail that PayPal did not disclose"],
  "confidence_level": "HIGH" | "MEDIUM" | "LOW",
  "merchant_action": "Clear operational next step for the merchant",
  "customer_action": "Clear instruction the customer should follow",
  "retry_safety": "SAFE_WITH_NEW_METHOD" | "DO_NOT_RETRY" | "VERIFY_FIRST" | "SAFE_TO_RETRY" | "NOT_APPLICABLE",
  "retry_safety_reason": "Clear explanation of why retrying is or is not safe",
  "customer_message": "A professional, empathetic message the merchant can copy and send directly to the customer"
}`;

    const userPrompt = JSON.stringify({
      transaction: {
        id: transaction.id,
        paypal_order_id: transaction.paypal_order_id,
        paypal_capture_id: transaction.paypal_capture_id,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_status: transaction.payment_status,
        paypal_status: transaction.paypal_status,
        error_code: transaction.error_code,
        error_message: transaction.error_message,
        payer_email: transaction.payer_email,
        payer_name: transaction.payer_name,
        created_at: transaction.created_at,
      },
      deterministic_baseline: {
        classification: classification.classification,
        outcome: classification.outcome,
        baseline_facts: classification.confirmedFacts,
        baseline_possible: classification.possibleExplanations,
        baseline_unknown: classification.unknownInformation,
        baseline_retry_safety: classification.retrySafety,
        baseline_retry_reason: classification.retrySafetyReason,
      },
      raw_paypal_response: transaction.raw_paypal_response || null,
    }, null, 2);

    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for deterministic, factual consistency
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    const parsed = JSON.parse(content);

    const analysisId = `analysis_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    const validConfidence = ['HIGH', 'MEDIUM', 'LOW'].includes(parsed.confidence_level)
      ? parsed.confidence_level
      : classification.confidenceLevel;

    const validRetrySafety = [
      'SAFE_WITH_NEW_METHOD',
      'DO_NOT_RETRY',
      'VERIFY_FIRST',
      'SAFE_TO_RETRY',
      'NOT_APPLICABLE',
    ].includes(parsed.retry_safety)
      ? parsed.retry_safety
      : recoveryPlan.retrySafety;

    const analysis = {
      id: analysisId,
      transaction_id: transaction.id,
      error_classification: classification.classification,
      explanation: parsed.explanation || classification.title,
      likely_reason: parsed.likely_reason || classification.possibleExplanations[0] || null,
      confirmed_facts: Array.isArray(parsed.confirmed_facts) && parsed.confirmed_facts.length > 0
        ? parsed.confirmed_facts
        : classification.confirmedFacts,
      possible_explanations: Array.isArray(parsed.possible_explanations)
        ? parsed.possible_explanations
        : classification.possibleExplanations,
      unknown_information: Array.isArray(parsed.unknown_information) && parsed.unknown_information.length > 0
        ? parsed.unknown_information
        : classification.unknownInformation,
      confidence_level: validConfidence,
      merchant_action: parsed.merchant_action || recoveryPlan.merchantNextStep,
      customer_action: parsed.customer_action || recoveryPlan.customerNextStep,
      retry_safety: validRetrySafety,
      retry_safety_reason: parsed.retry_safety_reason || recoveryPlan.retrySafetyReason,
      customer_message: parsed.customer_message || recoveryPlan.customerMessageTemplate,
      model_used: 'gpt-4o-mini',
      source: 'OPENAI',
      fallback_reason: null,
      created_at: new Date().toISOString(),
    };

    logger.success(`OpenAI analysis completed successfully for transaction ${transaction.id}.`);
    saveAnalysisToDatabase(analysis);
    return analysis;
  } catch (err) {
    logger.warn(`OpenAI call failed (${err.message}); falling back to deterministic analysis.`);
    const fallback = buildDeterministicAnalysis(
      transaction,
      classification,
      recoveryPlan,
      `AI service temporarily unavailable (${err.message}). Deterministic PayPal expert analysis displayed.`
    );
    saveAnalysisToDatabase(fallback);
    return fallback;
  }
}

/**
 * Save analysis to SQLite database and link to transaction
 */
function saveAnalysisToDatabase(analysis) {
  try {
    const stmt = db.prepare(`
      INSERT INTO ai_analyses (
        id, transaction_id, error_classification, explanation, likely_reason,
        confirmed_facts, possible_explanations, unknown_information, confidence_level,
        merchant_action, customer_action, retry_safety, retry_safety_reason,
        customer_message, model_used, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      analysis.id,
      analysis.transaction_id,
      analysis.error_classification,
      analysis.explanation,
      analysis.likely_reason,
      JSON.stringify(analysis.confirmed_facts || []),
      JSON.stringify(analysis.possible_explanations || []),
      JSON.stringify(analysis.unknown_information || []),
      analysis.confidence_level,
      analysis.merchant_action,
      analysis.customer_action,
      analysis.retry_safety,
      analysis.retry_safety_reason,
      analysis.customer_message,
      analysis.model_used,
      analysis.source,
      analysis.created_at
    );

    // Update parent transaction record
    const updateTxnStmt = db.prepare(`
      UPDATE transactions SET
        ai_analysis_status = 'analyzed',
        ai_analysis_summary = ?,
        ai_recovery_recommendation = ?,
        ai_merchant_action = ?,
        latest_analysis_id = ?,
        updated_at = ?
      WHERE id = ?
    `);

    const now = new Date().toISOString();
    updateTxnStmt.run(
      analysis.explanation,
      analysis.merchant_action,
      analysis.merchant_action,
      analysis.id,
      now,
      analysis.transaction_id
    );

    // Append to timeline
    const txn = db.prepare(`SELECT timeline FROM transactions WHERE id = ?`).get(analysis.transaction_id);
    let timeline = [];
    try {
      timeline = txn?.timeline ? JSON.parse(txn.timeline) : [];
    } catch {
      timeline = [];
    }

    timeline.push({
      id: generateEventId(),
      timestamp: now,
      type: 'AI_ANALYSIS_COMPLETED',
      title: `AI Payment Failure Analysis Generated (${analysis.source})`,
      details: {
        analysisId: analysis.id,
        classification: analysis.error_classification,
        retrySafety: analysis.retry_safety,
        confidence: analysis.confidence_level,
      },
      status: 'info',
    });

    db.prepare(`UPDATE transactions SET timeline = ? WHERE id = ?`).run(
      JSON.stringify(timeline),
      analysis.transaction_id
    );

    logger.info(`Persisted analysis ${analysis.id} to SQLite for transaction ${analysis.transaction_id}`);
  } catch (err) {
    logger.error('Failed to save analysis to SQLite:', err);
  }
}

/**
 * Retrieve latest and historical analyses for a transaction
 */
function getAnalysisHistory(transactionId) {
  const stmt = db.prepare(`
    SELECT * FROM ai_analyses
    WHERE transaction_id = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(transactionId);

  return rows.map((row) => ({
    ...row,
    confirmed_facts: safeJsonParse(row.confirmed_facts),
    possible_explanations: safeJsonParse(row.possible_explanations),
    unknown_information: safeJsonParse(row.unknown_information),
  }));
}

function safeJsonParse(val) {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [val];
  }
}

module.exports = {
  analyzeTransaction,
  getAnalysisHistory,
};

