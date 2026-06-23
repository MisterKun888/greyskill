// pages/api/payments/checkout.ts
// Crée une session Stripe Checkout avec séquestre automatique

import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
const prisma = new PrismaClient()

const COMMISSION_RATE = 0.15 // 15% GreySkill

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { missionId, clientId } = req.body

  try {
    // 1. Récupérer la mission
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { client: true, senior: { include: { user: true } } }
    })

    if (!mission) return res.status(404).json({ error: 'Mission introuvable' })
    if (mission.statut !== 'ASSIGNEE') return res.status(400).json({ error: 'Mission non assignée' })

    const montantCentimes = Math.round(mission.budget * 100)
    const commissionCentimes = Math.round(montantCentimes * COMMISSION_RATE)
    const seniorCentimes = montantCentimes - commissionCentimes

    // 2. Vérifier que le senior a un compte Stripe Connect
    const seniorStripeId = mission.senior?.stripeAccountId
    if (!seniorStripeId) {
      return res.status(400).json({ error: 'Senior non configuré sur Stripe' })
    }

    // 3. Créer la session Checkout avec capture manuelle (séquestre)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: mission.devise.toLowerCase(),
          product_data: {
            name: mission.titre,
            description: `Mission GreySkill · Senior : ${mission.senior?.user.prenom} ${mission.senior?.user.nom[0]}.`,
            metadata: { missionId, type: 'greyskill_mission' }
          },
          unit_amount: montantCentimes,
        },
        quantity: 1,
      }],
      mode: 'payment',
      payment_intent_data: {
        capture_method: 'manual', // 🔒 SÉQUESTRE — argent bloqué
        application_fee_amount: commissionCentimes, // 15% GreySkill
        transfer_data: {
          destination: seniorStripeId, // Virement auto au senior
        },
        metadata: {
          mission_id: missionId,
          client_id: clientId,
          senior_id: mission.seniorId!,
          commission: commissionCentimes.toString(),
          senior_amount: seniorCentimes.toString(),
        }
      },
      customer_email: mission.client.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/mission/${missionId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/mission/${missionId}`,
      locale: (mission.client.langue as Stripe.Checkout.SessionCreateParams.Locale) || 'fr',
    })

    // 4. Sauvegarder la session en BDD
    await prisma.mission.update({
      where: { id: missionId },
      data: {
        stripeSessionId: session.id,
        statut: 'EN_COURS',
        montantPaye: mission.budget,
        commission: commissionCentimes / 100,
        montantSenior: seniorCentimes / 100,
      }
    })

    return res.status(200).json({ sessionId: session.id, url: session.url })

  } catch (err: any) {
    console.error('[Stripe Checkout]', err)
    return res.status(500).json({ error: err.message })
  }
}
