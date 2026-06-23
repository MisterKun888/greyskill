// pages/api/missions/index.ts
// GET = liste missions / POST = créer mission + matching IA + géoloc

import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Anti-contournement — mots-clés bloqués dans les messages
const BLOCKED_PATTERNS = [
  /\b0[67]\d{8}\b/,                        // Téléphones FR
  /\+\d{1,3}[\s-]?\d{6,}/,                 // Tel internationaux
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/,  // Emails
  /https?:\/\/\S+/,                         // URLs
  /www\.\S+\.\S+/,                          // URLs sans http
  /@[a-zA-Z0-9._]+/,                        // @pseudo réseaux
  /\b(whatsapp|telegram|signal|instagram|linkedin|facebook)\b/i,
  /\bwechat\b|\bviber\b|\bskype\b/i,
]

export function detectContournement(texte: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(texte))
}

export function filtrerMessage(texte: string): { bloque: boolean; message: string } {
  if (detectContournement(texte)) {
    return {
      bloque: true,
      message: "🛡️ Les coordonnées directes sont interdites sur GreySkill. Merci de passer uniquement par notre messagerie sécurisée."
    }
  }
  return { bloque: false, message: texte }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // ==================== GET — Lister les missions ====================
  if (req.method === 'GET') {
    const {
      categorie, statut, lat, lng, rayon = '20',
      page = '1', limit = '10', search
    } = req.query

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    const where: any = {}
    if (categorie) where.categorie = categorie
    if (statut) where.statut = statut
    else where.statut = 'OUVERTE'
    if (search) {
      where.OR = [
        { titre: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    // Géolocalisation — missions dans un rayon donné
    let missionIds: string[] | undefined
    if (lat && lng) {
      const latitude = parseFloat(lat as string)
      const longitude = parseFloat(lng as string)
      const rayonKm = parseInt(rayon as string)

      // Formule Haversine approximative pour PostgreSQL
      const missions = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM missions
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(latitude))
          )
        ) <= ${rayonKm}
        AND statut = 'OUVERTE'
        ORDER BY (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(latitude))
          )
        ) ASC
        LIMIT ${parseInt(limit as string)}
      `
      missionIds = missions.map(m => m.id)
      if (missionIds.length > 0) where.id = { in: missionIds }
    }

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where,
        include: {
          client: { select: { prenom: true, ville: true, pays: true } },
          senior: { select: { certification: true, noteMoyenne: true, user: { select: { prenom: true } } } },
          _count: { select: { candidatures: true } }
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.mission.count({ where })
    ])

    return res.status(200).json({
      missions,
      pagination: {
        total, page: parseInt(page as string),
        pages: Math.ceil(total / parseInt(limit as string))
      }
    })
  }

  // ==================== POST — Créer une mission ====================
  if (req.method === 'POST') {
    const { titre, description, categorie, budget, devise, dureeEstimee,
            localisation, latitude, longitude, remote, clientId } = req.body

    if (!titre || !description || !budget || !clientId) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' })
    }

    // Créer la mission
    const mission = await prisma.mission.create({
      data: {
        titre, description, categorie, budget: parseFloat(budget),
        devise: devise || 'EUR', dureeEstimee, localisation,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        remote: remote || false, clientId, statut: 'OUVERTE'
      }
    })

    // Matching IA — trouver les seniors compatibles
    const seniors = await matchSeniors(mission.id, categorie, latitude, longitude)

    return res.status(201).json({ mission, seniorsSuggeres: seniors })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

// ==================== Matching IA Seniors ====================
async function matchSeniors(missionId: string, categorie: string, lat?: number, lng?: number) {
  const where: any = {
    stripeOnboarded: true,
    user: { isActive: true, kycStatus: 'VALIDATED' }
  }

  // Filtre par compétences / catégorie
  if (categorie) {
    where.OR = [
      { categories: { has: categorie } },
      { competences: { has: categorie } },
    ]
  }

  const seniors = await prisma.profilSenior.findMany({
    where,
    include: { user: { select: { prenom: true, pays: true, ville: true } } },
    orderBy: [
      { certification: 'desc' },
      { noteMoyenne: 'desc' },
      { nbMissions: 'desc' }
    ],
    take: 5
  })

  // Score de matching IA simplifié
  return seniors.map(senior => {
    let score = 0
    // Certification
    const certScores = { OR: 40, ARGENT: 30, BRONZE: 20, CONFIRME: 10, NOUVEAU: 5 }
    score += certScores[senior.certification] || 5
    // Note moyenne
    score += senior.noteMoyenne * 10
    // Géolocalisation bonus
    if (lat && lng && senior.latitude && senior.longitude) {
      const dist = getDistance(lat, lng, senior.latitude, senior.longitude)
      if (dist < 5) score += 20
      else if (dist < 20) score += 10
    }

    return { ...senior, scoreMatching: Math.min(100, Math.round(score)) }
  }).sort((a, b) => b.scoreMatching - a.scoreMatching)
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
