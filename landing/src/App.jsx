import { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { ScrollProgress } from './components/ScrollProgress'
import { Hero } from './sections/Hero'
import { Features } from './sections/Features'

import { HowItWorks } from './sections/HowItWorks'
import { Team } from './sections/Team'
import { Footer } from './sections/Footer'

export default function App() {
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.2, rootMargin: '-20% 0px -60% 0px' }
    )

    const sections = document.querySelectorAll('section[id]')
    sections.forEach((section) => observer.observe(section))

    return () => sections.forEach((section) => observer.unobserve(section))
  }, [])

  return (
    <div className="min-h-screen">
      <ScrollProgress />
      <Navbar activeSection={activeSection} />

      <main>
        {/* We give hero an id='top' implicitly handled by navbar scrollTo */}
        <Hero />
        <Features />

        <HowItWorks />
        <Team />
      </main>

      <Footer />
    </div>
  )
}
