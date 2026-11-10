import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  RefreshCw,
  Terminal,
  Clock,
  Ban,
  ShieldAlert,
  WifiOff,
  CalendarX,
  Lock
} from 'lucide-react';
import { paypalApi } from '../../api/paypalApi';
import { formatCurrency } from '../../utils/formatters';

export default function CheckoutSimulatorModal({
  isOpen,
  onClose,
  paypalConfig,
  onTransactionUpdated,
  onViewTransaction,
}) {
  const [amount, setAmount] = useState('49.99');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('E-Commerce Order #8421');
  
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'scenarios'
  const [statusState, setStatusState] = useState('idle');
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [logs, setLogs] = useState([]);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  function addLog(message, type = 'info') {
    setLogs((prev) => [
      ...prev,
      {
        time: new Date().toLocaleTimeString(),
        message,
        type,
      },
    ]);
  }

  // Load PayPal JavaScript SDK script dynamically if client ID is configured
  useEffect(() => {
    if (!isOpen) return;

    if (!paypalConfig?.clientId) {
      setSdkLoaded(false);
      return;
    }

    const scriptId = 'paypal-js-sdk-dynamic';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      if (window.paypal) {
        setSdkLoaded(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}&currency=${currency}&intent=capture`;
    script.async = true;

    script.onload = () => {
      setSdkLoaded(true);
      addLog('PayPal JS SDK loaded successfully for Sandbox environment.', 'success');
    };

    script.onerror = () => {
      setSdkLoaded(false);
      addLog('Failed to load PayPal JS SDK. Verify PAYPAL_CLIENT_ID.', 'error');
    };

    document.body.appendChild(script);
  }, [isOpen, paypalConfig?.clientId, currency]);

  // Render PayPal Buttons when SDK is loaded and tab is 'live'
  useEffect(() => {
    if (activeTab !== 'live' || !sdkLoaded || !window.paypal || !isOpen) return;

    const container = document.getElementById('paypal-button-container');
    if (!container) return;

    container.innerHTML = '';

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 44,
        },
        createOrder: async () => {
          setStatusState('creating');
          addLog(`Calling backend: POST /api/paypal/create-order (${currency} ${amount})...`);
          try {
            const res = await paypalApi.createOrder({
              amount: parseFloat(amount),
              currency,
              description,
            });
            setActiveOrderId(res.orderId);
            addLog(`Order created! PayPal Order ID: ${res.orderId}`, 'success');
            setStatusState('ready');
            return res.orderId;
          } catch (err) {
            setStatusState('error');
            setErrorMessage(err.message);
            addLog(`Order creation failed: ${err.message}`, 'error');
            throw err;
          }
        },
        onApprove: async (data) => {
          setStatusState('capturing');
          addLog(`Buyer approved payment. Order ID: ${data.orderID}. Capturing via backend...`);
          try {
            const res = await paypalApi.captureOrder(data.orderID);
            setLastTransaction(res.transaction);
            setStatusState(res.status === 'PENDING' ? 'pending' : 'success');
            addLog(`Capture complete! Status: ${res.status}. Capture ID: ${res.captureId}`, 'success');
            if (onTransactionUpdated) onTransactionUpdated();
          } catch (err) {
            setLastTransaction(err.data?.transaction);
            const isDeclined = err.data?.code === 'INSTRUMENT_DECLINED';
            setStatusState(isDeclined ? 'declined' : 'error');
            setErrorMessage(err.message || 'Payment capture failed.');
            addLog(`Capture rejected: ${err.message}`, 'error');
            if (onTransactionUpdated) onTransactionUpdated();
          }
        },
        onCancel: async (data) => {
          setStatusState('cancelled');
          addLog(`Buyer cancelled checkout flow for Order ID: ${data.orderID}`, 'warn');
          try {
            const res = await paypalApi.cancelOrder(data.orderID, 'Buyer closed checkout window');
            setLastTransaction(res.transaction);
            if (onTransactionUpdated) onTransactionUpdated();
          } catch (err) {
            addLog(`Failed to log cancellation: ${err.message}`, 'error');
          }
        },
        onError: (err) => {
          setStatusState('error');
          setErrorMessage(err.message || 'An error occurred during checkout');
          addLog(`PayPal SDK error: ${err.message}`, 'error');
        },
      }).render('#paypal-button-container');
    } catch (renderErr) {
      console.error('Failed to render PayPal buttons:', renderErr);
    }
  }, [activeTab, sdkLoaded, isOpen, amount, currency, description]);

  // Run a simulated scenario
  async function handleSimulate(scenario) {
    setStatusState('capturing');
    setErrorMessage(null);
    addLog(`Executing simulation scenario: ${scenario} (${currency} ${amount})...`);

    try {
      const res = await paypalApi.simulateScenario(scenario, parseFloat(amount), currency);
      setLastTransaction(res.transaction);
      addLog(`Simulation complete for Order: ${res.orderId}`, 'success');

      if (scenario === 'SUCCESS') setStatusState('success');
      else if (scenario === 'PENDING') setStatusState('pending');
      else if (scenario === 'CANCEL' || scenario === 'INCOMPLETE_APPROVAL') setStatusState('cancelled');
      else setStatusState('declined');

      if (onTransactionUpdated) onTransactionUpdated();
    } catch (err) {
      setStatusState('error');
      setErrorMessage(err.message);
      addLog(`Simulation failed: ${err.message}`, 'error');
    }
  }

  function resetState() {
    setStatusState('idle');
    setActiveOrderId(null);
    setLastTransaction(null);
    setErrorMessage(null);
    setLogs([]);
  }

  const scenarioItems = [
    {
      id: 'SUCCESS',
      name: '1. Successful Capture',
      desc: 'Order created, approved, and captured with COMPLETED status.',
      icon: CheckCircle2,
      color: 'emerald',
    },
    {
      id: 'DECLINE',
      name: '2. Card Declined (422)',
      desc: 'Issuing bank decline: INSTRUMENT_DECLINED.',
      icon: CreditCard,
      color: 'rose',
    },
    {
      id: 'CARD_EXPIRED',
      name: '3. Expired Card',
      desc: 'Card expiration date passed: CARD_EXPIRED.',
      icon: CalendarX,
      color: 'rose',
    },
    {
      id: 'INCOMPLETE_APPROVAL',
      name: '4. Incomplete Approval',
      desc: 'Buyer abandoned before approval: ORDER_NOT_APPROVED.',
      icon: Ban,
      color: 'slate',
    },
    {
      id: 'PENDING',
      name: '5. Pending Capture',
      desc: 'eCheck or fraud review: PENDING_REVIEW.',
      icon: Clock,
      color: 'amber',
    },
    {
      id: 'ALREADY_CAPTURED',
      name: '6. Already Captured',
      desc: 'Duplicate prevention test: ORDER_ALREADY_CAPTURED.',
      icon: Lock,
      color: 'blue',
    },
    {
      id: 'NETWORK_TIMEOUT',
      name: '7. Network Timeout',
      desc: 'Connection dropped: Verify status before retry.',
      icon: WifiOff,
      color: 'amber',
    },
    {
      id: 'RESTRICTED_ACCOUNT',
      name: '8. Account Restricted',
      desc: 'Merchant receiving issue: PAYEE_ACCOUNT_RESTRICTED.',
      icon: ShieldAlert,
      color: 'rose',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="PayPal Sandbox Checkout & Test Simulator"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Tab switch */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab('live'); resetState(); }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === 'live'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Live PayPal Sandbox Checkout
          </button>
          <button
            onClick={() => { setActiveTab('scenarios'); resetState(); }}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === 'scenarios'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Sandbox Edge-Case Simulator (All Conditions)
          </button>
        </div>

        {/* Amount & Currency Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Checkout Amount
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min="0.50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={statusState === 'capturing'}
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={statusState === 'capturing'}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD ($)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Order Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={statusState === 'capturing'}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tab 1: Live PayPal Checkout */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            {!paypalConfig?.isConfigured ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <div className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  PayPal Sandbox Credentials Needed
                </div>
                <div className="mt-1 text-xs text-amber-700">
                  Please add your <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code> to <code>backend/.env</code> to render live PayPal buttons.
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => setActiveTab('scenarios')}
                    className="text-xs font-semibold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                  >
                    Switch to Sandbox Edge-Case Simulator &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <div className="text-xs text-slate-500 mb-3 flex items-center justify-between">
                  <span>Pay with PayPal Sandbox Buyer Account:</span>
                  <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    Total: {formatCurrency(amount, currency)}
                  </span>
                </div>

                <div id="paypal-button-container" className="min-h-[100px] flex items-center justify-center">
                  {!sdkLoaded && (
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      Loading PayPal Sandbox Checkout SDK...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Edge-case Scenarios */}
        {activeTab === 'scenarios' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Trigger exact PayPal response conditions to test deterministic error classification, AI evidence extraction, and safe recovery workflows:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {scenarioItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSimulate(item.id)}
                    disabled={statusState === 'capturing'}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition-colors flex items-start gap-3 group shadow-sm hover:shadow"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.color === 'emerald'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.color === 'rose'
                        ? 'bg-rose-100 text-rose-700'
                        : item.color === 'amber'
                        ? 'bg-amber-100 text-amber-700'
                        : item.color === 'blue'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Outcome Card */}
        {lastTransaction && (
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Transaction Recorded
              </span>
              <span className="font-mono text-xs text-slate-600">{lastTransaction.id}</span>
            </div>

            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
              <div>
                <div className="text-xs text-slate-500">Status:</div>
                <div className="text-sm font-bold text-slate-900">{lastTransaction.payment_status}</div>
                {lastTransaction.error_code && (
                  <div className="text-xs text-rose-600 font-mono mt-0.5">
                    Code: {lastTransaction.error_code}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  onClose();
                  if (onViewTransaction) onViewTransaction(lastTransaction.id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <span>View Full Details & AI Analysis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Live Event Stream Log */}
        {logs.length > 0 && (
          <div className="bg-slate-900 text-slate-200 rounded-xl p-3 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 mb-2">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>Checkout Lifecycle Event Stream</span>
              </span>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-slate-500 text-[10px]">{log.time}</span>
                  <span
                    className={
                      log.type === 'error'
                        ? 'text-rose-400'
                        : log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
