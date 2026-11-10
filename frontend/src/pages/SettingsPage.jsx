import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  Database, 
  Server, 
  Key, 
  HelpCircle,
  Copy,
  Check,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AlertBanner from '../components/common/AlertBanner';
import { dashboardApi } from '../api/dashboardApi';

export default function SettingsPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  async function checkHealth() {
    try {
      setTestingConnection(true);
      const res = await dashboardApi.getHealth();
      setHealthData(res);
    } catch (err) {
      console.error('Failed to query health:', err);
    } finally {
      setLoading(false);
      setTestingConnection(false);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  function copyText(text, key) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (loading) {
    return <LoadingSpinner message="Checking system diagnostics & PayPal connection..." size="lg" />;
  }

  const isConnected = healthData?.paypal?.connected;
  const isConfigured = healthData?.paypal?.configured;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Settings & PayPal Sandbox Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Verify PayPal Sandbox OAuth 2.0 connectivity, database health, and environment keys.
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={testingConnection}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin text-blue-600' : ''}`} />
          <span>Test Live Connection</span>
        </button>
      </div>

      {/* Live Status Overview Banner */}
      <div className={`p-5 rounded-2xl border ${
        isConnected 
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
          : isConfigured 
          ? 'bg-amber-50/70 border-amber-200 text-amber-950' 
          : 'bg-slate-100 border-slate-200 text-slate-800'
      } flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {isConnected ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-base font-bold">
              {isConnected 
                ? 'PayPal Sandbox API Connected & Operational' 
                : isConfigured 
                ? 'Credentials Present, But Connection Check Failed' 
                : 'PayPal Sandbox Credentials Missing in .env'}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              {healthData?.paypal?.message || (isConnected ? 'OAuth 2.0 Client Credentials token generated successfully.' : 'Please add credentials to backend/.env')}
            </div>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
          isConnected ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
        }`}>
          {isConnected ? 'Sandbox Connected' : isConfigured ? 'Check Error' : 'Action Needed'}
        </span>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment Configuration Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              <span>Environment Variables</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">backend/.env</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="font-mono text-slate-600 font-semibold">PAYPAL_CLIENT_ID</span>
              <span className={`font-mono px-2 py-0.5 rounded text-[11px] ${
                healthData?.paypal?.configured ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'bg-rose-50 text-rose-700 font-semibold'
              }`}>
                {healthData?.paypal?.configured ? 'CONFIGURED' : 'NOT SET'}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="font-mono text-slate-600 font-semibold">PAYPAL_CLIENT_SECRET</span>
              <span className={`font-mono px-2 py-0.5 rounded text-[11px] ${
                healthData?.paypal?.configured ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'bg-rose-50 text-rose-700 font-semibold'
              }`}>
                {healthData?.paypal?.configured ? 'SECRET CONFIGURED (HIDDEN)' : 'NOT SET'}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="font-mono text-slate-600 font-semibold">PAYPAL_BASE_URL</span>
              <span className="font-mono text-slate-700">{healthData?.paypal?.baseUrl}</span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="font-mono text-slate-600 font-semibold">DATABASE_FILE</span>
              <span className="font-mono text-slate-700">{healthData?.database?.type}</span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="font-mono text-indigo-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>OPENAI_API_KEY</span>
              </span>
              <span className="font-mono px-2 py-0.5 rounded text-[11px] bg-indigo-50 text-indigo-700 font-semibold">
                {healthData?.openai?.configured ? 'READY FOR PROMPT 2' : 'PREPARED FOR PROMPT 2'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Security Rule:</span> Secret keys are never exposed in frontend code or client bundles. All PayPal OAuth transactions occur strictly server-side.
          </div>
        </div>

        {/* Database & Infrastructure Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>System & Database Status</span>
            </h2>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
              Healthy
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">SQLite Engine</span>
              <span className="font-mono font-semibold text-slate-800">
                node:sqlite (Node v24 Native DatabaseSync)
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Database Status</span>
              <span className="font-semibold text-emerald-600">
                {healthData?.database?.status}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Server Uptime</span>
              <span className="font-mono text-slate-800">
                {healthData?.uptimeSeconds} seconds
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Node.js Runtime</span>
              <span className="font-mono text-slate-800">
                {healthData?.nodeVersion}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 font-medium">API Response Time</span>
              <span className="font-mono text-slate-800">
                {healthData?.responseTimeMs} ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step PayPal Sandbox Setup Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <span>How to Obtain & Configure PayPal Sandbox Credentials</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
              <span>Create PayPal App</span>
            </div>
            <p>
              Log in to the <a href="https://developer.paypal.com/dashboard/applications/sandbox" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline">PayPal Developer Dashboard</a>.
            </p>
            <p>
              Under <strong>Apps & Credentials</strong>, select the <strong>Sandbox</strong> tab and click <strong>Create App</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
              <span>Copy API Credentials</span>
            </div>
            <p>
              Copy your <strong>Client ID</strong> and <strong>Secret</strong> from the newly created Sandbox application.
            </p>
            <p>
              Open <code>backend/.env</code> and paste both values into <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
              <span>Test with Sandbox Buyer</span>
            </div>
            <p>
              Under <a href="https://developer.paypal.com/dashboard/accounts" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold underline">Sandbox Accounts</a>, find your default Personal (Buyer) account and password.
            </p>
            <p>
              Click <strong>Test PayPal Checkout</strong> to complete an order using those credentials!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
