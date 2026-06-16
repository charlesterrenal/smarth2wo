import { useState, useEffect } from 'react';
import { DollarSign, Download, Filter, Search } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function AdminPayments() {
  const { is24Hour } = useTheme();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (error) throw error;
        if (data) setTransactions(data);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      }
    };
    
    fetchTransactions();
    
    // Set up realtime subscription for new transactions
    const subscription = supabase
      .channel('public:transactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => {
        setTransactions(prev => [payload.new, ...prev].slice(0, 20));
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div className="page-container" style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Search and Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
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
                  transactions.slice(0, 20).map((tx, idx) => (
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
                            background: tx.payment_method ? 'var(--color-green-light)' : 'var(--color-yellow-light)',
                            color: tx.payment_method ? 'var(--color-green-dark)' : 'var(--color-yellow-dark)',
                          }}
                        >
                          {tx.payment_method ? 'completed' : 'pending'}
                        </span>
                      </td>
                      <td style={{ padding: '18px 16px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                        {new Date(tx.created_at).toLocaleString([], { 
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit', 
                          hour12: !is24Hour 
                        })}
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
