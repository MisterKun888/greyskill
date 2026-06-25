// pages/api/payments/simulate.ts
// Simulation de paiement Stripe — aucune clé requise

import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'greyskill-dev-secret'
const COMMISSION = 0.15

function getUser(req: NextApiRequest) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  try { return jwt.verify(auth.slice(7), JWT_SECRET) as any }
  catch { return null }
}

// Email simulé — log dans la console
function sendEmailLog(to: string, subject: string, body: string) {
  console.log(`\n📧 EMAIL (simulé)`)
  console.log(`À : ${to}`)
  console.log(`Sujet : ${subject}`)
  console.log(`Contenu : ${body}`)
  console.log(`---`)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const user = getUser(req)
  if (!user) return res.status(401).json({ error: 'Non authentifié' })

  const { action, missionId, cardNumber } = req.body

  // ==================== CRÉER PAIEMENT (séquestre) ====================
  if (action === 'create') {
    const mission = db.findById('missions', missionId)
    if (!mission) return res.status(404).json({ error: 'Mission introuvable' })

    const montant = mission.budget
    const commission = montant * COMMISSION
    const seniorRecoit = montant - commission

    // Simuler un délai réseau
    await new Promise(r => setTimeout(r, 800))

    // Carte test valide : 4242 4242 4242 4242 — refusée : 4000 0000 0000 0002
    const isDeclined = cardNumber?.replace(/\s/g, '') === '4000000000000002'
    if (isDeclined) {
      return res.status(402).json({ error: 'Carte refusée (simulation)', code: 'card_declined' })
    }

    // Créer le paiement en séquestre
    const paiementId = `pi_sim_${Date.now()}`
    const paiement = db.create('paiements', {
      stripePaymentIntentId: paiementId,
      missionId, userId: user.id,
      montantTotal: montant, commission, montantSenior: seniorRecoit,
      devise: mission.devise || 'EUR', statut: 'SEQUESTRE',
    })

    // Mettre à jour le statut mission
    db.update('missions', missionId, { statut: 'EN_COURS' })

    // Email simulé au client
    const client = db.findById('users', user.id)
    sendEmailLog(
      client?.email || 'client@demo.fr',
      '✅ Paiement sécurisé — GreySkill',
      `Votre paiement de ${montant}€ pour "${mission.titre}" est sécurisé en séquestre.`
    )

    return res.status(200).json({
      success: true,
      paiementId,
      paiement,
      simulation: true,
      message: `✅ Paiement ${montant}€ sécurisé en séquestre (simulation)`
    })
  }

  // ==================== LIBÉRER PAIEMENT (mission terminée) ====================
  if (action === 'capture') {
    const mission = db.findById('missions', missionId)
    if (!mission) return res.status(404).json({ error: 'Mission introuvable' })

    const paiements = db.findMany('paiements', { missionId })
    const paiement = paiements[0]
    if (!paiement) return res.status(404).json({ error: 'Paiement introuvable' })

    await new Promise(r => setTimeout(r, 600))

    // Libérer le paiement
    db.update('paiements', paiement.id, { statut: 'LIBERE', dateCapture: new Date().toISOString() })
    db.update('missions', missionId, { statut: 'TERMINEE', dateFin: new Date().toISOString() })

    // Mise à jour certification senior
    const profil = db.findOne('profils_seniors', { userId: mission.seniorId })
    if (profil) {
      const nbMissions = (profil.nbMissions || 0) + 1
      let certification = profil.certification
      if (nbMissions >= 12) certification = 'OR'
      else if (nbMissions >= 8) certification = 'ARGENT'
      else if (nbMissions >= 5) certification = 'BRONZE'
      else if (nbMissions >= 3) certification = 'CONFIRME'
      db.update('profils_seniors', profil.id, { nbMissions, certification })
    }

    // Emails simulés
    const client = db.findById('users', mission.clientId)
    const seniorUser = profil ? db.findById('users', profil.userId) : null
    sendEmailLog(client?.email || '', '🎉 Mission terminée — GreySkill', `Mission "${mission.titre}" validée !`)
    sendEmailLog(seniorUser?.email || '', `💰 Paiement reçu — ${paiement.montantSenior}€`, `Bravo pour la mission "${mission.titre}" !`)

    return res.status(200).json({
      success: true,
      simulation: true,
      montantSenior: paiement.montantSenior,
      commission: paiement.commission,
      message: `💰 ${paiement.montantSenior}€ versés au senior (simulation)`
    })
  }

  // ==================== REMBOURSEMENT (litige) ====================
  if (action === 'refund') {
    const { montant, raison } = req.body
    const paiements = db.findMany('paiements', { missionId })
    const paiement = paiements[0]
    if (!paiement) return res.status(404).json({ error: 'Paiement introuvable' })

    db.update('paiements', paiement.id, { statut: 'REMBOURSE' })
    db.update('missions', missionId, { statut: 'LITIGE' })

    return res.status(200).json({
      success: true, simulation: true,
      montantRembourse: montant,
      message: `↩️ ${montant}€ remboursés au client (simulation)`
    })
  }

  return res.status(400).json({ error: 'Action inconnue' })
}
