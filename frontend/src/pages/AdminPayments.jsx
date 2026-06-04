import { useState } from 'react';
import { DollarSign, Download, Filter, Search } from 'lucide-react';
import StatCard from '../components/StatCard';

export default function AdminPayments() {
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

  return (
    <div className="page-container" style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Search and Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Recent Transactions Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          gridColumn: 'span 1',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-text)', textTransform: 'uppercase', marginBottom: '16px' }}>
            Recent Transactions
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: 'var(--surface-card-strong)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '18px 16px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.03em', fontSize: '13px' }}>
                    Amount
                  </th>
                  <th style={{ textAlign: 'left', padding: '18px 16px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.03em', fontSize: '13px' }}>
                    Volume
                  </th>
                  <th style={{ textAlign: 'left', padding: '18px 16px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.03em', fontSize: '13px' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'left', padding: '18px 16px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.03em', fontSize: '13px' }}>
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.length > 0 ? (
                  transactions.slice(0, 5).map((tx, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        background: idx % 2 === 0 ? 'var(--table-row-alt)' : 'transparent',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'var(--table-row-alt)' : 'transparent'}
                    >
                      <td style={{ padding: '18px 16px', color: 'var(--color-text)', fontWeight: 700, fontSize: '14px' }}>₱{tx.price}</td>
                      <td style={{ padding: '18px 16px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>{tx.volume_ml}ml</td>
                      <td style={{ padding: '18px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            borderRadius: '6px',
                            background: tx.status === 'completed' ? 'var(--color-green-light)' : 'var(--color-yellow-light)',
                            color: tx.status === 'completed' ? 'var(--color-green-dark)' : 'var(--color-yellow-dark)',
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: '18px 16px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                        {new Date(tx.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No transactions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
