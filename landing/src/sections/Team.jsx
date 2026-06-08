import { useFadeIn } from '../hooks/useFadeIn'
import { Globe, Mail } from 'lucide-react'

const team = [
  {
    name: 'Charles Vincent P. Terrenal',
    role: 'Project Lead',
    initials: 'CT',
    bg: 'bg-brand-blue/10 text-brand-blue'
  },
  {
    name: 'Anne Margareth B. Medina',
    role: 'Frontend Lead',
    initials: 'AM',
    bg: 'bg-brand-cyan/10 text-brand-cyan'
  },
  {
    name: 'Marielle Lois P. Bahuyo',
    role: 'Full Stack Developer',
    initials: 'MB',
    bg: 'bg-brand-pink/10 text-brand-pink'
  },
  {
    name: 'Wilbert Lancelot S. Aguilar',
    role: 'UI/UX Designer',
    initials: 'WA',
    bg: 'bg-brand-yellow/10 text-brand-yellow'
  }
]

export function Team() {
  const titleRef = useFadeIn()

  return (
    <section id="team" className="section py-24">
      <div ref={titleRef} className="fade-in text-center mb-16">
        <span className="eyebrow">The Creators</span>
        <h2 className="sec-title">Meet the Team</h2>
        <p className="sec-sub mx-auto">
          The minds behind SmartH2wo, bringing together expertise in hardware, software, and design.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {team.map((member, idx) => (
          <TeamCard key={idx} member={member} delay={idx * 100} />
        ))}
      </div>
    </section>
  )
}

function TeamCard({ member, delay }) {
  const ref = useFadeIn()

  return (
    <div
      ref={ref}
      className="fade-in p-[2px] relative overflow-hidden group transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] rounded-[16px] cursor-pointer shadow-[0_6px_18px_rgba(2,6,23,0.06)] hover:-translate-y-[6px] hover:shadow-[0_18px_40px_rgba(55,138,221,0.2)] bg-slate-100 dark:bg-slate-800/50"
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Default Border (visible when not hovering) */}
      <div className="absolute inset-0 rounded-[16px] border border-[var(--border)] group-hover:opacity-0 transition-opacity duration-500 z-10 pointer-events-none" />

      {/* Spinning Neon Gradients (visible on hover) */}
      <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#378ADD_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />
      <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_270deg_at_50%_50%,#00000000_50%,#1D9E75_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0" />

      {/* Inner Content Area */}
      <div className="relative h-full w-full rounded-[14px] bg-[var(--bg-card)] flex flex-col items-center text-center p-8 z-10 overflow-hidden">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold mb-6 ${member.bg} transition-transform group-hover:scale-110 duration-300 z-10`}>
          {member.initials}
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 z-10">{member.name}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 z-10">{member.role}</p>

        <div className="flex items-center gap-3 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <a href="#" className="p-2 text-slate-400 hover:text-brand-blue transition-colors">
            <Globe size={18} />
          </a>
          <a href="#" className="p-2 text-slate-400 hover:text-brand-blue transition-colors">
            <Mail size={18} />
          </a>
        </div>
      </div>
    </div>
  )
}
