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
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
      isScrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 py-3' : 'bg-transparent py-5'
    }`}>
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        
        {/* Logo */}
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); scrollTo('top') }}
          className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white"
        >
          <Droplet className="text-brand-blue" fill="currentColor" size={24} />
          SmartH2wo
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => { e.preventDefault(); scrollTo(item.id) }}
                className={`text-sm font-medium transition-colors hover:text-brand-blue ${
                  activeSection === item.id 
                    ? 'text-brand-blue dark:text-brand-cyan' 
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {item.label}
              </a>
            ))}
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
            className="text-slate-900 dark:text-white"
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
