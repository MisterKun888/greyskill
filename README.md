# 🚀 GreySkill MVP — Déploiement Vercel (0 clé requise)

## ✅ Ce qui fonctionne SANS configuration
- Site vitrine 6 pages
- App complète (login, dashboard, missions, chat, carte)
- Base de données JSON locale (fichiers dans /data)
- Paiement simulé (cartes test, séquestre fictif)
- Carte Leaflet + OpenStreetMap (100% gratuit)
- Anti-contournement chat
- Comptes démo prêts

---

## ÉTAPE 1 — Installer en local (2 min)
```bash
cd greyskill-mvp
npm install
npm run dev
# → http://localhost:3000
```

**Comptes démo** (mot de passe : `demo123`) :
- `marie@demo.fr` → Client
- `jeanclaude@demo.fr` → Senior 🥇
- `admin@greyskill.net` → Admin

---

## ÉTAPE 2 — Déployer sur Vercel (3 min)

### Option A — Via GitHub (recommandé)
```bash
# 1. Créer un repo GitHub
git init
git add .
git commit -m "GreySkill MVP initial"
git remote add origin https://github.com/VOTRE_USER/greyskill-mvp.git
git push -u origin main

# 2. Aller sur https://vercel.com
# 3. "Add New Project" → importer votre repo GitHub
# 4. Cliquer "Deploy" — AUCUNE variable à configurer
# ✅ Site live en 2 minutes !
```

### Option B — Via CLI
```bash
npm install -g vercel
vercel login
vercel --prod
# Répondre : Next.js → Yes → Yes → Yes
# ✅ URL fournie automatiquement
```

---

## ÉTAPE 3 — Variables optionnelles (pour activer les vraies fonctions)

Dans Vercel Dashboard → Settings → Environment Variables :

| Variable | Quand l'ajouter | Source |
|---|---|---|
| `STRIPE_SECRET_KEY` | Pour vrais paiements | dashboard.stripe.com |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Pour vrais paiements | dashboard.stripe.com |
| `RESEND_API_KEY` | Pour vrais emails | resend.com |
| `DATABASE_URL` | Pour PostgreSQL prod | neon.tech |

**Sans ces variables → tout fonctionne en mode simulation.**

---

## ⚠️ Important : Base de données JSON sur Vercel

Vercel est **serverless** — le système de fichiers est read-only en production.

**Solution pour la prod :**
1. Migrer vers [Neon.tech](https://neon.tech) (PostgreSQL gratuit)
2. Ou utiliser [Vercel KV](https://vercel.com/storage/kv) (Redis gratuit)
3. Ou [PlanetScale](https://planetscale.com) (MySQL gratuit)

**Pour le MVP/démo** : les données démo sont hardcodées dans `lib/db.ts` → ça marche parfaitement sur Vercel.

---

## 📱 App Mobile — Lancer en local

```bash
cd greyskill-app
npm install
npx expo start
# Scanner le QR code avec Expo Go (iOS/Android)
```

**Pointer vers le MVP local :**
Dans `.env` de l'app mobile :
```
EXPO_PUBLIC_API_URL=http://VOTRE_IP_LOCALE:3000
# Ex: http://192.168.1.42:3000
```

---

## 🔧 Structure des fichiers

```
greyskill-mvp/
├── pages/
│   ├── index.tsx          ← Site vitrine
│   ├── app.tsx            ← App complète (login, dashboard, chat, carte, paiement)
│   └── api/
│       ├── auth/login.ts  ← Auth JWT
│       ├── auth/register.ts
│       ├── missions/      ← CRUD missions + matching
│       ├── messages/      ← Chat + anti-contournement
│       └── payments/      ← Paiement simulé ou Stripe
├── components/
│   └── map/LeafletMap.tsx ← Carte gratuite OpenStreetMap
├── lib/
│   └── db.ts              ← Base JSON locale + données démo
├── styles/globals.css
├── vercel.json            ← Config Vercel (0 var obligatoire)
└── .env.local             ← Variables locales
```
