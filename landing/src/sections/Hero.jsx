import { useFadeIn } from '../hooks/useFadeIn'
import { Activity, Droplets, MapPin, CreditCard } from 'lucide-react'

export function Hero() {
  const ref = useFadeIn()

  return (
    <section className="pt-32 pb-16 md:pt-48 md:pb-24 px-6 max-w-[1200px] mx-auto relative">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-blue/10 dark:bg-brand-blue/20 rounded-full blur-[100px] -z-10 pointer-events-none" />
      
      <div 
        ref={ref}
        className="fade-in max-w-[800px] mx-auto text-center flex flex-col items-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-brand-blue dark:text-blue-300 font-medium text-sm mb-8 border border-blue-100 dark:border-blue-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue"></span>
          </span>
          Smart Water Dispenser System
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 dark:text-white leading-[1.1] mb-6 tracking-tight">
          Smart water management for the <span className="gradient-text">modern age</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-[600px] mx-auto leading-relaxed">
          Monitor quality, manage payments, and predict maintenance for your water dispensers all from a single, powerful dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto mb-20">
          <a href="#features" className="btn-primary py-4 px-8 text-base">
            Learn More
          </a>
          <a href="/dashboard" className="btn-ghost py-4 px-8 text-base">
            Go to Dashboard &rarr;
          </a>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-[1000px] mx-auto">
        <StatCard icon={<Droplets />} label="Liters Dispensed" value="2.4M+" />
        <StatCard icon={<Activity />} label="System Uptime" value="99.9%" />
        <StatCard icon={<CreditCard />} label="Transactions" value="150k+" />
        <StatCard icon={<MapPin />} label="Active Stations" value="42" />
      </div>
    </section>
  )
}

function StatCard({ icon, label, value }) {
  const ref = useFadeIn()
  return (
    <div ref={ref} className="fade-in card flex flex-col items-center text-center p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="text-brand-blue dark:text-brand-cyan mb-3 bg-blue-50 dark:bg-slate-800 p-3 rounded-2xl">
        {icon}
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}
