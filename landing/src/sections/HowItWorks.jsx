import { useFadeIn } from '../hooks/useFadeIn'

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

          {/* Visual Placeholder for Process */}
          <div className="w-full h-full min-h-[400px]">
            <VisualPlaceholder />
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

function VisualPlaceholder() {
  const ref = useFadeIn()
  return (
    <div ref={ref} className="fade-in w-full h-full rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col items-center justify-center p-8 min-h-[500px]">
      <div className="w-16 h-16 rounded-2xl bg-brand-cyan/10 text-brand-cyan flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m12 16 4-4-4-4"/><path d="M8 12h8"/></svg>
      </div>
      <p className="font-mono text-sm text-slate-400 dark:text-slate-500 font-medium text-center">
        [ Interactive Process / Animation Placeholder ]
      </p>
    </div>
  )
}
