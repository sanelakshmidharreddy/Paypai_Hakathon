import React from 'react';
import { ShieldCheck, AlertCircle, ShoppingCart, Activity } from 'lucide-react';

export default function Navbar({ paypalConfig, onOpenCheckout, activePage, setActivePage }) {
  const isConfigured = paypalConfig?.isConfigured;

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight text-base">
              PayPal Recovery Intelligence
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">
              Hackathon
            </span>
          </div>
          <span className="text-xs text-slate-400 block -mt-0.5">
            Failure Diagnosis & Merchant Recovery
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Sandbox Status Badge */}
        <button
          onClick={() => setActivePage('settings')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            isConfigured
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
          title={isConfigured ? 'PayPal Sandbox credentials active' : 'Click to configure PayPal credentials'}
        >
          <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span>{isConfigured ? 'PayPal Sandbox Active' : 'Sandbox Setup Needed'}</span>
        </button>

        {/* Test Checkout CTA */}
        <button
          onClick={onOpenCheckout}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Test PayPal Checkout</span>
        </button>
      </div>
    </header>
  );
}
