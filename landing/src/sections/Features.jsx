import { useState, useEffect } from 'react'
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
        <div className="aspect-[4/3] rounded-3xl p-[2px] relative overflow-hidden group transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer shadow-[0_6px_18px_rgba(2,6,23,0.06)] hover:-translate-y-[6px] hover:shadow-[0_18px_40px_rgba(55,138,221,0.2)] bg-slate-100 dark:bg-slate-800/50">

          {/* Default Border (visible when not hovering) */}
          <div className="absolute inset-0 rounded-3xl border border-slate-200 dark:border-slate-700/50 group-hover:opacity-0 transition-opacity duration-500 z-10 pointer-events-none" />

          {/* Spinning Neon Gradients (visible on hover) */}
          <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#378ADD_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
          <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_270deg_at_50%_50%,#00000000_50%,#1D9E75_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />

          {/* Inner Content Area */}
          <div className="relative h-full w-full rounded-[calc(1.5rem-2px)] bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-8 z-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
            
            {feature.title === 'Cashless Payments' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0a0f2c] to-[#1a2a4a]">
                {/* Smartphone Mockup */}
                <div className="relative w-[200px] h-[360px] bg-[#0a1128] rounded-[32px] p-[6px] shadow-2xl border border-slate-800">
                  {/* Phone Screen */}
                  <div className="relative w-full h-full bg-white rounded-[26px] overflow-hidden flex flex-col items-center pt-8">
                    
                    {/* Notch / Speaker */}
                    <div className="absolute top-0 inset-x-0 h-4 flex justify-center">
                      <div className="w-16 h-4 bg-[#0a1128] rounded-b-[12px]"></div>
                    </div>

                    {/* Branding */}
                    <h3 className="text-[#0a1128] font-serif font-bold text-[22px] tracking-tight mt-6">PayMongo</h3>
                    <p className="text-gray-500 text-[9px] tracking-[0.15em] font-semibold mt-1">SCAN TO PAY</p>

                    {/* QR Code Card */}
                    <div className="relative mt-8 bg-[#f8fafc] rounded-[20px] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex items-center justify-center w-[130px] h-[130px]">
                      
                      {/* QR Pattern */}
                      <div className="w-full h-full grid grid-cols-7 gap-[2px] relative overflow-hidden">
                        {Array.from({ length: 49 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`rounded-sm ${i % 2 === 0 || i % 5 === 0 || i % 7 === 0 ? 'bg-[#0a1128]' : 'bg-[#e2e8f0]'}`} 
                          />
                        ))}
                        
                        {/* Animated Scan Line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#2563eb] shadow-[0_0_8px_3px_rgba(37,99,235,0.4)] animate-scanDown" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : feature.title === 'Real-time Dashboard' ? (
              <MonitorCarousel />
            ) : (
              <>
                <div className={`relative z-10 p-4 rounded-2xl ${feature.bg} ${feature.color} mb-4 shadow-sm transition-transform duration-500 group-hover:scale-110`}>
                  {feature.icon}
                </div>
                <p className="relative z-10 font-mono text-sm text-slate-400 dark:text-slate-500 font-medium">
                  [ Screenshot / Demo Placeholder ]
                </p>
              </>
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

function MonitorCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    '/DB.png',
    '/TRANSAC.png',
    '/AP.png',
    '/ANALYTICS.png',
    '/LOGS.png',
    '/SETTINGS.png'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(curr => (curr + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="absolute inset-0 flex items-end justify-center bg-[#0d1117] overflow-hidden pt-4">
      {/* Monitor Mockup Wrapper */}
      <div className="relative flex flex-col items-center w-[96%] max-w-[540px] translate-y-3 group-hover:-translate-y-1 transition-transform duration-500">
        {/* Monitor Screen Bezel */}
        <div className="w-full aspect-[16/10] bg-[#1a1a2e] rounded-t-2xl rounded-b-lg p-2.5 pb-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] relative border border-slate-700/50 flex flex-col">
          {/* Monitor Display */}
          <div className="flex-1 w-full rounded-md overflow-hidden relative shadow-inner bg-[#0a0f1e]">
            
            {/* Carousel Track */}
            <div 
              className="w-full h-full flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {slides.map((src, i) => (
                <div key={i} className="w-full h-full flex-shrink-0">
                  <img 
                    src={src} 
                    alt={`Dashboard Slide ${i + 1}`} 
                    className="w-full h-full object-cover object-top" 
                  />
                </div>
              ))}
            </div>

            {/* Dots Indicator */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-10">
              {slides.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${i === currentSlide ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]' : 'bg-white/30'}`}
                />
              ))}
            </div>
            
          </div>
        </div>

        {/* Monitor Neck */}
        <div className="w-10 h-6 bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1c] border-x border-slate-800/80"></div>
        
        {/* Monitor Base (Flat Elliptical) */}
        <div className="w-36 h-3 bg-[#1a1a2e] rounded-[100%] border border-slate-700/50 shadow-lg -mt-1.5"></div>
      </div>
    </div>
  );
}
