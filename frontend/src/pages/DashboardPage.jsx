import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ArrowUpRight,
  ShoppingCart,
  RefreshCw,
  CreditCard,
  Ban,
  Activity,
  ChevronRight
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AlertBanner from '../components/common/AlertBanner';
import { dashboardApi } from '../api/dashboardApi';
import { transactionApi } from '../api/transactionApi';
import { formatCurrency, formatShortDate, truncateId } from '../utils/formatters';

export default function DashboardPage({ onOpenCheckout, onViewTransaction, onNavigateTransactions }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function loadData() {
    try {
      setError(null);
      const [statsRes, activityRes, txnsRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getActivity(),
        transactionApi.getTransactions({ limit: 6, sortBy: 'created_at', sortOrder: 'DESC' }),
      ]);

      setStats(statsRes.stats);
      setActivity(activityRes.activity);
      setRecentTransactions(txnsRes.transactions || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  if (loading) {
    return <LoadingSpinner message="Loading merchant dashboard analytics..." size="lg" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payment Intelligence Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time monitoring, failure diagnosis, and recovery metrics for PayPal checkout transactions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onOpenCheckout}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Run Sandbox Checkout</span>
          </button>
        </div>
      </div>

      {error && (
        <AlertBanner
          type="error"
          title="Data Loading Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Transactions"
          value={stats?.totalTransactions ?? 0}
          subtext="Checkout attempts recorded"
          icon={Activity}
          colorScheme="blue"
        />

        <StatCard
          title="Successful Payments"
          value={stats?.successfulPayments ?? 0}
          subtext={`${formatCurrency(stats?.totalVolumeSuccessful ?? 0)} collected`}
          icon={CheckCircle2}
          colorScheme="emerald"
        />

        <StatCard
          title="Failed & Declined"
          value={stats?.failedPayments ?? 0}
          subtext={`${formatCurrency(stats?.totalVolumeLost ?? 0)} at risk`}
          icon={AlertTriangle}
          colorScheme="rose"
        />

        <StatCard
          title="Success Rate"
          value={`${stats?.successRate ?? 0}%`}
          subtext={`${stats?.pendingPayments ?? 0} pending settlement`}
          icon={TrendingUp}
          colorScheme="purple"
          trend={`${stats?.successRate ?? 0}%`}
          trendPositive={(stats?.successRate || 0) >= 70}
        />
      </div>

      {/* Secondary Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Pending Settlements</div>
              <div className="text-lg font-bold text-slate-900">{stats?.pendingPayments ?? 0}</div>
            </div>
          </div>
          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
            eCheck / Review
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Buyer Abandonments</div>
              <div className="text-lg font-bold text-slate-900">{stats?.cancelledPayments ?? 0}</div>
            </div>
          </div>
          <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-medium">
            Cancelled Sessions
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Recovery Opportunity</div>
              <div className="text-lg font-bold text-emerald-700">
                {formatCurrency(stats?.totalVolumeLost ?? 0)}
              </div>
            </div>
          </div>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
            Lost Revenue
          </span>
        </div>
      </div>

      {/* Main Grid: Failure Analysis & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Failure Breakdown & Diagnostics Overview */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Top Payment Failure Causes
            </h2>
            <span className="text-xs text-slate-400 font-medium">PayPal API Issues</span>
          </div>

          <p className="text-xs text-slate-500">
            Identified reasons behind interrupted or refused customer checkouts:
          </p>

          <div className="space-y-3">
            {activity?.failureReasons && activity.failureReasons.length > 0 ? (
              activity.failureReasons.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-rose-700">
                      {item.code}
                    </span>
                    <span className="text-xs font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                      {item.count} {item.count === 1 ? 'incident' : 'incidents'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Impacted Volume:</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(item.lost_amount || 0)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No payment failures recorded yet. Great job!
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-blue-900">
            <div className="font-semibold mb-0.5">Prompt 2 AI Foundation Ready</div>
            <div>
              Every failure logs raw PayPal payloads ready for automated AI root-cause analysis and recovery actions.
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Transactions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest PayPal Sandbox checkouts processed by backend
              </p>
            </div>
            <button
              onClick={onNavigateTransactions}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pl-1">Transaction ID</th>
                  <th className="pb-3">Customer / Email</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right pr-1">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-3 pl-1 font-mono font-medium text-slate-800">
                        {truncateId(tx.id, 12)}
                      </td>
                      <td className="py-3 text-slate-600">
                        <div className="font-medium text-slate-800">
                          {tx.payer_name || 'Guest Checkout'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {tx.payer_email || 'No email captured'}
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-slate-900">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={tx.payment_status} size="sm" />
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">
                        {formatShortDate(tx.created_at)}
                      </td>
                      <td className="py-3 text-right pr-1">
                        <button
                          onClick={() => onViewTransaction(tx.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No transactions recorded yet. Click "Run Sandbox Checkout" to create one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

