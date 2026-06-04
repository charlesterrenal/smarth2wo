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
      className="fade-in card flex flex-col items-center text-center p-8 group"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold mb-6 ${member.bg} transition-transform group-hover:scale-110 duration-300`}>
        {member.initials}
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{member.name}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{member.role}</p>
      
      <div className="flex items-center gap-3 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <a href="#" className="p-2 text-slate-400 hover:text-brand-blue transition-colors">
          <Globe size={18} />
        </a>
        <a href="#" className="p-2 text-slate-400 hover:text-brand-blue transition-colors">
          <Mail size={18} />
        </a>
      </div>
    </div>
  )
}
