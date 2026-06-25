// pages/index.tsx — Page d'accueil GreySkill MVP
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'client' | 'senior'>('client')

  const stats = [
    { val: '10 000+', label: 'Seniors actifs' },
    { val: '15 000+', label: 'Missions réalisées' },
    { val: '98%', label: 'Clients satisfaits' },
    { val: '50+', label: 'Pays couverts' },
  ]

  const features = [
    { icon: '🏆', title: 'Certifications Blockchain', desc: 'Badges Confirmé, Bronze, Argent, Or vérifiables et authentifiés.' },
    { icon: '📍', title: 'Géolocalisation', desc: 'Pour les métiers de la main, trouvez l\'expert le plus proche.' },
    { icon: '🔒', title: 'Paiement séquestre', desc: 'Votre argent est bloqué jusqu\'à validation. Zéro risque.' },
    { icon: '🤝', title: 'Toutes les passions', desc: 'Plomberie, pâtisserie, jardinage, coaching... Tout talent monétisable.' },
    { icon: '⚖️', title: 'IA de médiation', desc: 'En cas de litige, une IA analyse les preuves pour une résolution équitable.' },
    { icon: '🌍', title: '20+ langues', desc: 'Disponible partout dans le monde, adapté aux expressions locales.' },
  ]

  const testimonials = [
    { text: '"J\'ai trouvé Jean-Claude, 35 ans d\'expérience comptable, qui m\'a formée à gérer ma compta. Prix imbattable !"', author: 'Marie — Gérante d\'un Salon, Paris', stars: 5 },
    { text: '"Grâce à GreySkill, j\'ai rencontré Hashley, ex-directrice commerciale. Elle a transformé mon business en 3 mois."', author: 'David — Entrepreneur Solo, Boston', stars: 5 },
    { text: '"Un paysagiste senior à 30€/h au lieu de 80€. Travail impeccable et quel plaisir d\'échanger avec quelqu\'un d\'expérimenté !"', author: 'Laura — Particulière, Madrid', stars: 5 },
  ]

  return (
    <>
      <Head>
        <title>GreySkill — La plateforme qui valorise l'expérience des seniors</title>
        <meta name="description" content="Connectez-vous avec des seniors experts (55-80 ans) pour tous vos besoins professionnels et personnels à budget accessible." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
          <Link href="/" className="font-display text-xl font-bold text-primary">
            Grey<span className="text-accent">Skill</span>
          </Link>
          <div className="hidden md:flex gap-1 ml-auto">
            {[
              { label: 'Seniors', href: '/seniors' },
              { label: 'Clients', href: '/clients' },
              { label: 'Notre Histoire', href: '/histoire' },
              { label: 'Devenir Freelance', href: '/freelance' },
              { label: 'FAQ', href: '/faq' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="px-3 py-1.5 text-sm text-gray-500 hover:text-primary hover:bg-accent2 rounded-lg transition-all">
                {l.label}
              </Link>
            ))}
          </div>
          <Link href="/app" className="bg-accent text-primary px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-all">
            Accéder à l'app
          </Link>
        </div>
      </nav>

      <main className="pt-16">

        {/* HERO */}
        <section className="bg-primary text-white py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/10" />
          <div className="max-w-4xl mx-auto text-center relative">
            <div className="inline-block bg-accent/20 border border-accent/40 text-accent/90 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              🌟 La plateforme qui valorise l'expérience
            </div>
            <h1 className="font-display text-5xl font-black leading-tight mb-6">
              La Plateforme Qui Redonne Leur <em className="not-italic text-accent">Place</em> aux Seniors
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto mb-10">
              Vous cherchez un expert de qualité à budget accessible ? Vous êtes senior et voulez rester actif ? GreySkill connecte les générations et valorise l'expérience.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/app?role=senior" className="bg-accent text-primary px-8 py-3.5 rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-lg">
                Je suis un Senior →
              </Link>
              <Link href="/app?role=client" className="bg-transparent text-white px-8 py-3.5 rounded-xl font-semibold text-lg border border-white/40 hover:bg-white/10 transition-all">
                Je cherche un Talent
              </Link>
            </div>
            <p className="mt-8 font-display italic text-white/50">"L'expérience est un trésor, pas un poids."</p>
          </div>
        </section>

        {/* STATS */}
        <section className="bg-accent py-12 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="font-display text-3xl font-black text-primary">{s.val}</div>
                <div className="text-sm text-primary/70 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* COMMENT ÇA MARCHE */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="text-xs font-bold uppercase tracking-widest text-accent mb-3">Comment ça marche</div>
              <h2 className="font-display text-3xl font-bold text-primary">Simple, humain, efficace.</h2>
            </div>

            {/* Toggle client / senior */}
            <div className="flex justify-center mb-10">
              <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                <button
                  onClick={() => setActiveTab('client')}
                  className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === 'client' ? 'bg-primary text-white' : 'text-gray-500'}`}
                >
                  👤 Je suis Client
                </button>
                <button
                  onClick={() => setActiveTab('senior')}
                  className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === 'senior' ? 'bg-primary text-white' : 'text-gray-500'}`}
                >
                  🎓 Je suis Senior
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(activeTab === 'client' ? [
                { n: '1', title: 'Postez votre mission', desc: 'Décrivez votre besoin en 2 minutes. Budget, délai, localisation.' },
                { n: '2', title: 'Recevez des candidatures', desc: 'Des seniors qualifiés postulent. L\'IA vous suggère les meilleurs profils.' },
                { n: '3', title: 'Échangez & choisissez', desc: 'Chat sécurisé intégré. Visioconférence. Puis sélectionnez votre expert.' },
                { n: '4', title: 'Payez en toute sécurité', desc: 'Paiement bloqué jusqu\'à validation. Libéré automatiquement à la fin.' },
              ] : [
                { n: '1', title: 'Créez votre profil', desc: 'Compétences, passions, tarif, photo. Gratuit et rapide.' },
                { n: '2', title: 'Postulez aux missions', desc: 'Recevez des missions adaptées à votre expertise et localisation.' },
                { n: '3', title: 'Échangez avec le client', desc: 'Chat sécurisé GreySkill. Visioconférence possible.' },
                { n: '4', title: 'Soyez payé', desc: 'Paiement automatique après validation. Commission 15% seulement.' },
              ]).map((step, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                  <div className="w-9 h-9 bg-primary text-accent rounded-full flex items-center justify-center font-display font-bold text-lg mb-3">
                    {step.n}
                  </div>
                  <h3 className="font-semibold text-primary mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="bg-accent2 py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="text-xs font-bold uppercase tracking-widest text-accent mb-3">Ce qui nous distingue</div>
              <h2 className="font-display text-3xl font-bold text-primary">Tout ce que les autres plateformes n'ont pas.</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-accent2 rounded-xl flex items-center justify-center text-xl mb-3">{f.icon}</div>
                  <h3 className="font-bold text-primary mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TÉMOIGNAGES */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="text-xs font-bold uppercase tracking-widest text-accent mb-3">Ils témoignent</div>
              <h2 className="font-display text-3xl font-bold text-primary">Des histoires qui changent des vies.</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {testimonials.map((t, i) => (
                <div key={i} className="bg-primary text-white rounded-xl p-6">
                  <div className="text-accent mb-3">{'★'.repeat(t.stars)}</div>
                  <p className="font-display italic text-white/90 leading-relaxed mb-4">{t.text}</p>
                  <span className="text-accent text-sm font-medium">{t.author}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-accent py-16 px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-primary mb-4">Prêt à rejoindre la révolution GreySkill ?</h2>
          <p className="text-primary/70 mb-8">Ensemble, créons une économie où l'expérience est respectée.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/app?role=senior" className="bg-primary text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:opacity-90 transition-all">
              Je suis un Senior
            </Link>
            <Link href="/app?role=client" className="bg-transparent text-primary px-8 py-3.5 rounded-xl font-semibold text-lg border-2 border-primary hover:bg-primary/5 transition-all">
              Je cherche un Expert
            </Link>
          </div>
        </section>

      </main>

      <footer className="bg-primary text-white/60 py-8 px-6 text-center text-sm">
        <p>© 2025 <strong className="text-accent">GreySkill</strong> — Tous droits réservés · contact@greyskill.net</p>
        <p className="mt-2 text-white/30">MVP · Mode démo · Aucune donnée réelle</p>
      </footer>
    </>
  )
}
