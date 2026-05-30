export default function SetupBanner() {
  return (
    <div style={{
      background: '#fff8e6',
      borderBottom: '1px solid #ffd666',
      padding: '10px 20px',
      fontSize: '13px',
      color: '#614700',
      textAlign: 'center',
    }}>
      Demo mode — add <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>VITE_SUPABASE_URL</code> and{' '}
      <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>VITE_SUPABASE_ANON_KEY</code> to{' '}
      <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>frontend/.env</code> for live data and login.
    </div>
  )
}
