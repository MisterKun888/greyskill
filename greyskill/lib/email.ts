// lib/email.ts — Service d'envoi d'emails GreySkill (Resend)

interface EmailPayload {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: EmailPayload) {
  const fromAddr = from || `GreySkill <${process.env.EMAIL_FROM}>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromAddr, to, subject, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[Email] Erreur Resend:', err)
    throw new Error(`Email failed: ${err}`)
  }

  return res.json()
}
