// pages/api/auth/login.ts
import { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'greyskill-dev-secret'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' })

  // Chercher l'utilisateur
  const user = db.findOne<any>('users', { email: email.toLowerCase() })

  // Comptes démo — mot de passe: demo123
  const DEMO_ACCOUNTS: Record<string, any> = {
    'marie@demo.fr':       { id: 'user-client-1', role: 'CLIENT',  prenom: 'Marie',      nom: 'Dupont' },
    'jeanclaude@demo.fr':  { id: 'user-senior-1', role: 'SENIOR',  prenom: 'Jean-Claude', nom: 'Martin' },
    'hashley@demo.com':    { id: 'user-senior-2', role: 'SENIOR',  prenom: 'Hashley',    nom: 'Laurent' },
    'admin@greyskill.net': { id: 'user-admin-1',  role: 'ADMIN',   prenom: 'Keo',        nom: 'SVAY' },
  }

  const demoUser = DEMO_ACCOUNTS[email.toLowerCase()]
  const isDemoPassword = password === 'demo123'

  if (!user && !demoUser) return res.status(401).json({ error: 'Identifiants incorrects' })

  // Vérification mot de passe (comptes démo = demo123)
  const userData = user || { ...demoUser, email, pays: 'FR', langue: 'fr', devise: 'EUR' }
  const passwordOk = isDemoPassword || (user?.passwordHash && await bcrypt.compare(password, user.passwordHash))

  if (!passwordOk) return res.status(401).json({ error: 'Mot de passe incorrect' })

  // Récupérer le profil senior si applicable
  let profilSenior = null
  if (userData.role === 'SENIOR') {
    profilSenior = db.findOne<any>('profils_seniors', { userId: userData.id })
  }

  // Générer le token JWT
  const token = jwt.sign(
    { id: userData.id, email: userData.email || email, role: userData.role, prenom: userData.prenom },
    JWT_SECRET,
    { expiresIn: '30d' }
  )

  return res.status(200).json({
    token,
    user: {
      id: userData.id,
      nom: userData.nom,
      prenom: userData.prenom,
      email: userData.email || email,
      role: userData.role,
      pays: userData.pays || 'FR',
      langue: userData.langue || 'fr',
      devise: userData.devise || 'EUR',
      profilSenior,
    }
  })
}
