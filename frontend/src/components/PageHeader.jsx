export default function PageHeader({ title }) {
  return (
    <div style={{
      padding: '24px 32px',
      marginBottom: '32px',
      borderBottom: '2px solid var(--color-border)',
      background: 'var(--color-bg)',
      marginLeft: 'calc(var(--sidebar-width) * -1)',
      marginRight: '-32px',
      paddingLeft: 'calc(32px + var(--sidebar-width))',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    }}>
      <h1 style={{
        fontSize: '28px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: 'var(--color-text)',
        textTransform: 'uppercase',
        margin: 0,
      }}>
        {title}
      </h1>
    </div>
  )
}
