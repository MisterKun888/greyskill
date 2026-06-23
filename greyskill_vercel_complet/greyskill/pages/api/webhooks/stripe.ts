// pages/api/webhooks/stripe.ts
// Gère TOUS les événements Stripe pour GreySkill

import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import { sendEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
const prisma = new PrismaClient()

// Désactiver le body parser Next.js (Stripe envoie du raw)
export const config = { api: { bodyParser: false } }

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)
  const signature = req.headers['stripe-signature'] as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[Webhook] Signature invalide:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  console.log(`[Webhook] Événement: ${event.type}`)

  try {
    switch (event.type) {

      // ============================================================
      // 1. PAIEMENT AUTORISÉ → Argent en séquestre
      // ============================================================
      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object as Stripe.PaymentIntent
        const { mission_id, client_id, senior_id } = pi.metadata

        await prisma.paiement.upsert({
          where: { stripePaymentIntentId: pi.id },
          update: { statut: 'SEQUESTRE' },
          create: {
            stripePaymentIntentId: pi.id,
            missionId: mission_id,
            userId: client_id,
            montantTotal: pi.amount / 100,
            commission: pi.application_fee_amount! / 100,
            montantSenior: (pi.amount - pi.application_fee_amount!) / 100,
            devise: pi.currency.toUpperCase(),
            statut: 'SEQUESTRE',
          }
        })

        // Email client — confirmation paiement bloqué
        const client = await prisma.user.findUnique({ where: { id: client_id } })
        const mission = await prisma.mission.findUnique({ where: { id: mission_id } })
        if (client && mission) {
          await sendEmail({
            to: client.email,
            subject: `✅ Paiement sécurisé — Mission "${mission.titre}"`,
            html: emailPaiementBloque(client.prenom, mission.titre, pi.amount / 100, pi.currency.toUpperCase()),
          })
        }
        break
      }

      // ============================================================
      // 2. MISSION TERMINÉE → Libérer le paiement au senior
      // ============================================================
      case 'payment_intent.captured': {
        const pi = event.data.object as Stripe.PaymentIntent
        const { mission_id, client_id, senior_id } = pi.metadata

        // Mise à jour BDD
        await prisma.paiement.update({
          where: { stripePaymentIntentId: pi.id },
          data: { statut: 'LIBERE', dateCapture: new Date() }
        })

        await prisma.mission.update({
          where: { id: mission_id },
          data: { statut: 'TERMINEE', dateFin: new Date() }
        })

        // Mise à jour certification senior
        await updateCertificationSenior(senior_id)

        // Emails automatiques
        const [client, seniorUser, mission] = await Promise.all([
          prisma.user.findUnique({ where: { id: client_id } }),
          prisma.user.findUnique({ where: { id: senior_id } }),
          prisma.mission.findUnique({ where: { id: mission_id } }),
        ])

        const montantSenior = (pi.amount - (pi.application_fee_amount || 0)) / 100
        const commission = (pi.application_fee_amount || 0) / 100

        if (client && seniorUser && mission) {
          // Email client
          await sendEmail({
            to: client.email,
            subject: `🎉 Mission terminée — Merci d'avoir utilisé GreySkill !`,
            html: emailMissionTermineeClient(client.prenom, mission.titre, seniorUser.prenom),
          })
          // Email senior avec montant reçu
          await sendEmail({
            to: seniorUser.email,
            subject: `💰 Paiement reçu — ${montantSenior.toFixed(2)} ${pi.currency.toUpperCase()}`,
            html: emailPaiementSenior(seniorUser.prenom, mission.titre, montantSenior, commission, pi.currency.toUpperCase()),
          })
        }
        break
      }

      // ============================================================
      // 3. PAIEMENT ÉCHOUÉ → Annuler la mission
      // ============================================================
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const { mission_id, client_id } = pi.metadata

        await prisma.mission.update({
          where: { id: mission_id },
          data: { statut: 'ANNULEE' }
        })

        const client = await prisma.user.findUnique({ where: { id: client_id } })
        const mission = await prisma.mission.findUnique({ where: { id: mission_id } })
        if (client && mission) {
          await sendEmail({
            to: client.email,
            subject: `⚠️ Paiement échoué — Mission "${mission.titre}"`,
            html: `<p>Bonjour ${client.prenom},<br>Votre paiement a échoué. Veuillez réessayer sur <a href="https://greyskill.app">GreySkill</a>.</p>`,
          })
        }
        break
      }

      // ============================================================
      // 4. REMBOURSEMENT (Litige) → Traitement partiel
      // ============================================================
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const refundAmount = (charge.amount_refunded || 0) / 100

        await prisma.paiement.updateMany({
          where: { stripePaymentIntentId: charge.payment_intent as string },
          data: { statut: charge.refunded ? 'REMBOURSE' : 'PARTIEL' }
        })
        console.log(`[Litige] Remboursement de ${refundAmount}€ effectué`)
        break
      }

      // ============================================================
      // 5. KYC SENIOR VALIDÉ par Stripe Connect
      // ============================================================
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        if (account.details_submitted && account.charges_enabled) {
          await prisma.profilSenior.updateMany({
            where: { stripeAccountId: account.id },
            data: { stripeOnboarded: true }
          })
          console.log(`[KYC] Senior ${account.id} validé par Stripe`)
        }
        break
      }

      default:
        console.log(`[Webhook] Événement non géré: ${event.type}`)
    }

    return res.status(200).json({ received: true })

  } catch (err: any) {
    console.error('[Webhook] Erreur traitement:', err)
    return res.status(500).json({ error: 'Erreur interne webhook' })
  }
}

