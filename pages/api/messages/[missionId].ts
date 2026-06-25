// pages/api/messages/[missionId].ts
import { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'greyskill-dev-secret'

const BLOCKED_PATTERNS = [
  /\b0[67]\d{8}\b/, /\+\d{1,3}[\s-]?\d{6,}/,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/,
  /https?:\/\/\S+/, /www\.\S+\.\S+/,
  /@[a-zA-Z0-9._]+/,
  /\b(whatsapp|telegram|signal|instagram|linkedin|facebook|wechat|viber|skype)\b/i,
]

function detectContournement(text: string) {
  return BLOCKED_PATTERNS.some(p => p.test(text))
}

function getUser(req: NextApiRequest) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  try { return jwt.verify(auth.slice(7), JWT_SECRET) as any }
  catch { return null }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { missionId } = req.query

  // GET — récupérer messages
  if (req.method === 'GET') {
    const messages = db.findMany('messages', { missionId: missionId as string })
    const enriched = messages.map(m => {
      const sender = db.findById('users', m.senderId)
      return { ...m, sender: sender ? { prenom: sender.prenom, avatar: sender.avatar } : { prenom: 'Système' } }
    })
    return res.status(200).json({ messages: enriched.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )})
  }

  // POST — envoyer message
  if (req.method === 'POST') {
    const user = getUser(req)
    if (!user) return res.status(401).json({ error: 'Non authentifié' })

    const { contenu, typeMedia, mediaUrl } = req.body
    if (!contenu) return res.status(400).json({ error: 'Message vide' })

    const bloque = detectContournement(contenu)

    const message = db.create('messages', {
      missionId: missionId as string,
      senderId: user.id,
      contenu: bloque
        ? `[Message bloqué] Tentative de partage de coordonnées détectée.`
        : contenu,
      bloque, typeMedia: typeMedia || 'text', mediaUrl, lu: false,
    })

    const sender = db.findById('users', user.id)
    return res.status(201).json({
      message: { ...message, sender: { prenom: sender?.prenom || 'Vous' } },
      bloque,
      blockedReason: bloque ? '🛡️ Coordonnées directes interdites. Restez sur GreySkill.' : null,
    })
  }

  return res.status(405).end()
}
