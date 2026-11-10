import React, { useState, useEffect } from 'react';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import TransactionDetailPage from './pages/TransactionDetailPage';
import SettingsPage from './pages/SettingsPage';
import CheckoutSimulatorModal from './components/checkout/CheckoutSimulatorModal';
import { paypalApi } from './api/paypalApi';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch public PayPal configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await paypalApi.getConfig();
        setPaypalConfig(config);
      } catch (err) {
        console.error('Failed to load PayPal config:', err);
      }
    }
    loadConfig();
  }, [refreshTrigger]);

  function handleViewTransaction(id) {
    setSelectedTransactionId(id);
    setActivePage('details');
  }

  function handleBackToTransactions() {
    setSelectedTransactionId(null);
    setActivePage('transactions');
  }

  function handleTransactionUpdated() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <Layout
      activePage={activePage}
      setActivePage={setActivePage}
      paypalConfig={paypalConfig}
      onOpenCheckout={() => setIsCheckoutOpen(true)}
    >
      {activePage === 'dashboard' && (
        <DashboardPage
          key={refreshTrigger}
          onOpenCheckout={() => setIsCheckoutOpen(true)}
          onViewTransaction={handleViewTransaction}
          onNavigateTransactions={() => setActivePage('transactions')}
        />
      )}

      {activePage === 'transactions' && (
        <TransactionsPage
          key={refreshTrigger}
          onViewTransaction={handleViewTransaction}
        />
      )}

      {activePage === 'details' && selectedTransactionId && (
        <TransactionDetailPage
          transactionId={selectedTransactionId}
          onBack={handleBackToTransactions}
        />
      )}

      {activePage === 'settings' && (
        <SettingsPage />
      )}

      {/* Checkout Simulator Modal */}
      <CheckoutSimulatorModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        paypalConfig={paypalConfig}
        onTransactionUpdated={handleTransactionUpdated}
        onViewTransaction={(id) => {
          setSelectedTransactionId(id);
          setActivePage('details');
        }}
      />
    </Layout>
  );
}

