// pages/api/missions/index.ts
import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'greyskill-dev-secret'

function getUser(req: NextApiRequest) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  try { return jwt.verify(auth.slice(7), JWT_SECRET) as any }
  catch { return null }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // GET — liste missions
  if (req.method === 'GET') {
    const { statut, categorie, search, role, userId } = req.query
    let missions = db.findMany<any>('missions')

    if (statut) missions = missions.filter(m => m.statut === statut)
    if (categorie) missions = missions.filter(m => m.categorie === categorie)
    if (search) {
      const s = (search as string).toLowerCase()
      missions = missions.filter(m =>
        m.titre.toLowerCase().includes(s) || m.description.toLowerCase().includes(s)
      )
    }
    // Missions d'un client spécifique
    if (role === 'client' && userId) missions = missions.filter(m => m.clientId === userId)
    // Missions d'un senior spécifique
    if (role === 'senior' && userId) missions = missions.filter(m => m.seniorId === userId)

    // Enrichir avec données client/senior
    const enriched = missions.map(m => {
      const client = db.findById<any>('users', m.clientId)
      const profil = m.seniorId ? db.findById<any>('profils_seniors', m.seniorId) : null
      const seniorUser = profil ? db.findById<any>('users', profil.userId) : null
      const candidatures = db.findMany<any>('candidatures', { missionId: m.id })
      return {
        ...m,
        client: client ? { prenom: client.prenom, ville: client.ville, pays: client.pays } : null,
        senior: profil && seniorUser ? {
          certification: profil.certification,
          noteMoyenne: profil.noteMoyenne,
          user: { prenom: seniorUser.prenom }
        } : null,
        _count: { candidatures: candidatures.length }
      }
    })

    return res.status(200).json({ missions: enriched.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )})
  }

  // POST — créer mission
  if (req.method === 'POST') {
    const user = getUser(req)
    if (!user) return res.status(401).json({ error: 'Non authentifié' })

    const { titre, description, categorie, budget, devise, dureeEstimee, localisation, remote, latitude, longitude } = req.body
    if (!titre || !description || !budget) return res.status(400).json({ error: 'Champs manquants' })

    const mission = db.create<any>('missions', {
      titre, description, categorie: categorie || 'Autre',
      budget: parseFloat(budget), devise: devise || 'EUR',
      dureeEstimee, localisation, remote: remote || false,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      statut: 'OUVERTE', clientId: user.id, seniorId: null,
    })

    // Matching seniors (simple — par catégorie)
    const profils = db.findMany<any>('profils_seniors')
    const matches = profils
      .filter(p => !categorie || p.competences.some((c: string) =>
        c.toLowerCase().includes((categorie as string).toLowerCase())
      ))
      .slice(0, 5)

    return res.status(201).json({ mission, seniorsSuggeres: matches })
  }

  return res.status(405).end()
}
