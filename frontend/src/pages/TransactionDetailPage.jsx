import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  CreditCard,
  Ban,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AlertBanner from '../components/common/AlertBanner';
import { transactionApi } from '../api/transactionApi';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function TransactionDetailPage({ transactionId, onBack }) {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [showRawPayload, setShowRawPayload] = useState(false);

  async function loadDetails() {
    try {
      setLoading(true);
      setError(null);
      const res = await transactionApi.getTransactionDetails(transactionId);
      setTransaction(res.transaction);
    } catch (err) {
      setError(err.message || 'Failed to load transaction details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [transactionId]);

  async function handleLiveSync() {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await transactionApi.syncWithPayPal(transactionId);
      setSyncResult({
        status: res.liveStatus,
        message: `Verified against PayPal REST API: Order is currently ${res.liveStatus}.`,
      });
      loadDetails();
    } catch (err) {
      setSyncResult({
        error: true,
        message: err.message || 'Failed to query live PayPal status.',
      });
    } finally {
      setSyncing(false);
    }
  }

  function copyText(text, fieldName) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  }

  if (loading) {
    return <LoadingSpinner message="Loading transaction audit details..." size="lg" />;
  }

  if (error || !transaction) {
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

  const isFailedOrDeclined = transaction.payment_status === 'DECLINED' || transaction.payment_status === 'FAILED';
  const isCancelled = transaction.payment_status === 'CANCELLED';
  const isPending = transaction.payment_status === 'PENDING';
  const isCompleted = transaction.payment_status === 'COMPLETED';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Transactions</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLiveSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Verify with PayPal API</span>
          </button>
        </div>
      </div>

      {syncResult && (
        <AlertBanner
          type={syncResult.error ? 'error' : 'success'}
          title={syncResult.error ? 'Verification Alert' : 'Live PayPal Verification'}
          message={syncResult.message}
          onClose={() => setSyncResult(null)}
        />
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
              {transaction.id}
            </h1>
            <StatusBadge status={transaction.payment_status} size="lg" />
          </div>
          <p className="text-xs text-slate-500">
            Created on {formatDate(transaction.created_at)} • Updated {formatDate(transaction.updated_at)}
          </p>
        </div>

        <div className="text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
          <div className="text-xs font-medium text-slate-400">Total Charged</div>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(transaction.amount, transaction.currency)}
          </div>
        </div>
      </div>

      {/* SPECIAL FAILURE & RECOVERY DIAGNOSTICS CARD */}
      {isFailedOrDeclined && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-rose-950">
                  Payment Failure Diagnosis & Merchant Guidance
                </h2>
                <div className="text-xs text-rose-700 font-mono">
                  PayPal Issue: {transaction.error_code || 'UNSPECIFIED_FAILURE'}
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-200 text-rose-900">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white/80 p-4 rounded-xl border border-rose-100 space-y-2">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-rose-600" />
                <span>What Happened</span>
              </div>
              <p className="text-slate-600">
                {transaction.error_message ||
                  'The transaction was declined by the card issuer or PayPal risk filters.'}
              </p>
              {transaction.error_details?.cause && (
                <div className="mt-2 text-slate-500 pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">Root Cause:</span>{' '}
                  {transaction.error_details.cause}
                </div>
              )}
            </div>

            <div className="bg-white/80 p-4 rounded-xl border border-rose-100 space-y-2">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Recommended Merchant Recovery Step</span>
              </div>
              <p className="text-slate-700 font-medium">
                {transaction.error_details?.merchantGuidance ||
                  'Prompt customer to try an alternate card or complete purchase via PayPal account balance.'}
              </p>
              {transaction.error_details?.customerFriendlyMessage && (
                <div className="mt-2 text-slate-500 pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">Customer message:</span>{' '}
                  "{transaction.error_details.customerFriendlyMessage}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SPECIAL CANCELLED / ABANDONED CARD */}
      {isCancelled && (
        <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Checkout Abandoned by Buyer
              </h2>
              <div className="text-xs text-slate-500">
                Buyer exited the checkout window before authorization. This is distinct from a financial decline.
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Merchant Recovery Opportunity:</span>{' '}
            No card was rejected. This transaction represents an abandoned shopping session. Consider sending an automated abandoned cart reminder or email notification to re-engage the customer.
          </div>
        </div>
      )}

      {/* SPECIAL PENDING CARD */}
      {isPending && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-950">
                Payment Pending Clearance
              </h2>
              <div className="text-xs text-amber-700">
                Order captured on PayPal, but funds are pending clearance (eCheck or risk review).
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-amber-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Rule of Safety:</span>{' '}
            Do not fulfill physical merchandise or deliver digital licenses until PayPal clears the pending settlement to COMPLETED. Click "Verify with PayPal API" above to check current settlement status.
          </div>
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
                  : 'bg-blue-500 ring-blue-100';

                return (
                  <div key={idx} className="relative group">
                    <span
                      className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${dotColor} ring-4 transition-transform group-hover:scale-125`}
                    />
                    <div className="text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                        <span className="font-mono">{evt.type}</span>
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

      {/* PROMPT 2 PREPARATION BANNER */}
      <div className="p-4 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-950">
              AI-Powered Recovery Engine (Phase 2 Ready)
            </div>
            <div className="text-xs text-indigo-700">
              Database schema includes <code>ai_analysis_status</code>, <code>ai_analysis_summary</code>, and <code>ai_recovery_recommendation</code>.
            </div>
          </div>
        </div>
        <span className="px-3 py-1 bg-white text-indigo-700 font-semibold text-xs rounded-lg border border-indigo-200 shadow-sm">
          Awaiting Prompt 2
        </span>
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
              (Audit & Prompt 2 Data Pipeline)
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
