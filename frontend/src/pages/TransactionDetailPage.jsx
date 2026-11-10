import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  Copy, 
  Check, 
  Sparkles,
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  EyeOff,
  ShieldCheck, 
  ShieldAlert,
  ChevronDown, 
  ChevronUp, 
  History,
  Send,
  Info,
  Clock,
  Ban
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AlertBanner from '../components/common/AlertBanner';
import { transactionApi } from '../api/transactionApi';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function TransactionDetailPage({ transactionId, onBack }) {
  const [transaction, setTransaction] = useState(null);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);

  const [copiedField, setCopiedField] = useState(null);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  async function loadDetails() {
    try {
      setLoading(true);
      setError(null);
      const res = await transactionApi.getTransactionDetails(transactionId);
      setTransaction(res.transaction);
      setLatestAnalysis(res.latestAnalysis);
      setSelectedAnalysis(res.latestAnalysis);
      setAnalysisHistory(res.analysisHistory || []);
    } catch (err) {
      setError(err.message || 'Failed to load transaction audit details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [transactionId]);

  // Trigger AI Payment Failure Analysis
  async function handleAnalyze() {
    try {
      setAnalyzing(true);
      setError(null);
      const res = await transactionApi.analyzeTransaction(transactionId);
      setSelectedAnalysis(res.analysis);
      setLatestAnalysis(res.analysis);
      setTransaction(res.transaction);
      
      // Refresh history list
      const histRes = await transactionApi.getAnalysisHistory(transactionId);
      setAnalysisHistory(histRes.history || []);
      
      setSyncResult({
        type: 'success',
        title: 'Analysis Generated',
        message: `Payment analysis completed via ${res.analysis.source === 'OPENAI' ? 'OpenAI GPT-4o-mini' : 'Deterministic Expert Engine'}.`,
      });
    } catch (err) {
      setError(err.message || 'Failed to execute payment analysis.');
    } finally {
      setAnalyzing(false);
    }
  }

  // Refresh live status from PayPal REST API
  async function handleRefreshStatus() {
    try {
      setRefreshing(true);
      setSyncResult(null);
      const res = await transactionApi.refreshStatus(transactionId);
      setTransaction(res.transaction);
      setSyncResult({
        type: res.success ? 'success' : 'warning',
        title: 'PayPal Status Check',
        message: res.message || `PayPal order verified as ${res.liveStatus}.`,
      });
    } catch (err) {
      setSyncResult({
        type: 'error',
        title: 'Status Check Failed',
        message: err.message || 'Could not verify status with PayPal API.',
      });
    } finally {
      setRefreshing(false);
    }
  }

  function copyText(text, fieldName) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }

  if (loading) {
    return <LoadingSpinner message="Loading transaction audit details..." size="lg" />;
  }

  if (error && !transaction) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Transactions</span>
        </button>
        <AlertBanner
          type="error"
          title="Transaction Not Found"
          message={error || `Could not find transaction with ID: ${transactionId}`}
        />
      </div>
    );
  }

  const analysis = selectedAnalysis || latestAnalysis;

  // Retry safety badge and styling
  function getRetrySafetyStyle(safety) {
    switch (safety) {
      case 'SAFE_WITH_NEW_METHOD':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: ShieldCheck,
          label: 'SAFE WITH NEW PAYMENT METHOD',
        };
      case 'SAFE_TO_RETRY':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: ShieldCheck,
          label: 'SAFE TO RETRY CHECKOUT',
        };
      case 'VERIFY_FIRST':
        return {
          bg: 'bg-amber-50 text-amber-900 border-amber-200',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: AlertTriangle,
          label: 'VERIFY WITH PAYPAL BEFORE RETRY',
        };
      case 'DO_NOT_RETRY':
        return {
          bg: 'bg-rose-50 text-rose-900 border-rose-200',
          badge: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: ShieldAlert,
          label: 'DO NOT RETRY (HAZARD / FINALIZED)',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-800 border-slate-200',
          badge: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: Info,
          label: 'NOT APPLICABLE',
        };
    }
  }

  const safetyStyle = analysis ? getRetrySafetyStyle(analysis.retry_safety) : null;
  const SafetyIcon = safetyStyle?.icon;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Transactions</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Refresh PayPal Status button */}
          <button
            onClick={handleRefreshStatus}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh PayPal Status</span>
          </button>

          {/* Analyze Payment button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01]"
          >
            <Sparkles className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            <span>{analyzing ? 'Analyzing with AI...' : analysis ? 'Re-Analyze with AI' : 'Analyze Payment'}</span>
          </button>
        </div>
      </div>

      {syncResult && (
        <AlertBanner
          type={syncResult.type}
          title={syncResult.title}
          message={syncResult.message}
          onClose={() => setSyncResult(null)}
        />
      )}

      {/* Transaction Summary Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
              {transaction.id}
            </h1>
            <StatusBadge status={transaction.payment_status} size="lg" />
          </div>
          <p className="text-xs text-slate-500">
            Recorded {formatDate(transaction.created_at)} • PayPal Order:{' '}
            <span className="font-mono font-medium text-slate-700">{transaction.paypal_order_id}</span>
          </p>
        </div>

        <div className="text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
          <div className="text-xs font-medium text-slate-400">Total Transaction Amount</div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(transaction.amount, transaction.currency)}
          </div>
        </div>
      </div>

      {/* AI ANALYSIS & RECOVERY PANEL */}
      {analysis ? (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-md shadow-indigo-500/5 p-6 space-y-6">
          {/* AI Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    AI Payment Failure & Recovery Analysis
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                    analysis.source === 'OPENAI'
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {analysis.source === 'OPENAI' ? 'OpenAI GPT-4o-mini' : 'Deterministic Rule Engine'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Generated {formatDate(analysis.created_at)} • Classification:{' '}
                  <span className="font-mono font-semibold text-slate-700">{analysis.error_classification}</span>
                </div>
              </div>
            </div>

            {/* Confidence & History Selection */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                analysis.confidence_level === 'HIGH'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : analysis.confidence_level === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                CONFIDENCE: {analysis.confidence_level}
              </span>

              {analysisHistory.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>History ({analysisHistory.length})</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showHistoryDropdown && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-20 space-y-1 text-xs">
                      <div className="px-2 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                        Previous Analysis Snapshots
                      </div>
                      {analysisHistory.map((item, i) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedAnalysis(item);
                            setShowHistoryDropdown(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between ${
                            selectedAnalysis?.id === item.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <div>{item.source} ({item.error_classification})</div>
                            <div className="text-[10px] text-slate-400">{formatDate(item.created_at)}</div>
                          </div>
                          {selectedAnalysis?.id === item.id && <Check className="w-4 h-4 text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {analysis.fallback_reason && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Deterministic Fallback Mode Active:</span> {analysis.fallback_reason}
              </div>
            </div>
          )}

          {/* RETRY SAFETY GUARDRAIL BANNER */}
          {safetyStyle && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${safetyStyle.bg}`}>
              <SafetyIcon className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${safetyStyle.badge}`}>
                    {safetyStyle.label}
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium opacity-90">
                  {analysis.retry_safety_reason}
                </div>
              </div>
            </div>
          )}

          {/* SECTION: WHAT HAPPENED & LIKELY CAUSE */}
          <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. What Happened?
            </h3>
            <p className="text-sm font-medium text-slate-900 leading-relaxed">
              {analysis.explanation}
            </p>
            {analysis.likely_reason && (
              <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Likely Reason:</span> {analysis.likely_reason}
              </div>
            )}
          </div>

          {/* SECTION: THREE EVIDENCE CATEGORIES */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              2. Evidence Breakdown (Strictly Categorized)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Confirmed Facts */}
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Confirmed Facts</span>
                </div>
                <div className="text-[11px] text-emerald-700">
                  Directly verified from PayPal response:
                </div>
                <ul className="space-y-1.5 pt-1 text-slate-700 list-disc list-inside">
                  {analysis.confirmed_facts && analysis.confirmed_facts.length > 0 ? (
                    analysis.confirmed_facts.map((fact, idx) => (
                      <li key={idx} className="leading-snug">{fact}</li>
                    ))
                  ) : (
                    <li className="text-slate-400">No specific confirmed facts recorded.</li>
                  )}
                </ul>
              </div>

              {/* Possible Causes */}
              <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Possible Causes</span>
                </div>
                <div className="text-[11px] text-amber-700">
                  Plausible hypotheses (not bank-confirmed):
                </div>
                <ul className="space-y-1.5 pt-1 text-slate-700 list-disc list-inside">
                  {analysis.possible_explanations && analysis.possible_explanations.length > 0 ? (
                    analysis.possible_explanations.map((cause, idx) => (
                      <li key={idx} className="leading-snug">{cause}</li>
                    ))
                  ) : (
                    <li className="text-slate-400">No alternate hypotheses identified.</li>
                  )}
                </ul>
              </div>

              {/* Unknown Information */}
              <div className="bg-slate-100/70 rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <EyeOff className="w-4 h-4 text-slate-500" />
                  <span>Unknown Information</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Information PayPal does NOT disclose:
                </div>
                <ul className="space-y-1.5 pt-1 text-slate-600 list-disc list-inside">
                  {analysis.unknown_information && analysis.unknown_information.length > 0 ? (
                    analysis.unknown_information.map((item, idx) => (
                      <li key={idx} className="leading-snug">{item}</li>
                    ))
                  ) : (
                    <li className="text-slate-400">All standard parameters were established.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION: ACTIONS (MERCHANT & CUSTOMER) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Merchant Action */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Recommended Merchant Action</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">
                {analysis.merchant_action}
              </p>
            </div>

            {/* Customer Action */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-indigo-900">
                <Send className="w-4 h-4 text-indigo-600" />
                <span>Recommended Customer Action</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">
                {analysis.customer_action}
              </p>
            </div>
          </div>

          {/* SECTION: READY-TO-SEND CUSTOMER MESSAGE */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                Customer Communication Template (Ready to Send)
              </span>
              <button
                onClick={() => copyText(analysis.customer_message, 'customerMessage')}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
              >
                {copiedField === 'customerMessage' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Message</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-[11px] leading-relaxed">
              "{analysis.customer_message}"
            </div>
          </div>
        </div>
      ) : (
        /* Inviting callout when analysis has not yet run */
        <div className="p-6 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-500 mx-auto" />
          <div className="text-sm font-bold text-slate-900">
            No AI Payment Analysis Generated Yet
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Generate an evidence-backed root cause explanation, confirmed vs unknown breakdown, retry safety guardrail, and tailored customer recovery message.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            {analyzing ? 'Analyzing with AI...' : 'Run Payment Analysis'}
          </button>
        </div>
      )}

      {/* Two-Column Grid: Transaction Info & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: PayPal Metadata */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900">
            PayPal Transaction Metadata
          </h2>

          <div className="space-y-4 divide-y divide-slate-100 text-xs">
            <div className="pt-2 flex items-center justify-between">
              <span className="text-slate-400 font-medium">Internal Transaction ID</span>
              <div className="flex items-center gap-2 font-mono font-semibold text-slate-800">
                <span>{transaction.id}</span>
                <button
                  onClick={() => copyText(transaction.id, 'id')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-slate-400 font-medium">PayPal Order ID</span>
              <div className="flex items-center gap-2 font-mono font-semibold text-slate-800">
                <span>{transaction.paypal_order_id}</span>
                <button
                  onClick={() => copyText(transaction.paypal_order_id, 'orderId')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  {copiedField === 'orderId' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-slate-400 font-medium">PayPal Capture ID</span>
              <span className="font-mono font-semibold text-slate-800">
                {transaction.paypal_capture_id || '—'}
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-slate-400 font-medium">PayPal REST Status</span>
              <span className="font-mono font-semibold text-slate-800">
                {transaction.paypal_status || '—'}
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-slate-400 font-medium">Payer Name</span>
              <span className="font-semibold text-slate-800">
                {transaction.payer_name || '—'}
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-slate-400 font-medium">Payer Email</span>
              <span className="font-semibold text-slate-800">
                {transaction.payer_email || '—'}
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-slate-400 font-medium">Payer ID</span>
              <span className="font-mono text-slate-800">
                {transaction.payer_id || '—'}
              </span>
            </div>

            {transaction.customer_notes && (
              <div className="pt-3">
                <span className="text-slate-400 font-medium block mb-1">Customer / Internal Notes</span>
                <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {transaction.customer_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Transaction Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Audit Event Timeline
            </h2>
            <span className="text-xs text-slate-400">
              {transaction.timeline?.length || 0} events
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {transaction.timeline && transaction.timeline.length > 0 ? (
              transaction.timeline.map((evt, idx) => {
                const isError = evt.status === 'error';
                const isSuccess = evt.status === 'success';
                const isWarning = evt.status === 'warning';

                const dotColor = isError
                  ? 'bg-rose-500 ring-rose-100'
                  : isSuccess
                  ? 'bg-emerald-500 ring-emerald-100'
                  : isWarning
                  ? 'bg-amber-500 ring-amber-100'
                  : 'bg-indigo-500 ring-indigo-100';

                return (
                  <div key={idx} className="relative group">
                    <span
                      className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${dotColor} ring-4 transition-transform group-hover:scale-125`}
                    />
                    <div className="text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                        <span className="font-mono font-semibold">{evt.type}</span>
                        <span>{formatDate(evt.timestamp)}</span>
                      </div>
                      <div className="font-semibold text-slate-800 text-sm">{evt.title}</div>
                      {evt.details && Object.keys(evt.details).length > 0 && (
                        <div className="mt-1 text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 font-mono">
                          {Object.entries(evt.details).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-slate-400">{k}:</span> {String(v)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-slate-400 text-xs py-4">No timeline events recorded.</div>
            )}
          </div>
        </div>
      </div>

      {/* Raw Payload Accordion */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowRawPayload(!showRawPayload)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Raw PayPal API Response Payload
            </span>
            <span className="text-[11px] text-slate-400">
              (Audit & AI Evidence Source)
            </span>
          </div>
          {showRawPayload ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showRawPayload && (
          <div className="p-6 bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto border-t border-slate-200">
            <pre className="max-h-96">
              {JSON.stringify(transaction.raw_paypal_response || { message: 'No raw payload recorded for this transaction.' }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
