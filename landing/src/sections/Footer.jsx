import { Droplet, Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          <div className="col-span-1 md:col-span-2">
            <a
              href="#"
              className="relative flex items-center -mt-4 md:-mt-6 mb-10 md:mb-12 transform scale-[3] md:scale-[3.5] origin-left h-10 md:h-12"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
            >
              <img
                src="/Text%20Logo%20SmartH2wo.png"
                alt="SmartH2wo"
                className="h-full w-auto object-contain object-left transition-opacity duration-200 transform-gpu will-change-opacity opacity-100 dark:opacity-0"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              />
              <img
                src="/Light%20Text%20Logo.png"
                alt="SmartH2wo"
                className="absolute top-0 left-0 h-full w-auto object-contain object-left transition-opacity duration-200 transform-gpu will-change-opacity opacity-0 dark:opacity-100"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              />
            </a>
            <p className="text-slate-500 dark:text-slate-400 max-w-[400px] leading-relaxed">
              A thesis project for the Polytechnic University of the Philippines Institute of Technology. Modernizing automated water dispensing systems with real-time monitoring, predictive maintenance, and seamless payments.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-sm">Product</h4>
            <ul className="flex flex-col gap-4">
              <li><a href="#features" className="text-slate-500 hover:text-brand-blue transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="text-slate-500 hover:text-brand-blue transition-colors">How It Works</a></li>
              <li><a href="#team" className="text-slate-500 hover:text-brand-blue transition-colors">About Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-6 uppercase tracking-wider text-sm">Resources</h4>
            <ul className="flex flex-col gap-4">
              <li><a href="/dashboard" className="text-slate-500 hover:text-brand-blue transition-colors">Dashboard Login</a></li>
              <li><a href="https://github.com/charlesterrenal/smarth2wo" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-brand-blue transition-colors">GitHub Repository</a></li>
              <li><a href="mailto:contact@smarth2wo.com" className="text-slate-500 hover:text-brand-blue transition-colors">Contact Support</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} SmartH2wo. All rights reserved.
          </p>
          <p className="text-slate-400 text-sm flex items-center gap-1">
            Built with <Heart size={14} className="text-brand-pink mx-1" /> in the Philippines
          </p>
        </div>
      </div>
    </footer>
  )
}
