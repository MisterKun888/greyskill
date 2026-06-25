// pages/app.tsx — Application GreySkill complète MVP
import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// Leaflet importé dynamiquement (SSR safe)
const LeafletMap = dynamic(() => import('../components/map/LeafletMap'), { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-gray-400">🗺 Chargement de la carte...</div> })

// ======================== TYPES ========================
interface User { id: string; nom: string; prenom: string; email: string; role: string; profilSenior?: any }
interface Mission { id: string; titre: string; description: string; categorie: string; budget: number; devise: string; statut: string; clientId: string; client?: any; senior?: any; _count?: any; createdAt: string }
interface Message { id: string; missionId: string; senderId: string; contenu: string; bloque: boolean; typeMedia: string; createdAt: string; sender: { prenom: string } }

const CERT_EMOJI: Record<string, string> = { OR: '🥇', ARGENT: '🥈', BRONZE: '🥉', CONFIRME: '✓', NOUVEAU: '⭐' }

// ======================== COMPOSANTS UI ========================
const Chip = ({ label, color = 'gray' }: { label: string; color?: string }) => {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700', blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-100 text-gray-600', gold: 'bg-yellow-50 text-yellow-700',
  }
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[color] || colors.gray}`}>{label}</span>
}

const statusColor: Record<string, string> = {
  OUVERTE: 'gray', ASSIGNEE: 'blue', EN_COURS: 'amber', TERMINEE: 'green', ANNULEE: 'red', LITIGE: 'red'
}
const statusLabel: Record<string, string> = {
  OUVERTE: 'Ouverte', ASSIGNEE: 'Assignée', EN_COURS: 'En cours', TERMINEE: 'Terminée', ANNULEE: 'Annulée', LITIGE: 'Litige'
}

// ======================== MAIN APP ========================
export default function AppPage() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string>('')
  const [screen, setScreen] = useState<'login' | 'dashboard' | 'missions' | 'chat' | 'map' | 'payment' | 'new-mission'>('login')
  const [missions, setMissions] = useState<Mission[]>([])
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMsg, setInputMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' | 'warn' } | null>(null)
  const [loginForm, setLoginForm] = useState({ email: 'marie@demo.fr', password: 'demo123' })
  const [newMission, setNewMission] = useState({ titre: '', description: '', categorie: 'Comptabilité', budget: '', remote: true })
  const [payCard, setPayCard] = useState('4242 4242 4242 4242')
  const [payStep, setPayStep] = useState<'form' | 'processing' | 'success' | 'error'>('form')
  const [seniors, setSeniors] = useState<any[]>([])
  const msgEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const showToast = (msg: string, type: 'ok' | 'err' | 'warn' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ---- LOGIN ----
  const handleLogin = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error, 'err'); return }
      setUser(data.user); setToken(data.token)
      localStorage.setItem('gs_token', data.token)
      localStorage.setItem('gs_user', JSON.stringify(data.user))
      setScreen('dashboard')
      showToast(`Bienvenue ${data.user.prenom} ! 👋`)
      loadMissions(data.token, data.user)
    } catch { showToast('Erreur de connexion', 'err') }
    finally { setLoading(false) }
  }

  // ---- CHARGER MISSIONS ----
  const loadMissions = async (tk?: string, u?: User) => {
    const t = tk || token; const usr = u || user; if (!t || !usr) return
    const params = usr.role === 'CLIENT' ? `?role=client&userId=${usr.id}` : usr.role === 'SENIOR' ? `?role=senior&userId=${usr.id}` : ''
    const res = await fetch(`/api/missions${params}`, { headers: { Authorization: `Bearer ${t}` } })
    const data = await res.json()
    setMissions(data.missions || [])
    // Charger seniors pour la carte
    if (usr.role === 'CLIENT') {
      const r2 = await fetch('/api/missions?statut=OUVERTE', { headers: { Authorization: `Bearer ${t}` } })
      const d2 = await r2.json()
      setSeniors([
        { id: 'profil-1', prenom: 'Jean-Claude', certification: 'OR', tarifHoraire: 45, noteMoyenne: 4.9, competences: ['Comptabilité', 'Fiscalité'], latitude: 48.8566, longitude: 2.3522, distance: 1.2 },
        { id: 'profil-2', prenom: 'Hashley', certification: 'OR', tarifHoraire: 60, noteMoyenne: 4.8, competences: ['Stratégie', 'Coaching'], latitude: 48.8606, longitude: 2.3376, distance: 0.8 },
        { id: 'profil-3', prenom: 'Pierre', certification: 'ARGENT', tarifHoraire: 30, noteMoyenne: 4.7, competences: ['Plomberie', 'Jardinage'], latitude: 48.8500, longitude: 2.3600, distance: 2.1 },
        { id: 'profil-4', prenom: 'Hélène', certification: 'BRONZE', tarifHoraire: 25, noteMoyenne: 4.5, competences: ['Jardinage', 'Fleurs'], latitude: 48.8450, longitude: 2.3300, distance: 3.4 },
      ])
    }
  }

  // ---- CHARGER MESSAGES ----
  const loadMessages = async (missionId: string) => {
    if (!token) return
    const res = await fetch(`/api/messages/${missionId}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setMessages(data.messages || [])
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // Polling messages (simule temps réel)
  useEffect(() => {
    if (screen === 'chat' && selectedMission) {
      pollRef.current = setInterval(() => loadMessages(selectedMission.id), 3000)
    }
    return () => clearInterval(pollRef.current)
  }, [screen, selectedMission])

  // ---- ENVOYER MESSAGE ----
  const sendMessage = async () => {
    if (!inputMsg.trim() || !selectedMission || !token) return
    const res = await fetch(`/api/messages/${selectedMission.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contenu: inputMsg })
    })
    const data = await res.json()
    if (data.bloque) showToast(data.blockedReason, 'warn')
    else { setMessages(prev => [...prev, data.message]); setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50) }
    setInputMsg('')
  }

  // ---- CRÉER MISSION ----
  const createMission = async () => {
    if (!newMission.titre || !newMission.budget || !token) { showToast('Remplissez tous les champs', 'err'); return }
    setLoading(true)
    const res = await fetch('/api/missions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...newMission, budget: parseFloat(newMission.budget), latitude: 48.8566, longitude: 2.3522 })
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error, 'err'); setLoading(false); return }
    showToast(`✅ Mission "${data.mission.titre}" publiée !`)
    setMissions(prev => [data.mission, ...prev])
    setScreen('missions')
    setNewMission({ titre: '', description: '', categorie: 'Comptabilité', budget: '', remote: true })
    setLoading(false)
  }

  // ---- PAIEMENT SIMULÉ ----
  const handlePay = async () => {
    if (!selectedMission || !token) return
    setPayStep('processing')
    await new Promise(r => setTimeout(r, 1200))
    const res = await fetch('/api/payments/simulate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'create', missionId: selectedMission.id, cardNumber: payCard })
    })
    const data = await res.json()
    if (!res.ok) { setPayStep('error'); showToast(data.error, 'err'); return }
    setPayStep('success')
    setMissions(prev => prev.map(m => m.id === selectedMission.id ? { ...m, statut: 'EN_COURS' } : m))
    showToast(data.message)
  }

  const handleCapture = async () => {
    if (!selectedMission || !token) return
    setLoading(true)
    const res = await fetch('/api/payments/simulate', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'capture', missionId: selectedMission.id })
    })
    const data = await res.json()
    showToast(data.message)
    setMissions(prev => prev.map(m => m.id === selectedMission.id ? { ...m, statut: 'TERMINEE' } : m))
    setScreen('dashboard')
    setLoading(false)
  }

  const logout = () => {
    setUser(null); setToken(''); localStorage.clear(); setScreen('login')
  }

  // ======================== RENDU ========================

  // TOAST
  const toastColors = { ok: 'bg-green-600', err: 'bg-red-600', warn: 'bg-amber-500' }

  return (
    <>
      <Head><title>GreySkill App — MVP</title></Head>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${toastColors[toast.type]} text-white px-5 py-3 rounded-full text-sm font-semibold shadow-xl animate-fade-in`}>
          {toast.msg}
        </div>
      )}

      <div className="min-h-screen bg-gray-50 flex flex-col" style={{ maxWidth: 480, margin: '0 auto', background: '#f8f7f4', position: 'relative' }}>

        {/* ==================== LOGIN ==================== */}
        {screen === 'login' && (
          <div className="flex flex-col min-h-screen">
            <div className="bg-primary text-white p-8 text-center">
              <div className="text-3xl font-black font-display mb-1">Grey<span className="text-accent">Skill</span></div>
              <div className="text-white/50 text-sm">Valorisez votre expérience</div>
              <div className="mt-6 flex bg-white/10 rounded-xl p-1 gap-1">
                <button onClick={() => setLoginForm(f => ({ ...f, email: 'marie@demo.fr' }))} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${loginForm.email === 'marie@demo.fr' ? 'bg-accent text-primary' : 'text-white/70'}`}>Client</button>
                <button onClick={() => setLoginForm(f => ({ ...f, email: 'jeanclaude@demo.fr' }))} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${loginForm.email === 'jeanclaude@demo.fr' ? 'bg-accent text-primary' : 'text-white/70'}`}>Senior</button>
                <button onClick={() => setLoginForm(f => ({ ...f, email: 'admin@greyskill.net' }))} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${loginForm.email === 'admin@greyskill.net' ? 'bg-accent text-primary' : 'text-white/70'}`}>Admin</button>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-4 flex-1">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                <div className="font-bold mb-2">🎭 Comptes de démo</div>
                <div className="space-y-1 font-mono text-xs">
                  <div>📧 marie@demo.fr → Client</div>
                  <div>📧 jeanclaude@demo.fr → Senior 🥇</div>
                  <div>📧 admin@greyskill.net → Admin</div>
                  <div className="font-sans font-semibold mt-2">🔑 Mot de passe : demo123</div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">EMAIL</label>
                <input value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">MOT DE PASSE</label>
                <input type="password" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-accent" />
              </div>
              <button onClick={handleLogin} disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-base hover:opacity-90 transition-all disabled:opacity-50">
                {loading ? '⏳ Connexion...' : 'Se connecter →'}
              </button>
              <p className="text-center text-xs text-gray-400">MVP · Mode démo · Données fictives</p>
            </div>
          </div>
        )}

        {/* ==================== DASHBOARD ==================== */}
        {screen === 'dashboard' && user && (
          <div className="flex flex-col min-h-screen">
            <div className="bg-primary text-white p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-white/50 text-xs">Bonjour 👋</div>
                  <div className="text-xl font-bold">{user.prenom} {user.nom}
                    {user.role === 'SENIOR' && user.profilSenior && (
                      <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                        {CERT_EMOJI[user.profilSenior.certification]} {user.profilSenior.certification}
                      </span>
                    )}
                  </div>
                  <div className="text-white/40 text-xs mt-0.5">{user.role === 'CLIENT' ? '🏢 Client' : user.role === 'SENIOR' ? '🎓 Expert Senior' : '🛡 Administrateur'}</div>
                </div>
                <button onClick={logout} className="text-white/40 text-xs border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/10">Déconnexion</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { val: missions.filter(m => ['EN_COURS', 'ASSIGNEE'].includes(m.statut)).length, lbl: 'En cours' },
                  { val: missions.filter(m => m.statut === 'TERMINEE').length, lbl: 'Terminées' },
                  { val: missions.filter(m => m.statut === 'OUVERTE').length, lbl: 'Ouvertes' },
                ].map((k, i) => (
                  <div key={i} className="bg-white/10 rounded-xl p-3 text-center">
                    <div className="text-2xl font-black text-accent">{k.val}</div>
                    <div className="text-white/50 text-xs mt-0.5">{k.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { icon: '📋', label: 'Missions', action: () => { loadMissions(); setScreen('missions') } },
                  { icon: '🗺', label: 'Carte seniors', action: () => setScreen('map') },
                  { icon: '💬', label: 'Messages', action: () => { if (missions[0]) { setSelectedMission(missions[0]); loadMessages(missions[0].id); setScreen('chat') } else showToast('Aucune mission active', 'warn') } },
                  ...(user.role === 'CLIENT' ? [{ icon: '➕', label: 'Nouvelle mission', action: () => setScreen('new-mission') }] : []),
                ].map((btn, i) => (
                  <button key={i} onClick={btn.action}
                    className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm hover:border-accent transition-all">
                    <div className="text-2xl mb-1">{btn.icon}</div>
                    <div className="text-sm font-semibold text-primary">{btn.label}</div>
                  </button>
                ))}
              </div>

              <div className="font-semibold text-primary mb-3">Missions récentes</div>
              {missions.slice(0, 3).map(m => (
                <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 mb-3 shadow-sm cursor-pointer hover:border-accent transition-all"
                  onClick={() => { setSelectedMission(m); loadMessages(m.id); setScreen('chat') }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-sm text-primary flex-1 mr-2">{m.titre}</div>
                    <Chip label={statusLabel[m.statut] || m.statut} color={statusColor[m.statut] || 'gray'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{m.categorie}</span>
                    <span className="font-bold text-primary">{m.budget}{m.devise === 'EUR' ? '€' : '$'}</span>
                  </div>
                </div>
              ))}
              {missions.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <div className="text-sm">Aucune mission pour l'instant</div>
                  {user.role === 'CLIENT' && (
                    <button onClick={() => setScreen('new-mission')} className="mt-4 bg-accent text-primary px-5 py-2 rounded-xl font-bold text-sm">
                      + Créer une mission
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== MISSIONS ==================== */}
        {screen === 'missions' && (
          <div className="flex flex-col min-h-screen">
            <div className="bg-primary text-white p-5 flex items-center gap-3">
              <button onClick={() => setScreen('dashboard')} className="text-white/60">←</button>
              <div className="font-bold">Missions {user?.role === 'CLIENT' ? 'postées' : 'disponibles'}</div>
              {user?.role === 'CLIENT' && (
                <button onClick={() => setScreen('new-mission')} className="ml-auto bg-accent text-primary px-3 py-1.5 rounded-lg text-xs font-bold">+ Nouvelle</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {missions.map(m => (
                <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-primary flex-1 mr-2">{m.titre}</div>
                    <Chip label={statusLabel[m.statut] || m.statut} color={statusColor[m.statut] || 'gray'} />
                  </div>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{m.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Chip label={m.categorie} color="blue" />
                      {m.remote && <Chip label="Remote" color="green" />}
                    </div>
                    <span className="font-black text-primary">{m.budget}{m.devise === 'EUR' ? '€' : '$'}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setSelectedMission(m); loadMessages(m.id); setScreen('chat') }}
                      className="flex-1 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">
                      💬 Chat
                    </button>
                    {m.statut === 'ASSIGNEE' && user?.role === 'CLIENT' && (
                      <button onClick={() => { setSelectedMission(m); setPayStep('form'); setScreen('payment') }}
                        className="flex-1 py-2 text-xs font-semibold bg-accent text-primary rounded-lg hover:opacity-90">
                        💳 Payer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== NOUVELLE MISSION ==================== */}
        {screen === 'new-mission' && (
          <div className="flex flex-col min-h-screen">
            <div className="bg-primary text-white p-5 flex items-center gap-3">
              <button onClick={() => setScreen('dashboard')} className="text-white/60">←</button>
              <div className="font-bold">Poster une mission</div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-sm text-primary">
                🤖 <strong>IA GreySkill :</strong> Décrivez précisément votre besoin pour recevoir les meilleures candidatures.
              </div>
              {[
                { label: 'TITRE', key: 'titre', placeholder: 'Ex: Audit comptable TPE — 5h', type: 'text' },
                { label: 'BUDGET (€)', key: 'budget', placeholder: 'Ex: 250', type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(newMission as any)[f.key]}
                    onChange={e => setNewMission(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-accent" />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">DESCRIPTION</label>
                <textarea placeholder="Décrivez votre besoin, le contexte, les compétences requises..."
                  value={newMission.description} onChange={e => setNewMission(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-accent h-24 resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">CATÉGORIE</label>
                <select value={newMission.categorie} onChange={e => setNewMission(prev => ({ ...prev, categorie: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-accent">
                  {['Comptabilité', 'Stratégie', 'Juridique', 'Commerce', 'Jardinage', 'Plomberie', 'Cuisine', 'Coaching', 'Formation', 'Autre'].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={newMission.remote} onChange={e => setNewMission(prev => ({ ...prev, remote: e.target.checked }))}
                  className="w-4 h-4" id="remote" />
                <label htmlFor="remote" className="text-sm text-gray-600">Mission possible en remote / visioconférence</label>
              </div>
              <button onClick={createMission} disabled={loading}
                className="w-full bg-accent text-primary py-4 rounded-xl font-bold text-base hover:opacity-90 disabled:opacity-50">
                {loading ? '⏳ Publication...' : '🚀 Publier la mission'}
              </button>
            </div>
          </div>
        )}

        {/* ==================== CHAT ==================== */}
        {screen === 'chat' && selectedMission && (
          <div className="flex flex-col h-screen">
            <div className="bg-white border-b border-gray-100 p-4 flex items-center gap-3">
              <button onClick={() => setScreen('missions')} className="text-gray-400">←</button>
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                {selectedMission.senior?.user?.prenom?.[0] || selectedMission.client?.prenom?.[0] || '?'}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-primary">{selectedMission.titre}</div>
                <div className="text-xs text-green-600">🔒 Chat sécurisé · Anti-contournement actif</div>
              </div>
              <Chip label={statusLabel[selectedMission.statut] || selectedMission.statut} color={statusColor[selectedMission.statut]} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-center text-xs text-gray-400 bg-gray-100 rounded-full px-4 py-1 mx-auto w-fit">
                Conversation sécurisée GreySkill
              </div>
              {messages.map(msg => {
                const isMe = msg.senderId === user?.id
                if (msg.bloque) return (
                  <div key={msg.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start">
                    <span>🛡️</span>
                    <p className="text-xs text-amber-700">{msg.contenu}</p>
                  </div>
                )
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-gray-100 text-primary rounded-bl-sm shadow-sm'}`}>
                      {!isMe && <div className="text-xs font-semibold mb-1 text-gray-400">{msg.sender.prenom}</div>}
                      {msg.contenu}
                      <div className={`text-xs mt-1 ${isMe ? 'text-white/50' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              {messages.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">
                  <div className="text-3xl mb-2">💬</div>
                  La conversation commence ici.
                </div>
              )}
              <div ref={msgEndRef} />
            </div>

            <div className="bg-white border-t border-gray-100 p-3 flex gap-2 items-end">
              <input value={inputMsg} onChange={e => setInputMsg(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Écrire un message..." maxLength={2000}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
              <button onClick={sendMessage} disabled={!inputMsg.trim()}
                className="w-10 h-10 bg-primary rounded-full flex items-center justify-center disabled:opacity-40">
                <span className="text-white text-sm">↑</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== CARTE ==================== */}
        {screen === 'map' && (
          <div className="flex flex-col h-screen">
            <div className="bg-white border-b p-4 flex items-center gap-3">
              <button onClick={() => setScreen('dashboard')} className="text-gray-400">←</button>
              <div>
                <div className="font-bold text-primary">Seniors proches de vous</div>
                <div className="text-xs text-gray-400">📍 Paris · {seniors.length} experts disponibles · Leaflet + OpenStreetMap</div>
              </div>
            </div>
            <div className="flex-1 relative">
              <LeafletMap seniors={seniors} userLat={48.8566} userLng={2.3522} rayon={15}
                onSelectSenior={s => showToast(`${s.prenom} sélectionné — ${s.tarifHoraire}€/h`)} />
            </div>
          </div>
        )}

        {/* ==================== PAIEMENT ==================== */}
        {screen === 'payment' && selectedMission && (
          <div className="flex flex-col min-h-screen">
            <div className="bg-primary text-white p-5 flex items-center gap-3">
              <button onClick={() => setScreen('missions')} className="text-white/60">←</button>
              <div className="font-bold">Paiement sécurisé</div>
              <div className="ml-auto bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                ⚡ {process.env.NEXT_PUBLIC_STRIPE_MODE === 'live' ? 'Stripe' : 'Simulation'}
              </div>
            </div>

            {payStep === 'processing' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <div className="font-bold text-primary">Traitement en cours...</div>
                <div className="text-sm text-gray-500 text-center">Ne fermez pas l'application</div>
              </div>
            )}

            {payStep === 'success' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-4xl">✅</div>
                <div className="font-black text-xl text-primary">Paiement sécurisé !</div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 w-full space-y-2">
                  {[
                    { l: 'Total payé', v: `${selectedMission.budget}€`, c: '' },
                    { l: 'Senior recevra', v: `${(selectedMission.budget * 0.85).toFixed(2)}€`, c: 'text-green-700' },
                    { l: 'Commission GreySkill', v: `${(selectedMission.budget * 0.15).toFixed(2)}€`, c: 'text-amber-600' },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between text-sm">
                      <span className="text-gray-500">{r.l}</span>
                      <span className={`font-bold ${r.c}`}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setSelectedMission(prev => prev ? { ...prev, statut: 'EN_COURS' } : null); setScreen('chat') }}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold">
                  💬 Aller au chat mission
                </button>
                <button onClick={handleCapture} disabled={loading}
                  className="w-full border-2 border-green-600 text-green-700 py-3 rounded-xl font-semibold text-sm hover:bg-green-50 disabled:opacity-50">
                  {loading ? '⏳...' : '✅ Mission terminée — Libérer le paiement'}
                </button>
              </div>
            )}

            {payStep === 'error' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-4xl">❌</div>
                <div className="font-black text-xl text-red-600">Paiement refusé</div>
                <div className="text-sm text-gray-500 text-center">Carte refusée (simulation). Utilisez 4242 4242 4242 4242.</div>
                <button onClick={() => setPayStep('form')} className="w-full bg-primary text-white py-4 rounded-xl font-bold">↺ Réessayer</button>
              </div>
            )}

            {payStep === 'form' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="font-semibold text-primary mb-1">{selectedMission.titre}</div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {[
                      { l: 'Total', v: `${selectedMission.budget}€`, c: 'text-primary' },
                      { l: 'Commission', v: `${(selectedMission.budget * 0.15).toFixed(0)}€`, c: 'text-amber-600' },
                      { l: 'Senior net', v: `${(selectedMission.budget * 0.85).toFixed(0)}€`, c: 'text-green-700' },
                    ].map(r => (
                      <div key={r.l} className="text-center bg-gray-50 rounded-lg p-2">
                        <div className={`font-black text-base ${r.c}`}>{r.v}</div>
                        <div className="text-xs text-gray-400">{r.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700 flex items-center gap-1">
                    🔒 Argent bloqué en séquestre jusqu'à validation
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="font-semibold text-sm text-primary mb-3">Carte bancaire (simulation)</div>
                  <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-white mb-4">
                    <div className="text-lg mb-3">💳</div>
                    <div className="font-mono text-sm tracking-widest mb-3">{payCard}</div>
                    <div className="flex justify-between text-xs text-white/60"><span>TITULAIRE</span><span>EXPIRY</span></div>
                    <div className="flex justify-between text-sm font-semibold"><span>{user?.prenom} {user?.nom}</span><span>12/27</span></div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">NUMÉRO DE CARTE</label>
                    <input value={payCard} onChange={e => setPayCard(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-accent" />
                    <div className="text-xs text-gray-400 mt-1">✅ Acceptée : 4242 4242 4242 4242 · ❌ Refusée : 4000 0000 0000 0002</div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                  {['🔒 Paiement simulé — aucune vraie carte débitée', '✓ Séquestre automatique', '✓ Libération après validation mission', '✓ Commission 15% GreySkill'].map(g => (
                    <div key={g} className="flex items-center gap-2 text-xs text-green-700">{g}</div>
                  ))}
                </div>

                <button onClick={handlePay} className="w-full bg-accent text-primary py-4 rounded-xl font-black text-base hover:opacity-90">
                  🔐 Payer {selectedMission.budget}€ (simulé)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom nav pour écrans app */}
        {!['login'].includes(screen) && (
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-100 flex z-40">
            {[
              { icon: '🏠', label: 'Accueil', s: 'dashboard' },
              { icon: '📋', label: 'Missions', s: 'missions' },
              { icon: '🗺', label: 'Carte', s: 'map' },
              { icon: '➕', label: 'Nouvelle', s: 'new-mission' },
            ].map(n => (
              <button key={n.s} onClick={() => { if (n.s === 'missions') loadMissions(); setScreen(n.s as any) }}
                className={`flex-1 flex flex-col items-center py-3 gap-0.5 ${screen === n.s ? 'text-accent' : 'text-gray-400'}`}>
                <span className="text-xl">{n.icon}</span>
                <span className="text-[10px] font-medium">{n.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  )
}
