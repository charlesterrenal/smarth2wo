import { useState, useEffect } from 'react'
import { useFadeIn } from '../hooks/useFadeIn'
import { MousePointerClick, CreditCard, Droplets, LayoutDashboard } from 'lucide-react'

const steps = [
  {
    num: '01',
    title: 'Select Volume',
    desc: 'Users interact with the intuitive interface to select their desired water volume in liters.'
  },
  {
    num: '02',
    title: 'Choose Payment',
    desc: 'Pay instantly using a generated QR code or via the integrated coin slot mechanism.'
  },
  {
    num: '03',
    title: 'Water Dispenses',
    desc: 'The IoT-enabled valve precisely dispenses the exact amount of purified water.'
  },
  {
    num: '04',
    title: 'Monitor Remotely',
    desc: 'All transaction data and system health metrics are instantly pushed to the dashboard.'
  }
]

export function HowItWorks() {
  const titleRef = useFadeIn()

  return (
    <section id="how-it-works" className="section py-24 bg-slate-50 dark:bg-slate-900/50">
      <div ref={titleRef} className="fade-in text-center mb-20">
        <span className="eyebrow">The Process</span>
        <h2 className="sec-title">How It Works</h2>
        <p className="sec-sub mx-auto">
          A seamless experience from the physical dispenser to the digital dashboard.
        </p>
      </div>

      <div className="max-w-[1000px] mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">

          {/* Steps List */}
          <div className="flex flex-col gap-8 relative">
            {/* Connecting line */}
            <div className="absolute left-[23px] top-[40px] bottom-[40px] w-px bg-slate-200 dark:bg-slate-800 -z-10 hidden md:block" />

            {steps.map((step, idx) => (
              <StepItem key={idx} step={step} delay={idx * 150} />
            ))}
          </div>

          {/* Animated Flowchart */}
          <div className="w-full h-full min-h-[400px]">
            <FlowchartAnimation />
          </div>

        </div>
      </div>
    </section>
  )
}

function StepItem({ step, delay }) {
  const ref = useFadeIn({ threshold: 0.5 })

  return (
    <div
      ref={ref}
      className="fade-in flex gap-6 group"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-400 dark:text-slate-500 group-hover:border-brand-blue group-hover:text-brand-blue transition-colors bg-clip-padding">
        {step.num}
      </div>
      <div className="pt-2">
        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{step.title}</h4>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{step.desc}</p>
      </div>
    </div>
  )
}

function FlowchartAnimation() {
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev % 4) + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const flowNodes = [
    { id: 1, title: 'Select Volume', icon: <MousePointerClick className="w-8 h-8" /> },
    { id: 2, title: 'Choose Payment', icon: <CreditCard className="w-8 h-8" /> },
    { id: 4, title: 'Monitor Remotely', icon: <LayoutDashboard className="w-8 h-8" /> },
    { id: 3, title: 'Water Dispenses', icon: <Droplets className="w-8 h-8" /> },
  ]; // Layout 1 -> 2 then 4 <- 3

  return (
    <div className="w-full h-full min-h-[500px] p-[2px] relative overflow-hidden group transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] rounded-3xl shadow-[0_6px_18px_rgba(2,6,23,0.06)] bg-slate-100 dark:bg-slate-800/50">
      <div className="absolute inset-0 rounded-3xl border border-slate-200 dark:border-slate-700/50 z-10 pointer-events-none" />
      
      {/* Background Gradients */}
      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#378ADD_100%)] opacity-30 z-0" />
      <div className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_270deg_at_50%_50%,#00000000_50%,#1D9E75_100%)] opacity-30 z-0" />

      <div className="relative h-full w-full rounded-[calc(1.5rem-2px)] bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-8 z-10 overflow-hidden">
        
        {/* Grid Container */}
        <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
          
          {/* Dashed Connecting Lines */}
          <div className="absolute inset-0 m-auto w-[65%] h-[65%] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl z-0" />

          {/* Animated Border Trail (Simulated) */}
          <div className="absolute inset-0 m-auto w-[65%] h-[65%] rounded-2xl z-0 overflow-hidden">
            <div 
              className="w-full h-full border-2 border-brand-cyan transition-all duration-700 ease-in-out"
              style={{
                clipPath: 
                  activeStep === 1 ? 'polygon(0 0, 50% 0, 50% 0, 0 0)' :
                  activeStep === 2 ? 'polygon(0 0, 100% 0, 100% 50%, 0 0)' :
                  activeStep === 3 ? 'polygon(0 0, 100% 0, 100% 100%, 50% 100%)' :
                  'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
              }}
            />
          </div>

          <div className="grid grid-cols-2 grid-rows-2 gap-10 w-full h-full relative z-10">
            {flowNodes.map((node) => {
              const isActive = activeStep === node.id;

              return (
                <div 
                  key={node.id} 
                  className={`relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-500 
                    ${isActive 
                      ? 'bg-gradient-to-br from-brand-blue to-brand-cyan shadow-[0_0_30px_rgba(55,138,221,0.4)] scale-110 text-white' 
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                >
                  <div className={`mb-3 transition-transform duration-500 ${isActive ? 'scale-110 -translate-y-1' : ''}`}>
                    {node.icon}
                  </div>
                  <span className="text-xs font-bold text-center leading-tight">{node.title}</span>
                  
                  {/* Step Badge */}
                  <div 
                    className={`absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md transition-colors duration-500 
                      ${isActive ? 'bg-white text-brand-blue' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`
                    }
                  >
                    0{node.id}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
