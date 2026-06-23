# 🚀 GreySkill — Guide de déploiement Vercel

## Structure du projet

```
greyskill/
├── pages/
│   ├── api/
│   │   ├── payments/checkout.ts    ← Stripe Checkout + séquestre
│   │   ├── webhooks/stripe.ts      ← Webhooks Stripe (libération auto)
│   │   ├── missions/index.ts       ← CRUD missions + matching IA + géoloc
│   │   └── litiges/analyse.ts      ← IA litige + remboursement auto
│   ├── index.tsx                   ← Page d'accueil
│   ├── pour-les-seniors.tsx
│   ├── pour-les-clients.tsx
│   ├── notre-histoire.tsx
│   ├── comment-devenir-freelance.tsx
│   └── faq.tsx
├── lib/
│   └── email.ts                    ← Resend emails
├── prisma/
│   └── schema.prisma               ← Base de données complète
├── next.config.js                  ← i18n 20 langues + SEO
├── vercel.json                     ← Config Vercel
├── .env.local                      ← Variables d'environnement
└── package.json
```

---

## ⚡ Déploiement en 5 étapes

### ÉTAPE 1 — Base de données (5 min)
```bash
# Créer une base PostgreSQL GRATUITE sur Neon.tech
# 1. Aller sur https://neon.tech → Sign up
# 2. New Project → "greyskill"
# 3. Copier la connection string dans .env.local → DATABASE_URL
```

### ÉTAPE 2 — Stripe (10 min)
```bash
# 1. https://dashboard.stripe.com → Developers → API Keys
# 2. Copier pk_test_... et sk_test_... dans .env.local
# 3. Webhooks → Add endpoint → URL: https://votre-domaine.vercel.app/api/webhooks/stripe
# 4. Sélectionner ces événements :
#    - payment_intent.amount_capturable_updated
#    - payment_intent.captured
#    - payment_intent.payment_failed
#    - charge.refunded
#    - account.updated
# 5. Copier le Signing Secret → STRIPE_WEBHOOK_SECRET
```

### ÉTAPE 3 — Email Resend (2 min)
```bash
# 1. https://resend.com → Sign up gratuit (3000 emails/mois)
# 2. API Keys → Create API Key
# 3. Copier la clé → RESEND_API_KEY dans .env.local
```

### ÉTAPE 4 — Déployer sur Vercel (3 min)
```bash
# Option A — Via CLI (recommandé)
npm install -g vercel
cd greyskill
vercel login
vercel --prod

# Option B — Via GitHub
# 1. Pousser le code sur GitHub
# 2. https://vercel.com → Import Git Repository
# 3. Sélectionner le repo greyskill
# 4. Cliquer Deploy

# Dans les deux cas, ajouter les variables d'env dans
# Vercel Dashboard → Settings → Environment Variables
```

### ÉTAPE 5 — Initialiser la base de données
```bash
# Générer le client Prisma
npx prisma generate

# Créer les tables en production
npx prisma db push

# (Optionnel) Ajouter des données de test
npx prisma db seed
```

---

## 🔑 Variables Vercel à configurer

Dans **Vercel Dashboard → Settings → Environment Variables** :

| Variable | Valeur | Source |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | pk_test_... | Stripe Dashboard |
| `STRIPE_SECRET_KEY` | sk_test_... | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | whsec_... | Stripe Webhooks |
| `DATABASE_URL` | postgresql://... | Neon.tech |
| `NEXTAUTH_SECRET` | (générer) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | https://greyskill.vercel.app | Votre URL Vercel |
| `RESEND_API_KEY` | re_... | Resend.com |

---

## 🌍 Multilingue — Configuration i18n

Le site supporte **20 langues** configurées dans `next.config.js`.

Les traductions vont dans `/public/locales/[langue]/common.json` :

```json
// public/locales/fr/common.json
{
  "hero.title": "La Plateforme Qui Redonne Leur Place aux Seniors",
  "hero.subtitle": "Connectez-vous avec des seniors experts",
  "nav.seniors": "Seniors",
  "nav.clients": "Clients",
  "cta.find": "Trouver le Talent pour Ma Mission",
  "cta.join": "Rejoindre GreySkill"
}
```

```json
// public/locales/en/common.json
{
  "hero.title": "The Platform That Gives Seniors Their Place Back",
  "hero.subtitle": "Connect with senior experts",
  "nav.seniors": "Seniors",
  "nav.clients": "Clients",
  "cta.find": "Find the Talent for My Mission",
  "cta.join": "Join GreySkill"
}
```

---

## 📊 SEO Programmatique

Pattern URL automatique : `/[locale]/[categorie]/[ville]`

```
greyskill.net/fr/plomberie/paris
greyskill.net/es/fontaneria/madrid
greyskill.net/en/gardening/london
greyskill.net/de/buchhaltung/berlin
```

Chaque page génère automatiquement :
- H1 dynamique : "Trouvez un [Métier] Senior Expert à [Ville]"
- Meta title & description SEO
- Schema.org JSON-LD (Service, JobPosting)
- Balises hreflang pour toutes les langues
- Sitemap XML dynamique

---

## 💳 Flux Stripe — Résumé

```
Client paye → PaymentIntent (capture_method: manual)
     ↓
Argent bloqué en séquestre
     ↓
Mission en cours → Chat sécurisé GreySkill
     ↓
Client clique "Mission terminée"
     ↓
stripe.paymentIntents.capture() → Déclenche webhook
     ↓
Webhook payment_intent.captured → 
  - 85% versé au senior (Stripe Connect)
  - 15% retenu par GreySkill
  - Factures générées automatiquement
  - Emails envoyés (Resend)
  - Certification senior mise à jour
```

---

## 🔒 Anti-contournement

Le système bloque automatiquement dans la messagerie :
- Numéros de téléphone (06, 07, +33, internationaux)
- Emails (xxx@xxx.com)
- URLs (http://, www.)
- Réseaux sociaux (@pseudo, Instagram, LinkedIn, WhatsApp...)

---

## 🆘 Support

- Email : support@greyskill.net
- Docs Stripe : https://stripe.com/docs
- Docs Vercel : https://vercel.com/docs
- Docs Prisma : https://www.prisma.io/docs
- Neon DB : https://neon.tech/docs
