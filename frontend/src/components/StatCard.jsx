import React from 'react'
import { useTheme } from '../context/ThemeContext'

export default function StatCard({ title, caption, subtitle, value, icon, accent, lightBg, children }) {
  const { isDark } = useTheme()
  const isLight = !isDark
  const titleColor = isLight ? '#111827' : '#F8FAFC'
  const valueColor = isLight ? '#111827' : '#FFFFFF'
  const captionColor = isLight ? '#374151' : '#CBD5E1'
  const subtitleColor = isLight ? '#374151' : '#CBD5E1'
  const badgeBackground = isLight ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.12)'
  const pillBackground = isLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)'

  const gradientLight = lightBg 
    ? `linear-gradient(135deg, ${lightBg}, color-mix(in srgb, ${accent} 20%, transparent))`
    : (accent ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 22%, transparent), color-mix(in srgb, ${accent} 80%, transparent))` : 'var(--color-surface)')
    
  const gradientDark = accent 
    ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 22%, transparent), color-mix(in srgb, ${accent} 80%, transparent))`
    : 'var(--color-surface)'

  return (
    <div className="stat-card" style={{
      background: isLight ? gradientLight : gradientDark,
      padding: '20px',
      minHeight: '160px',
      boxShadow: 'var(--shadow-premium)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'visible',
      zIndex: 1,
      '--card-accent': accent || 'var(--color-warning)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: titleColor }}>{title}</p>
        </div>
        {icon && (
          <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: badgeBackground, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, boxShadow: '0 8px 16px rgba(0,0,0,0.08)' }}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { size: 18 }) : icon}
          </div>
        )}
      </div>
      
      {icon && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '999px', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.16)' }}>
            {React.isValidElement(icon) ? React.cloneElement(icon, { size: 22 }) : icon}
          </div>
        </div>
      )}

      <div style={{ marginTop: '16px' }}>
        {value !== undefined && (
          <p style={{ margin: 0, fontSize: '2rem', lineHeight: 1, fontWeight: 800, color: valueColor }}>{value}</p>
        )}
        {caption && (
          <p style={{ margin: '6px 0 0', fontSize: '13px', fontWeight: 600, color: captionColor }}>{caption}</p>
        )}
        {children && !value && (
          <div style={{ marginTop: '12px' }}>{children}</div>
        )}
      </div>

      {(subtitle || icon) && (
        <div style={{ marginTop: '16px', padding: '12px', background: pillBackground, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {icon && (
            <div style={{ width: '32px', height: '32px', borderRadius: '12px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, boxShadow: '0 8px 16px rgba(15, 23, 42, 0.08)' }}>
              {React.isValidElement(icon) ? React.cloneElement(icon, { size: 16 }) : icon}
            </div>
          )}
          {subtitle && (
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: subtitleColor }}>{subtitle}</p>
          )}
        </div>
      )}
    </div>
  )
}
