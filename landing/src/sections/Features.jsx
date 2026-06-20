import { useFadeIn } from '../hooks/useFadeIn'
import { QrCode, LayoutDashboard, Wrench, Wifi, Scan } from 'lucide-react'

const features = [
  {
    title: 'Cashless Payments',
    description: 'Accept payments effortlessly using QR codes or a secure coin slot interface. Real-time transaction syncing ensures you never miss a beat.',
    icon: <QrCode size={24} />,
    color: 'text-brand-blue',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    component: <CashlessPaymentMockup />
  },
  {
    title: 'Real-time Dashboard',
    description: 'Monitor water levels, revenue, and active dispensers instantly. Beautiful, data-rich charts give you a bird\'s eye view of your business.',
    icon: <LayoutDashboard size={24} />,
    color: 'text-brand-cyan',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    imageLight: '/images/dashboard-light.png',
    imageDark: '/images/dashboard-dark.png',
    imageClass: 'object-[30%_35%] scale-[2.2]'
  },
  {
    title: 'Predictive Maintenance',
    description: 'Advanced machine learning models predict hardware failures before they happen, saving you time and repair costs.',
    icon: <Wrench size={24} />,
    color: 'text-brand-pink',
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    imageLight: '/images/maintenance-light.png',
    imageDark: '/images/maintenance-dark.png',
    imageClass: 'object-[95%_35%] scale-[2.2]'
  },
  {
    title: 'IoT Sensor Monitoring',
    description: 'Connected sensors provide precise measurements of water quality, temperature, and dispense volume directly to the cloud.',
    icon: <Wifi size={24} />,
    color: 'text-brand-yellow',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    component: <IoTSensorTerminal />
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
        <div className="aspect-[4/3] rounded-3xl p-[2px] relative overflow-hidden group transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer shadow-[0_6px_18px_rgba(2,6,23,0.06)] hover:-translate-y-[6px] hover:shadow-[0_18px_40px_rgba(55,138,221,0.2)] bg-slate-100 dark:bg-slate-800/50">
          
          {/* Default Border (visible when not hovering) */}
          <div className="absolute inset-0 rounded-3xl border border-slate-200 dark:border-slate-700/50 group-hover:opacity-0 transition-opacity duration-500 z-10 pointer-events-none" />

          {/* Spinning Neon Gradients (visible on hover) */}
          <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#378ADD_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
          <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_270deg_at_50%_50%,#00000000_50%,#1D9E75_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
          
          {/* Inner Content Area */}
          <div className="relative h-full w-full rounded-[calc(1.5rem-2px)] bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center z-10 overflow-hidden">
            {feature.component ? (
              feature.component
            ) : (
              <div className="w-full h-full relative transition-transform duration-700 group-hover:scale-105">
                <img src={feature.imageLight} alt={feature.title} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 dark:opacity-0 ${feature.imageClass || ''}`} />
                <img src={feature.imageDark} alt={feature.title} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 opacity-0 dark:opacity-100 ${feature.imageClass || ''}`} />
              </div>
            )}
          </div>
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

function CashlessPaymentMockup() {
  return (
    <div className="w-full h-full bg-slate-900 rounded-[calc(1.5rem-2px)] p-8 flex items-center justify-center relative overflow-hidden group">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-brand-cyan/20 opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-blue/30 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
      
      {/* Central Phone Mockup */}
      <div className="relative z-10 w-48 h-[340px] bg-slate-800 rounded-[2rem] border-[6px] border-slate-700 shadow-2xl flex flex-col items-center pt-8 overflow-hidden transform transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-2">
        {/* Dynamic Screen */}
        <div className="w-full h-full bg-white flex flex-col items-center pt-8 px-4 relative">
          <div className="text-slate-800 font-bold text-xl mb-1 tracking-tight">PayMongo</div>
          <div className="text-slate-500 text-[10px] mb-8 font-bold uppercase tracking-widest">Scan to Pay</div>
          
          {/* QR Code Area */}
          <div className="relative w-28 h-28 p-2 bg-white rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center justify-center">
            <QrCode className="w-full h-full text-slate-800" strokeWidth={1.5} />
            
            {/* Scanning Laser Animation */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-blue shadow-[0_0_8px_#378ADD] animate-[scan_2.5s_ease-in-out_infinite]"></div>
          </div>
          
          {/* Decorative Bottom */}
          <div className="absolute bottom-6 w-1/3 h-1 bg-slate-200 rounded-full"></div>
        </div>
      </div>
      
      {/* Hover Element - Floating Icon */}
      <div className="absolute top-1/4 right-[15%] w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100">
        <Scan className="text-brand-cyan" size={24} />
      </div>
    </div>
  )
}

function IoTSensorTerminal() {
  return (
    <div className="w-full h-full bg-slate-900 rounded-[calc(1.5rem-2px)] p-6 font-mono text-xs sm:text-sm overflow-hidden relative flex flex-col shadow-inner">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-4">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
        <span className="ml-2 text-slate-500 text-xs">esp32_serial_mon</span>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="text-emerald-400">&gt; WiFi Connected <span className="text-slate-500">[OK]</span></div>
        <div className="text-cyan-400 opacity-90">&gt; Flow_Rate: <span className="text-white">12.4 mL/s</span></div>
        <div className="text-cyan-400 opacity-90">&gt; Total_Vol: <span className="text-white">498.5 mL</span></div>
        <div className="text-brand-blue">&gt; Status: <span className="bg-brand-blue/20 text-brand-blue px-1 rounded animate-pulse">DISPENSING</span></div>
        <div className="text-purple-400 opacity-90">&gt; Ultrasonic_Lvl: <span className="text-white">82%</span></div>
        <div className="text-emerald-400 mt-2">&gt; Syncing to Cloud... <span className="text-slate-500">[OK]</span></div>
        <div className="text-slate-500 animate-[pulse_1s_ease-in-out_infinite] mt-1">_</div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
    </div>
  )
}
