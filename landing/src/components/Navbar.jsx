import { useState, useEffect } from 'react'
import { Menu, X, Droplet } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

const NAV_ITEMS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'team', label: 'Team' },
]

export function Navbar({ activeSection }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id) => {
    setMobileMenuOpen(false)
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(id)
    if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
    }
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 py-3' : 'bg-transparent py-5'
      }`}>
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">

        {/* Logo */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); scrollTo('top') }}
          className="grid items-center transform scale-[2] md:scale-[2.5] origin-left"
        >
          {!isScrolled ? (
            <img src="/Light%20Text%20Logo.png" alt="SmartH2wo" className="col-start-1 row-start-1 h-10 md:h-12 w-auto object-contain object-left" />
          ) : (
            <>
              <img src="/Text%20Logo%20SmartH2wo.png" alt="SmartH2wo" className="col-start-1 row-start-1 h-10 md:h-12 w-auto object-contain object-left transition-opacity duration-200 opacity-100 dark:opacity-0" />
              <img src="/Light%20Text%20Logo.png" alt="SmartH2wo" className="col-start-1 row-start-1 h-10 md:h-12 w-auto object-contain object-left transition-opacity duration-200 opacity-0 dark:opacity-100" />
            </>
          )}
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;

              let colorClass = '';
              if (isScrolled) {
                colorClass = isActive ? 'text-brand-blue dark:text-brand-cyan' : 'text-slate-600 hover:text-brand-blue dark:text-slate-300';
              } else {
                colorClass = isActive ? 'text-white drop-shadow-sm' : 'text-white/80 hover:text-white drop-shadow-sm';
              }

              if (item.id === 'features') {
                colorClass = 'text-blue-500 dark:text-green-400 hover:text-blue-600 dark:hover:text-green-300 drop-shadow-sm';
              }

              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => { e.preventDefault(); scrollTo(item.id) }}
                  className={`text-sm font-medium transition-colors ${colorClass}`}
                >
                  {item.label}
                </a>
              )
            })}
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <a
              href="/dashboard"
              className="text-sm font-semibold bg-brand-blue text-white px-5 py-2.5 rounded-full hover:bg-blue-600 transition-colors"
            >
              Dashboard &rarr;
            </a>
          </div>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="flex md:hidden items-center gap-4">
          <ThemeToggle />
          <button
            className={`transition-colors ${isScrolled ? 'text-slate-900 dark:text-white' : 'text-white'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 flex flex-col gap-4 shadow-lg">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => { e.preventDefault(); scrollTo(item.id) }}
              className="text-base font-medium text-slate-600 dark:text-slate-300 py-2"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <a
              href="/dashboard"
              className="flex justify-center w-full text-base font-semibold bg-brand-blue text-white px-5 py-3 rounded-full"
            >
              Dashboard &rarr;
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