// ============================================================
// Mise à jour automatique des certifications
// ============================================================
async function updateCertificationSenior(userId: string) {
  const senior = await prisma.profilSenior.findUnique({ where: { userId } })
  if (!senior) return

  const nbMissions = senior.nbMissions + 1
  let certification = senior.certification

  // Règles de certification GreySkill
  if (nbMissions >= 12) certification = 'OR'
  else if (nbMissions >= 8) certification = 'ARGENT'
  else if (nbMissions >= 5) certification = 'BRONZE'
  else if (nbMissions >= 3 && senior.noteMoyenne >= 4) certification = 'CONFIRME'

  await prisma.profilSenior.update({
    where: { userId },
    data: { nbMissions, certification }
  })

  console.log(`[Certification] Senior ${userId}: ${certification} (${nbMissions} missions)`)
}

// ============================================================
// Templates emails
// ============================================================
function emailPaiementBloque(prenom: string, titre: string, montant: number, devise: string) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a1a2e;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:#c8a96e;margin:0;font-size:24px">GreySkill</h1>
      </div>
      <div style="background:#f9f9f7;padding:32px;border-radius:0 0 12px 12px">
        <h2 style="color:#1a1a2e">Bonjour ${prenom} 👋</h2>
        <p>Votre paiement de <strong>${montant.toFixed(2)} ${devise}</strong> pour la mission <strong>"${titre}"</strong> a bien été reçu et <strong>sécurisé en séquestre</strong>.</p>
        <div style="background:#f0fdf4;border:1px solid #9de0bc;border-radius:8px;padding:16px;margin:16px 0">
          🔒 <strong>Votre argent est protégé.</strong> Il sera versé au senior uniquement après validation de la mission.
        </div>
        <p style="color:#666;font-size:14px">En cas de problème, contactez <a href="mailto:support@greyskill.net">support@greyskill.net</a></p>
        <p>L'équipe GreySkill</p>
      </div>
    </div>`
}

function emailMissionTermineeClient(prenom: string, titre: string, seniorPrenom: string) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a1a2e;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:#c8a96e;margin:0">GreySkill</h1>
      </div>
      <div style="background:#f9f9f7;padding:32px;border-radius:0 0 12px 12px">
        <h2>🎉 Mission terminée, ${prenom} !</h2>
        <p>La mission <strong>"${titre}"</strong> avec <strong>${seniorPrenom}</strong> est terminée.</p>
        <p>N'oubliez pas de <strong>noter votre expert</strong> — cela l'aide à progresser dans les certifications GreySkill.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background:#c8a96e;color:#1a1a2e;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin:16px 0">
          ⭐ Laisser un avis
        </a>
        <p>Merci de faire confiance à GreySkill !</p>
      </div>
    </div>`
}

function emailPaiementSenior(prenom: string, titre: string, montant: number, commission: number, devise: string) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1a1a2e;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:#c8a96e;margin:0">GreySkill</h1>
      </div>
      <div style="background:#f9f9f7;padding:32px;border-radius:0 0 12px 12px">
        <h2>💰 Paiement reçu, ${prenom} !</h2>
        <p>Mission <strong>"${titre}"</strong> terminée avec succès.</p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0">
          <div style="font-size:32px;font-weight:900;color:#1a7a4a">${montant.toFixed(2)} ${devise}</div>
          <div style="color:#666;font-size:14px">Après commission GreySkill (${commission.toFixed(2)} ${devise})</div>
        </div>
        <p>Le virement est en cours sur votre compte Stripe. Délai habituel : 2-3 jours ouvrés.</p>
        <p>Bravo et merci de contribuer à la mission GreySkill ! 🏆</p>
      </div>
    </div>`
}
