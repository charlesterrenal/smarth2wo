import { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { createCheckout, checkPaymentStatus, simulatePayment } from '../lib/paymentApi';

// Fixed dispenser options - hardcoded for 3-button physical unit
const DISPENSER_OPTIONS = [
  { volume_ml: 100, price_pesos: 2 },
  { volume_ml: 500, price_pesos: 10 },
  { volume_ml: 1000, price_pesos: 20 }
];

export default function AdminPayments() {
  // Active Checkout State
  const [activeCheckout, setActiveCheckout] = useState(null);
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Status Check State
  const [statusId, setStatusId] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Simulate Payment State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState('');
  const [simulateResult, setSimulateResult] = useState(null);

  // Recent Transactions (mock - would fetch from backend)
  const [transactions, setTransactions] = useState([
    {
      id: 1,
      transaction_id: '92dc54f1-2397-4bb6-bbd4-d095def6da19',
      customer: 'admin@test.com',
      volume_ml: 500,
      price: 10.00,
      payment_method: 'qr',
      created_at: new Date().toISOString(),
      status: 'completed'
    }
  ]);

  /**
   * Create a payment checkout with fixed dispenser option
   */
  const handleQuickCheckout = async (volume_ml, price_pesos) => {
    setCreateError('');
    setIsCreating(true);

    try {
      const result = await createCheckout(price_pesos, volume_ml, 'dispenser@smarth2wo.local');

      setActiveCheckout(result);
      setQrCodeVisible(true);

      // Add to transactions list
      setTransactions([
        {
          transaction_id: result.transaction_id,
          customer: 'dispenser@smarth2wo.local',
          volume_ml: result.volume_ml,
          price: result.amount_pesos,
          payment_method: 'qr',
          created_at: new Date().toISOString(),
          status: 'pending'
        },
        ...transactions
      ]);
    } catch (error) {
      setCreateError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Check payment status
   */
  const handleCheckStatus = async () => {
    if (!statusId.trim()) {
      setStatusError('Please enter a transaction ID');
      return;
    }

    setStatusError('');
    setIsCheckingStatus(true);

    try {
      const result = await checkPaymentStatus(statusId);
      setStatusData(result);
    } catch (error) {
      setStatusError(error.message);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  /**
   * Simulate webhook payment (for testing)
   */
  const handleSimulatePayment = async () => {
    if (!activeCheckout) {
      setSimulateError('Please create a checkout first');
      return;
    }

    setSimulateError('');
    setIsSimulating(true);

    try {
      const result = await simulatePayment(
        activeCheckout.transaction_id,
        activeCheckout.volume_ml,
        activeCheckout.amount_pesos
      );
      setSimulateResult(result);
    } catch (error) {
      setSimulateError(error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px', padding: '24px' }}>
      <PageHeader title="Admin Payments" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Dispenser Buttons Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '0px',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: '16px' }}>
            Dispenser Buttons
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Test the 3 fixed dispenser options
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {DISPENSER_OPTIONS.map((option) => (
              <button
                key={option.volume_ml}
                onClick={() => handleQuickCheckout(option.volume_ml, option.price_pesos)}
                disabled={isCreating}
                style={{
                  width: '100%',
                  background: isCreating ? 'var(--color-text-muted)' : 'var(--color-blue)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0px',
                  padding: '16px 12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.3s ease',
                  opacity: isCreating ? 0.6 : 1,
                }}
                onMouseEnter={(e) => !isCreating && (e.target.style.background = 'var(--color-blue-dark)')}
                onMouseLeave={(e) => (e.target.style.background = 'var(--color-blue)')}
              >
                <span>{option.volume_ml === 1000 ? '1 Liter' : `${option.volume_ml}ml`}</span>
                <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '6px 12px', borderRadius: '0px', fontWeight: 700 }}>
                  P{option.price_pesos}
                </span>
              </button>
            ))}
          </div>

          {createError && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '13px' }}>
              {createError}
            </div>
          )}

          {isCreating && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#dbeafe', border: '1px solid #93c5fd', color: '#1e40af', fontSize: '13px' }}>
              Generating QR code...
            </div>
          )}
        </div>

        {/* Check Status Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '0px',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: '16px' }}>
            Transaction Status
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Look up any transaction by ID
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Transaction ID
            </label>
            <input
              type="text"
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontSize: '13px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
              placeholder="92dc54f1-2397-4bb6-bbd4-d095def6da19"
            />
          </div>

          {statusError && (
            <div style={{ padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
              {statusError}
            </div>
          )}

          <button
            onClick={handleCheckStatus}
            disabled={isCheckingStatus}
            style={{
              width: '100%',
              background: isCheckingStatus ? 'var(--color-text-muted)' : 'var(--color-green)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0px',
              padding: '12px 12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isCheckingStatus ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: isCheckingStatus ? 0.6 : 1,
            }}
            onMouseEnter={(e) => !isCheckingStatus && (e.target.style.background = 'var(--color-green-dark)')}
            onMouseLeave={(e) => (e.target.style.background = 'var(--color-green)')}
          >
            {isCheckingStatus ? 'Checking...' : 'Check Status'}
          </button>

          {statusData && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', fontSize: '13px' }}>
              <p style={{ marginBottom: '8px' }}>
                <strong>Status:</strong> {statusData.status || 'N/A'}
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong>Volume:</strong> {statusData.volume_ml}ml
              </p>
              <p>
                <strong>Price:</strong> P{statusData.price}
              </p>
            </div>
          )}
        </div>

        {/* QR Code Card */}
        {activeCheckout && qrCodeVisible && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '0px',
            padding: '20px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: '16px' }}>
              QR Code
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <img
                src={activeCheckout.qr_code_base64}
                alt="Payment QR Code"
                style={{
                  width: '200px',
                  height: '200px',
                  border: '2px solid var(--color-border)',
                  padding: '8px',
                  background: '#ffffff',
                }}
              />

              <div style={{ textAlign: 'center', width: '100%' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text)', marginBottom: '8px' }}>
                  <strong>Amount:</strong> P{activeCheckout.amount_pesos}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-text)', marginBottom: '8px' }}>
                  <strong>Volume:</strong> {activeCheckout.volume_ml}ml
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {activeCheckout.transaction_id}
                </p>
              </div>

              <button
                onClick={() => setQrCodeVisible(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--color-blue)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Hide QR Code
              </button>
            </div>
          </div>
        )}

        {/* Simulate Payment Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '0px',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: '16px' }}>
            Simulate Payment
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Test webhook without real payment
          </p>

          {simulateError && (
            <div style={{ padding: '12px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
              {simulateError}
            </div>
          )}

          <button
            onClick={handleSimulatePayment}
            disabled={isSimulating || !activeCheckout}
            style={{
              width: '100%',
              background: (isSimulating || !activeCheckout) ? 'var(--color-text-muted)' : 'var(--color-purple)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0px',
              padding: '12px 12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: (isSimulating || !activeCheckout) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: (isSimulating || !activeCheckout) ? 0.6 : 1,
            }}
            onMouseEnter={(e) => !isSimulating && activeCheckout && (e.target.style.background = 'var(--color-purple-dark)')}
            onMouseLeave={(e) => (e.target.style.background = 'var(--color-purple)')}
          >
            {isSimulating ? 'Simulating...' : 'Simulate Payment Success'}
          </button>

          {simulateResult && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', fontSize: '13px' }}>
              <p style={{ marginBottom: '8px', fontWeight: 600 }}>Payment Simulated</p>
              <p style={{ marginBottom: '8px' }}>{simulateResult.message}</p>
              {simulateResult.should_dispense && (
                <p style={{ fontWeight: 600, marginTop: '8px' }}>
                  Ready to dispense: {simulateResult.message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent Transactions Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '0px',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          gridColumn: 'span 1',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: '16px' }}>
            Recent Transactions
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, color: 'var(--color-text)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                    Amount
                  </th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, color: 'var(--color-text)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                    Volume
                  </th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, color: 'var(--color-text)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600, color: 'var(--color-text)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.length > 0 ? (
                  transactions.slice(0, 5).map((tx, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(0, 0, 0, 0.02)' }}>
                      <td style={{ padding: '12px 8px', color: 'var(--color-text)' }}>P{tx.price}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--color-text)' }}>{tx.volume_ml}ml</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: tx.status === 'completed' ? 'var(--color-green-light)' : 'var(--color-yellow-light)',
                            color: tx.status === 'completed' ? 'var(--color-green-dark)' : 'var(--color-yellow-dark)',
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No transactions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: '0px',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            How to Test
          </h3>
          <ol style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>Click any dispenser button (100ml, 500ml, or 1L)</li>
            <li>QR code appears (this is what ESP32 displays to customer)</li>
            <li>Click "Simulate Payment Success" to test webhook</li>
            <li>Transaction status updates automatically</li>
            <li>Use "Transaction Status" to look up any payment</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
