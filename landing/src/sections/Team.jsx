import { useFadeIn } from '../hooks/useFadeIn'
import { Mail } from 'lucide-react'

const Linkedin = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
)

const Instagram = ({ size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
)

const team = [
  {
    name: 'Charles Vincent P. Terrenal',
    role: 'Project Lead',
    initials: 'CT',
    image: '/CharlesVincent.png',
    bg: 'bg-brand-blue/10 text-brand-blue',
    socials: [
      { icon: Linkedin, url: 'https://www.linkedin.com/in/charlesterrenal/' },
      { icon: Mail, url: 'mailto:contact@charlesterrenal.com' }
    ]
  },
  {
    name: 'Anne Margareth B. Medina',
    role: 'Frontend Lead',
    initials: 'AM',
    image: '/AnneM.png',
    bg: 'bg-brand-cyan/10 text-brand-cyan',
    socials: [
      { icon: Instagram, url: 'https://www.instagram.com/maria_garneth' },
      { icon: Mail, url: 'mailto:annemargareth111969@gmail.com' }
    ]
  },
  {
    name: 'Marielle Lois P.\nBahuyo',
    role: 'Full Stack Developer',
    initials: 'MB',
    image: '/Lois.png',
    bg: 'bg-brand-pink/10 text-brand-pink',
    socials: [
      { icon: Linkedin, url: 'https://www.linkedin.com/in/marielleloisbahuyo/' },
      { icon: Mail, url: 'mailto:mariellelois9@gmail.com' }
    ]
  },
  {
    name: 'Wilbert Lancelot S. Aguilar',
    role: 'UI/UX Designer',
    initials: 'WA',
    image: '/LANCEW.png',
    bg: 'bg-brand-yellow/10 text-brand-yellow',
    socials: [
      { icon: Instagram, url: 'https://www.instagram.com/aglrlance_' },
      { icon: Mail, url: 'mailto:lanceaguilar22@gmail.com' }
    ]
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
      <div className="relative h-full w-full rounded-[14px] bg-[var(--bg-card)] flex flex-col items-center text-center z-10 overflow-hidden min-h-[300px]">
        {member.image ? (
          <>
            <img src={member.image} alt={member.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 z-0" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent z-0" />
            <div className="relative z-10 flex flex-col items-center justify-end w-full h-full px-4 pb-0 pt-8">
              <div className="w-24 h-24 mb-auto"></div> {/* Spacer to maintain original box size */}
              <h3 className="text-xl font-bold text-white mb-0 drop-shadow-md whitespace-pre-line">{member.name}</h3>
              <p className="text-sm text-slate-200 mb-1 drop-shadow-md">{member.role}</p>
              <div className="flex items-center gap-3 pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {member.socials.map((social, idx) => {
                  const Icon = social.icon
                  return (
                    <a key={idx} href={social.url} target="_blank" rel="noreferrer" className="p-1 text-slate-200 hover:text-white transition-colors drop-shadow-md">
                      <Icon size={18} />
                    </a>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex flex-col items-center w-full h-full p-8">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold mb-6 ${member.bg} transition-transform group-hover:scale-110 duration-300 z-10`}>
              {member.initials}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 z-10 whitespace-pre-line">{member.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 z-10">{member.role}</p>

            <div className="flex items-center gap-3 mt-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
              {member.socials.map((social, idx) => {
                const Icon = social.icon
                return (
                  <a key={idx} href={social.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-brand-blue transition-colors">
                    <Icon size={18} />
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
