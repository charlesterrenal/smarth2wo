/**
 * Payment API utilities
 * Handles PayMongo payment operations and transaction management
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Create a payment checkout session (generates QR code)
 */
export async function createCheckout(amount_pesos, volume_ml, customer_email = 'admin@test.com') {
  try {
    const response = await fetch(`${API_BASE}/api/payments/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_pesos,
        volume_ml,
        customer_email,
        description: `Water refill - ${volume_ml}ml`
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create checkout');
    }

    return await response.json();
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
}

/**
 * Check payment status
 */
export async function checkPaymentStatus(transaction_id) {
  try {
    const response = await fetch(`${API_BASE}/api/payments/status/${transaction_id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to check status');
    }

    return await response.json();
  } catch (error) {
    console.error('Status check error:', error);
    throw error;
  }
}

/**
 * Simulate webhook payment (for testing without real payment)
 */
export async function simulatePayment(transaction_id, volume_ml, amount_pesos) {
  try {
    const response = await fetch(`${API_BASE}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment.paid',
        data: {
          attributes: {
            status: 'succeeded',
            amount: Math.round(amount_pesos * 100),
            metadata: {
              transaction_id,
              volume_ml,
              customer_email: 'admin@test.com'
            }
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to simulate payment');
    }

    return await response.json();
  } catch (error) {
    console.error('Payment simulation error:', error);
    throw error;
  }
}

/**
 * Get all transactions (mock implementation - in production, add API endpoint)
 */
export async function fetchTransactions() {
  // TODO: Add GET /api/payments/transactions endpoint to backend
  return {
    data: [],
    message: 'Add backend endpoint to fetch all transactions'
  };
}
