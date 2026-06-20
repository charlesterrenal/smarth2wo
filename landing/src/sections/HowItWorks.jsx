import { useFadeIn } from '../hooks/useFadeIn'
import { Smartphone, Coins, Droplets, LayoutDashboard, ArrowRight } from 'lucide-react'

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

          {/* Visual Diagram for Process */}
          <div className="w-full h-full min-h-[400px]">
            <ProcessDiagram />
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

function ProcessDiagram() {
  const ref = useFadeIn()
  return (
    <div ref={ref} className="fade-in w-full h-full min-h-[500px] bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 flex flex-col justify-center relative shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden border border-slate-100 dark:border-slate-800">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="flex-1 flex flex-col justify-center gap-4 relative z-10">
        <ProcessNode icon={<Smartphone size={24} />} title="1. Select & Pay" color="text-brand-blue" bg="bg-blue-50 dark:bg-blue-500/20" />
        <Arrow />
        <ProcessNode icon={<Coins size={24} />} title="2. Hardware Verifies" color="text-brand-yellow" bg="bg-orange-50 dark:bg-yellow-500/20" />
        <Arrow />
        <ProcessNode icon={<Droplets size={24} />} title="3. Solenoid Opens" color="text-brand-cyan" bg="bg-emerald-50 dark:bg-cyan-500/20" />
        <Arrow />
        <ProcessNode icon={<LayoutDashboard size={24} />} title="4. Cloud Sync" color="text-brand-pink" bg="bg-pink-50 dark:bg-pink-500/20" />
      </div>
    </div>
  )
}

function ProcessNode({ icon, title, color, bg }) {
  return (
    <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/50 backdrop-blur-sm transition-transform hover:-translate-y-1 duration-300 shadow-sm cursor-default">
      <div className={`w-14 h-14 rounded-xl ${bg} ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
        {icon}
      </div>
      <div className="font-bold text-lg text-slate-800 dark:text-slate-100">{title}</div>
    </div>
  )
}

function Arrow() {
  return (
    <div className="flex justify-center -my-1 text-slate-300 dark:text-slate-600">
      <ArrowRight className="w-6 h-6 rotate-90" />
    </div>
  )
}
