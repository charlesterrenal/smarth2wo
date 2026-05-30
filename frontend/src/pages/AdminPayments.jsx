import { useState, useEffect } from 'react';
import { createCheckout, checkPaymentStatus, simulatePayment } from '../lib/paymentApi';

export default function AdminPayments() {
  // Payment Creation State
  const [amount, setAmount] = useState('50.00');
  const [volume, setVolume] = useState('500');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Active Checkout State
  const [activeCheckout, setActiveCheckout] = useState(null);
  const [qrCodeVisible, setQrCodeVisible] = useState(false);

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
      price: 50.00,
      payment_method: 'qr',
      created_at: new Date().toISOString(),
      status: 'completed'
    }
  ]);

  /**
   * Create a new payment checkout
   */
  const handleCreateCheckout = async () => {
    setCreateError('');
    setIsCreating(true);

    try {
      const result = await createCheckout(
        parseFloat(amount),
        parseInt(volume),
        'admin@test.com'
      );

      setActiveCheckout(result);
      setQrCodeVisible(true);

      // Add to transactions list
      setTransactions([
        {
          transaction_id: result.transaction_id,
          customer: 'admin@test.com',
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">💳 Admin Payment Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT COLUMN - Testing Tools */}
          <div className="space-y-6">
            {/* Create Checkout Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Create Payment</h2>
              <p className="text-gray-600 text-sm mb-4">Generate a QR code for testing</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₱)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="50.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Volume (ml)
                  </label>
                  <input
                    type="number"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    step="100"
                    min="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="500"
                  />
                </div>

                {createError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {createError}
                  </div>
                )}

                <button
                  onClick={handleCreateCheckout}
                  disabled={isCreating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
                >
                  {isCreating ? 'Creating...' : 'Generate QR Code'}
                </button>
              </div>
            </div>

            {/* Check Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Check Status</h2>
              <p className="text-gray-600 text-sm mb-4">Look up a transaction</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={statusId}
                    onChange={(e) => setStatusId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="92dc54f1-2397-4bb6-bbd4-d095def6da19"
                  />
                </div>

                {statusError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {statusError}
                  </div>
                )}

                <button
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
                >
                  {isCheckingStatus ? 'Checking...' : 'Check Status'}
                </button>

                {statusData && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Status:</strong> {statusData.status || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Volume:</strong> {statusData.volume_ml}ml
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Price:</strong> ₱{statusData.price}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Simulate Webhook Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Simulate Payment</h2>
              <p className="text-gray-600 text-sm mb-4">Test webhook without actual payment</p>

              {simulateError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm mb-4">
                  {simulateError}
                </div>
              )}

              <button
                onClick={handleSimulatePayment}
                disabled={isSimulating || !activeCheckout}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
              >
                {isSimulating ? 'Simulating...' : 'Simulate Payment Success'}
              </button>

              {simulateResult && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm font-semibold text-green-900 mb-2">✅ Payment Simulated</p>
                  <p className="text-sm text-gray-600">
                    {simulateResult.message}
                  </p>
                  {simulateResult.should_dispense && (
                    <p className="text-sm text-green-700 mt-2 font-semibold">
                      💧 Ready to dispense: {simulateResult.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - QR Code & Transactions */}
          <div className="space-y-6">
            {/* QR Code Display */}
            {activeCheckout && qrCodeVisible && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">📱 QR Code</h2>

                <div className="flex flex-col items-center">
                  <img
                    src={activeCheckout.qr_code_base64}
                    alt="Payment QR Code"
                    className="w-48 h-48 border-2 border-gray-200 rounded-lg p-2"
                  />

                  <div className="mt-4 text-center w-full">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Amount:</strong> ₱{activeCheckout.amount_pesos}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Volume:</strong> {activeCheckout.volume_ml}ml
                    </p>
                    <p className="text-xs text-gray-500 break-all font-mono">
                      {activeCheckout.transaction_id}
                    </p>
                  </div>

                  <button
                    onClick={() => setQrCodeVisible(false)}
                    className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-semibold"
                  >
                    Hide QR Code
                  </button>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Recent Transactions</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">
                        Amount
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">
                        Volume
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length > 0 ? (
                      transactions.slice(0, 5).map((tx, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2">₱{tx.price}</td>
                          <td className="py-3 px-2">{tx.volume_ml}ml</td>
                          <td className="py-3 px-2">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                tx.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-xs text-gray-500">
                            {new Date(tx.created_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-4 text-center text-gray-500">
                          No transactions yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">📋 How to Test</h3>
              <ol className="text-sm text-blue-800 space-y-2">
                <li>
                  <strong>1.</strong> Enter amount and volume, click "Generate QR Code"
                </li>
                <li>
                  <strong>2.</strong> QR code appears on the left (this would show on ESP32)
                </li>
                <li>
                  <strong>3.</strong> Click "Simulate Payment Success" to test the webhook
                </li>
                <li>
                  <strong>4.</strong> Transaction status updates automatically
                </li>
                <li>
                  <strong>5.</strong> Use "Check Status" to look up any transaction
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
