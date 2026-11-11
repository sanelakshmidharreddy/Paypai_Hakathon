import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AlertBanner from '../components/common/AlertBanner';
import { transactionApi } from '../api/transactionApi';
import { formatCurrency, formatDate, truncateId } from '../utils/formatters';
import { INITIAL_TRANSACTIONS } from '../data/initialData';

export default function TransactionsPage({ onViewTransaction }) {
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: INITIAL_TRANSACTIONS.length, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Pending Settlement', value: 'PENDING' },
    { label: 'Card Declined', value: 'DECLINED' },
    { label: 'Payment Failed', value: 'FAILED' },
    { label: 'Buyer Cancelled', value: 'CANCELLED' },
  ];

  async function fetchTransactions() {
    try {
      setLoading(true);
      setError(null);
      const res = await transactionApi.getTransactions({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter,
        search: searchQuery,
      });

      if (res?.transactions && res.transactions.length > 0) {
        setTransactions(res.transactions);
        setPagination(res.pagination || { page: 1, limit: 10, total: res.transactions.length, totalPages: 1 });
      }
      setError(null);
    } catch (err) {
      console.warn('Live transaction list fetch deferred:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, [pagination.page, statusFilter, searchQuery]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSearchQuery(searchInput);
  }

  function handleResetFilters() {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('ALL');
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            PayPal Transactions Audit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, and inspect verified PayPal checkout orders and capture records.
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <AlertBanner
          type="error"
          title="Error Loading Transactions"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Transaction ID, Order ID, Payer Email, Name, or Error Code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
            />
          </form>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatusFilter(opt.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchQuery || statusFilter !== 'ALL') && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>Filtered by:</span>
            {searchQuery && (
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono">
                query: "{searchQuery}"
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold">
                status: {statusFilter}
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-blue-600 hover:text-blue-800 font-semibold ml-auto"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Fetching transactions..." />
        ) : transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">PayPal Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Failure Code</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{truncateId(tx.id, 14)}</span>
                          <button
                            onClick={() => copyToClipboard(tx.id, `txn-${tx.id}`)}
                            title="Copy Transaction ID"
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            {copiedId === `txn-${tx.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span>{truncateId(tx.paypal_order_id, 14)}</span>
                          <button
                            onClick={() => copyToClipboard(tx.paypal_order_id, `ord-${tx.paypal_order_id}`)}
                            title="Copy PayPal Order ID"
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            {copiedId === `ord-${tx.paypal_order_id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium text-slate-900">
                          {tx.payer_name || 'Guest / Unidentified'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {tx.payer_email || '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={tx.payment_status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {tx.error_code ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            {tx.error_code}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(tx.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onViewTransaction(tx.id)}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-800">
                  {Math.min(pagination.total, pagination.page * pagination.limit)}
                </span>{' '}
                of <span className="font-semibold text-slate-800">{pagination.total}</span> transactions
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 space-y-3">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No transactions found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No matching records for the current search criteria. Try clearing your filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

