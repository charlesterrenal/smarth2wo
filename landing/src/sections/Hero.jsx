import { useFadeIn } from '../hooks/useFadeIn'
import { Activity, Droplets, MapPin, CreditCard } from 'lucide-react'

const bubbles = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  size: Math.random() * 8 + 4,
  left: Math.random() * 100,
  duration: Math.random() * 8 + 6,
  delay: Math.random() * -15,
  opacity: Math.random() * 0.3 + 0.1,
  tx: (Math.random() - 0.5) * 80
}));

export function Hero() {
  const ref = useFadeIn()

  return (
    <section className="relative pt-32 pb-16 md:pt-48 md:pb-24 hero-ocean-bg overflow-hidden">
      {/* Animated Water Caustics Effects */}
      <div className="caustic-1 absolute inset-0 pointer-events-none" />
      <div className="caustic-2 absolute inset-0 pointer-events-none" />
      
      {/* Rising Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {bubbles.map(b => (
          <div
            key={b.id}
            className="bubble absolute bottom-0 rounded-full bg-white"
            style={{
              width: b.size,
              height: b.size,
              left: `${b.left}%`,
              opacity: b.opacity,
              '--tx': `${b.tx}px`,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`
            }}
          />
        ))}
      </div>

      <div className="relative px-6 max-w-[1200px] mx-auto z-10">
      
      <div 
        ref={ref}
        className="fade-in max-w-[800px] mx-auto text-center flex flex-col items-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/30 text-blue-300 font-medium text-sm mb-8 border border-blue-800/50 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
          </span>
          Smart Water Dispenser System
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] mb-6 tracking-tight drop-shadow-sm">
          Smart water management for the <span className="gradient-text">modern age</span>
        </h1>

        <p className="text-lg md:text-xl text-blue-100/80 mb-10 max-w-[600px] mx-auto leading-relaxed">
          Monitor quality, manage payments, and predict maintenance for your water dispensers all from a single, powerful dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto mb-20">
          <a href="#features" className="btn-primary py-4 px-8 text-base">
            Learn More
          </a>
          <a href="/dashboard" className="btn-ghost py-4 px-8 text-base text-white border-white/30 hover:bg-white/10 hover:border-white/50">
            Go to Dashboard &rarr;
          </a>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-[1000px] mx-auto pb-12">
        <StatCard icon={<Droplets />} label="Liters Dispensed" value="2.4M+" />
        <StatCard icon={<Activity />} label="System Uptime" value="99.9%" />
        <StatCard icon={<CreditCard />} label="Transactions" value="150k+" />
        <StatCard icon={<MapPin />} label="Active Stations" value="42" />
      </div>
      </div>

      {/* Animated Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-[0] z-20">
        <svg
          className="relative block w-full h-[60px] md:h-[100px]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
          shapeRendering="auto"
        >
          <defs>
            <path
              id="gentle-wave"
              d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
            />
          </defs>
          <g className="waves">
            <use href="#gentle-wave" x="48" y="0" className="wave wave-1" />
            <use href="#gentle-wave" x="48" y="3" className="wave wave-2" />
            <use href="#gentle-wave" x="48" y="5" className="wave wave-3" />
          </g>
        </svg>
      </div>
    </section>
  )
}

function StatCard({ icon, label, value }) {
  const ref = useFadeIn()
  return (
    <div ref={ref} className="fade-in card flex flex-col items-center text-center p-6 bg-slate-900/40 border-white/10 backdrop-blur-md">
      <div className="text-blue-400 mb-3 bg-blue-500/10 p-3 rounded-2xl">
        {icon}
      </div>
      <div className="text-3xl font-bold text-white mb-1 drop-shadow-sm">{value}</div>
      <div className="text-sm font-medium text-blue-200/70">{label}</div>
    </div>
  )
}
