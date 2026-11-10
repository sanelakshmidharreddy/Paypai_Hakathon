import React from 'react';
import { LayoutDashboard, Receipt, Settings, HelpCircle, Shield, ExternalLink } from 'lucide-react';

export default function Sidebar({ activePage, setActivePage }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Analytics & Overview',
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Receipt,
      description: 'Audit & Status History',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'PayPal API & Diagnostics',
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        <div>
          <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div className="text-left">
                    <div>{item.label}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* PayPal Developer Quicklinks */}
        <div className="pt-4 border-t border-slate-100">
          <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Developer Sandbox
          </div>
          <div className="space-y-1">
            <a
              href="https://developer.paypal.com/dashboard/applications/sandbox"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>PayPal Apps & Credentials</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <a
              href="https://developer.paypal.com/dashboard/accounts"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <span>Sandbox Test Accounts</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="pt-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
          <div className="text-xs font-semibold text-slate-800">Phase 1 Foundation</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Node.js + SQLite + PayPal REST API. AI recovery hooks ready for Prompt 2.
          </div>
        </div>
      </div>
    </aside>
  );
}

