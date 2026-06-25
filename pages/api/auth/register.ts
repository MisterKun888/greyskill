// pages/api/auth/register.ts
import { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'greyskill-dev-secret'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { nom, prenom, email, password, role, age, competences, passions, tarifHoraire, experienceAns } = req.body

  if (!nom || !prenom || !email || !password || !role) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' })
  }

  // Vérifier email unique
  const existing = db.findOne('users', { email: email.toLowerCase() })
  if (existing) return res.status(409).json({ error: 'Email déjà utilisé' })

  // Hasher mot de passe
  const passwordHash = await bcrypt.hash(password, 10)

  // Créer l'utilisateur
  const user = db.create('users', {
    nom, prenom, email: email.toLowerCase(), role,
    passwordHash, pays: 'FR', langue: 'fr', devise: 'EUR',
    isActive: true, kycStatus: 'PENDING',
  })

  // Créer profil senior si applicable
  let profilSenior = null
  if (role === 'SENIOR') {
    profilSenior = db.create('profils_seniors', {
      userId: user.id,
      age: parseInt(age) || 60,
      bio: '',
      competences: competences ? competences.split(',').map((c: string) => c.trim()) : [],
      passions: passions ? passions.split(',').map((p: string) => p.trim()) : [],
      categories: [],
      tarifHoraire: parseFloat(tarifHoraire) || 30,
      tarifDevis: false,
      experienceAns: parseInt(experienceAns) || 10,
      certification: 'NOUVEAU',
      nbMissions: 0,
      noteMoyenne: 0,
      rayonKm: 10,
      stripeOnboarded: false,
      abonnement: 'GRATUIT',
    })
  }

  // Token JWT
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, prenom: user.prenom },
    JWT_SECRET,
    { expiresIn: '30d' }
  )

  return res.status(201).json({
    token,
    user: { ...user, passwordHash: undefined, profilSenior }
  })
}
