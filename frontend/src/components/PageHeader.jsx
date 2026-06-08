export default function PageHeader({ title }) {
  return (
    <div className="page-header" style={{
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
      zIndex: 10,
    }}>
      <h1 className="page-header-title" style={{
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: 'var(--color-text)',
        textTransform: 'uppercase',
        margin: 0,
        lineHeight: 1,
      }}>
        {title}
      </h1>
    </div>
  )
}
