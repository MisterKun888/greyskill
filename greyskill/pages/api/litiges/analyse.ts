// pages/api/litiges/analyse.ts
// IA de gestion des litiges GreySkill

import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

// Garanties minimum selon certification
const GARANTIES_CERTIFICATION = {
  OR: 0.80,       // Senior Or → garde au moins 80%
  ARGENT: 0.65,
  BRONZE: 0.50,
  CONFIRME: 0.35,
  NOUVEAU: 0.20,
}

// Poids des motifs de litige
const POIDS_MOTIF = {
  qualite: 0.6,
  incomplet: 0.8,
  delai: 0.5,
  absent: 0.9,
  autre: 0.4,
}

// Poids des preuves
const POIDS_PREUVES = { forte: 1.0, moyenne: 0.6, faible: 0.2 }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { missionId, motif, description, preuves, noteClient } = req.body

  try {
    // 1. Récupérer la mission + senior + paiement
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        senior: { include: { user: true } },
        client: true,
        paiements: true,
        messages: { where: { bloque: false } }, // Historique chat non bloqué
      }
    })

    if (!mission) return res.status(404).json({ error: 'Mission introuvable' })
    if (mission.statut === 'LITIGE') return res.status(400).json({ error: 'Litige déjà ouvert' })

    const paiement = mission.paiements[0]
    const montantTotal = paiement?.montantTotal || mission.budget
    const certification = mission.senior?.certification || 'NOUVEAU'

    // 2. Calcul IA du remboursement
    const poidsMotif = POIDS_MOTIF[motif as keyof typeof POIDS_MOTIF] || 0.5
    const poidsPreuve = POIDS_PREUVES[preuves as keyof typeof POIDS_PREUVES] || 0.5
    const noteImpact = noteClient ? (5 - noteClient) / 5 : 0.5

    // Score = motif × preuves × note — ajusté par le nombre de messages (travail effectué)
    const nbMessages = mission.messages.length
    const travailEffectueScore = Math.min(1, nbMessages / 20) // Plus de messages = plus de travail
    const rawScore = poidsMotif * poidsPreuve * noteImpact * (1 - travailEffectueScore * 0.3)

    // Garantie minimum senior selon certification
    const garantieSenior = GARANTIES_CERTIFICATION[certification as keyof typeof GARANTIES_CERTIFICATION] || 0.20
    const remboursementMax = montantTotal * (1 - garantieSenior)

    // Montant final remboursé
    const montantRembourse = Math.min(montantTotal * rawScore, remboursementMax)
    const montantSeniorGarde = montantTotal - montantRembourse
    const commissionDeduire = montantSeniorGarde * 0.15
    const seniorNet = montantSeniorGarde - commissionDeduire
    const scoreIA = Math.min(1, rawScore)

    // 3. Créer le litige en BDD
    const litige = await prisma.litige.create({
      data: {
        missionId,
        clientId: mission.clientId,
        motif,
        description,
        preuves: preuves ? [preuves] : [],
        statut: 'EN_ANALYSE',
        scoreIA,
        montantRembourse: parseFloat(montantRembourse.toFixed(2)),
      }
    })

    // Mettre la mission en litige
    await prisma.mission.update({
      where: { id: missionId },
      data: { statut: 'LITIGE' }
    })

    return res.status(200).json({
      litige,
      analyse: {
        scoreIA: parseFloat((scoreIA * 100).toFixed(1)),
        montantTotal,
        montantRembourse: parseFloat(montantRembourse.toFixed(2)),
        seniorGarde: parseFloat(montantSeniorGarde.toFixed(2)),
        seniorNet: parseFloat(seniorNet.toFixed(2)),
        certificationSenior: certification,
        garantieSeniorPct: garantieSenior * 100,
        raisonnement: [
          `Certification ${certification} → garantie minimum ${(garantieSenior * 100).toFixed(0)}%`,
          `Motif "${motif}" (poids ${(poidsMotif * 100).toFixed(0)}%)`,
          `Preuves "${preuves}" (poids ${(poidsPreuve * 100).toFixed(0)}%)`,
          `Note client ${noteClient}/5`,
          `${nbMessages} messages dans la conversation (travail effectué)`,
          `Décision : remboursement ${montantRembourse.toFixed(2)}€ sur ${montantTotal.toFixed(2)}€`,
        ]
      }
    })

  } catch (err: any) {
    console.error('[Litige IA]', err)
    return res.status(500).json({ error: err.message })
  }
}

// ==================== Valider et exécuter le remboursement ====================
export async function validerRemboursement(litigeId: string) {
  const litige = await prisma.litige.findUnique({
    where: { id: litigeId },
    include: { mission: { include: { paiements: true } } }
  })

  if (!litige || !litige.montantRembourse) throw new Error('Litige introuvable')

  const paiement = litige.mission.paiements[0]
  if (!paiement) throw new Error('Paiement introuvable')

  // Remboursement Stripe
  const refund = await stripe.refunds.create({
    payment_intent: paiement.stripePaymentIntentId,
    amount: Math.round(litige.montantRembourse * 100),
    reason: 'fraudulent',
    metadata: { litige_id: litigeId }
  })

  // Mise à jour BDD
  await prisma.litige.update({
    where: { id: litigeId },
    data: { statut: 'RESOLU', resolution: `Remboursement Stripe: ${refund.id}` }
  })

  return refund
}
