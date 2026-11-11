import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ShoppingCart,
  RefreshCw,
  Ban,
  Activity,
  ChevronRight,
  Filter,
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AlertBanner from '../components/common/AlertBanner';
import { dashboardApi } from '../api/dashboardApi';
import { transactionApi } from '../api/transactionApi';
import { formatCurrency, formatShortDate, truncateId } from '../utils/formatters';
import { INITIAL_STATS, INITIAL_ACTIVITY, INITIAL_TRANSACTIONS } from '../data/initialData';

export default function DashboardPage({ onOpenCheckout, onViewTransaction, onNavigateTransactions }) {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [activity, setActivity] = useState(INITIAL_ACTIVITY);
  const [recentTransactions, setRecentTransactions] = useState(INITIAL_TRANSACTIONS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters (Prompt 3 requirement: Status, Date, Error Category)
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('30d'); // '7d' | '14d' | '30d' | 'all'
  const [errorCategoryFilter, setErrorCategoryFilter] = useState('ALL');

  function getDateBounds(range) {
    if (range === 'all') return { dateFrom: null, dateTo: null };
    const now = new Date();
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      dateFrom: past.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
    };
  }

  async function loadData() {
    try {
      setError(null);
      const { dateFrom, dateTo } = getDateBounds(dateRange);

      const filterParams = {
        status: statusFilter,
        errorCategory: errorCategoryFilter,
        dateFrom,
        dateTo,
      };

      const [statsRes, activityRes, txnsRes] = await Promise.all([
        dashboardApi.getStats(filterParams),
        dashboardApi.getActivity({ dateFrom, dateTo }),
        transactionApi.getTransactions({
          limit: 8,
          status: statusFilter,
          errorCategory: errorCategoryFilter,
          dateFrom,
          dateTo,
          sortBy: 'created_at',
          sortOrder: 'DESC',
        }),
      ]);

      if (statsRes?.stats) setStats(statsRes.stats);
      if (activityRes?.activity) setActivity(activityRes.activity);
      if (txnsRes?.transactions) setRecentTransactions(txnsRes.transactions);
      setError(null);
    } catch (err) {
      console.warn('Live backend data sync deferred:', err.message);
      // Never block UI with error banners during initial prototype load
      if (refreshing) {
        setError(err.message || 'Failed to refresh live metrics.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter, dateRange, errorCategoryFilter]);

  function handleRefresh() {
    setRefreshing(true);
    loadData();
  }

  function handleResetFilters() {
    setStatusFilter('ALL');
    setDateRange('30d');
    setErrorCategoryFilter('ALL');
  }

  const isFiltered = statusFilter !== 'ALL' || dateRange !== '30d' || errorCategoryFilter !== 'ALL';

  if (loading) {
    return <LoadingSpinner message="Loading merchant dashboard analytics..." size="lg" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Welcome & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Payment Intelligence Dashboard
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">
              Live SQLite Data
            </span>
          </div>
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
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Test PayPal Checkout</span>
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

      {/* FILTER BAR (Status, Date Range, Error Category) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Dashboard Filters</span>
          </div>
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Payment Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending Settlement</option>
              <option value="DECLINED">Card Declined</option>
              <option value="FAILED">Payment Failed</option>
              <option value="CANCELLED">Buyer Cancelled</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Timeframe</span>
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="14d">Last 14 Days</option>
              <option value="30d">Last 30 Days (Default)</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Error Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Failure Category</span>
            </label>
            <select
              value={errorCategoryFilter}
              onChange={(e) => setErrorCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="INSTRUMENT_DECLINED">INSTRUMENT_DECLINED (Card refusal)</option>
              <option value="CARD_EXPIRED">CARD_EXPIRED (Expired card)</option>
              <option value="ORDER_ALREADY_CAPTURED">ORDER_ALREADY_CAPTURED (Duplicate prevention)</option>
              <option value="PAYER_ACTION_REQUIRED">PAYER_ACTION_REQUIRED (3D Secure)</option>
              <option value="NETWORK_TIMEOUT">NETWORK_TIMEOUT (Dropped connection)</option>
              <option value="BUYER_CANCELLED">BUYER_CANCELLED (Abandoned checkout)</option>
              <option value="TRANSACTION_REFUSED">TRANSACTION_REFUSED (Risk refusal)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Transactions"
          value={stats?.totalTransactions ?? 0}
          subtext={`${stats?.demoRecordsCount ?? 0} demo fixtures included`}
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
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">AI Analyzed Incidents</div>
              <div className="text-lg font-bold text-indigo-700">{stats?.aiAnalyzedCount ?? 0}</div>
            </div>
          </div>
          <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 font-medium">
            Recovery Plans Ready
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Recoverable Opportunity</div>
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
            <span className="text-xs text-slate-400 font-medium">Verified PayPal Codes</span>
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
                No payment failures recorded for this timeframe.
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-indigo-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Recovery Assistant</span>
            </div>
            <p className="text-[11px] text-indigo-900 opacity-90 leading-relaxed">
              Every failed transaction features deterministic evidence extraction, retry safety guardrails, and tailored customer messages.
            </p>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Transactions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest PayPal Sandbox checkouts and demo fixtures stored in SQLite
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
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">AI Recovery Summary</th>
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
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          tx.is_demo
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {tx.is_demo ? 'Demo Fixture' : 'Sandbox Live'}
                        </span>
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
                      <td className="py-3 max-w-xs">
                        {tx.ai_analysis_summary ? (
                          <div className="text-[11px] text-indigo-700 font-medium truncate flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate">{tx.ai_analysis_summary}</span>
                          </div>
                        ) : tx.error_code ? (
                          <span className="text-[11px] font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                            {tx.error_code}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
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
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No matching transactions found for current filter criteria.
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
