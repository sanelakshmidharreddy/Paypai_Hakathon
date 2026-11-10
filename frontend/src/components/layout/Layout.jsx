import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({
  children,
  activePage,
  setActivePage,
  paypalConfig,
  onOpenCheckout,
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        paypalConfig={paypalConfig}
        onOpenCheckout={onOpenCheckout}
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <div className="flex flex-1">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
