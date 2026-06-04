import { useFadeIn } from '../hooks/useFadeIn'
import { QrCode, LayoutDashboard, Wrench, Wifi } from 'lucide-react'

const features = [
  {
    title: 'Cashless Payments',
    description: 'Accept payments effortlessly using QR codes or a secure coin slot interface. Real-time transaction syncing ensures you never miss a beat.',
    icon: <QrCode size={24} />,
    color: 'text-brand-blue',
    bg: 'bg-blue-50 dark:bg-blue-900/20'
  },
  {
    title: 'Real-time Dashboard',
    description: 'Monitor water levels, revenue, and active dispensers instantly. Beautiful, data-rich charts give you a bird\'s eye view of your business.',
    icon: <LayoutDashboard size={24} />,
    color: 'text-brand-cyan',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20'
  },
  {
    title: 'Predictive Maintenance',
    description: 'Advanced machine learning models predict hardware failures before they happen, saving you time and repair costs.',
    icon: <Wrench size={24} />,
    color: 'text-brand-pink',
    bg: 'bg-pink-50 dark:bg-pink-900/20'
  },
  {
    title: 'IoT Sensor Monitoring',
    description: 'Connected sensors provide precise measurements of water quality, temperature, and dispense volume directly to the cloud.',
    icon: <Wifi size={24} />,
    color: 'text-brand-yellow',
    bg: 'bg-orange-50 dark:bg-orange-900/20'
  }
]

export function Features() {
  const titleRef = useFadeIn()

  return (
    <section id="features" className="section py-24">
      <div ref={titleRef} className="fade-in text-center mb-24">
        <span className="eyebrow">Features</span>
        <h2 className="sec-title">What SmartH2wo Can Do</h2>
        <p className="sec-sub mx-auto">
          Built from the ground up to revolutionize how you manage automated water dispensing systems.
        </p>
      </div>

      <div className="flex flex-col gap-24 md:gap-32">
        {features.map((feat, idx) => (
          <FeatureRow key={idx} feature={feat} isReversed={idx % 2 !== 0} />
        ))}
      </div>
    </section>
  )
}

function FeatureRow({ feature, isReversed }) {
  const ref = useFadeIn()

  return (
    <div 
      ref={ref} 
      className={`fade-in flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 lg:gap-24`}
    >
      {/* Visual Placeholder */}
      <div className="w-full md:w-1/2">
        <div className="aspect-[4/3] rounded-3xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center p-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className={`p-4 rounded-2xl ${feature.bg} ${feature.color} mb-4 shadow-sm`}>
            {feature.icon}
          </div>
          <p className="font-mono text-sm text-slate-400 dark:text-slate-500 font-medium">
            [ Screenshot / Demo Placeholder ]
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="w-full md:w-1/2">
        <div className={`inline-flex p-3 rounded-2xl ${feature.bg} ${feature.color} mb-6`}>
          {feature.icon}
        </div>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
          {feature.title}
        </h3>
        <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          {feature.description}
        </p>
      </div>
    </div>
  )
}
