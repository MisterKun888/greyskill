// lib/db.ts — Base de données JSON locale MVP
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

type AnyRecord = Record<string, any>

function readTable(table: string): AnyRecord[] {
  const file = path.join(DATA_DIR, `${table}.json`)
  if (!fs.existsSync(file)) {
    const seed = getSeedData(table)
    fs.writeFileSync(file, JSON.stringify(seed, null, 2))
    return seed
  }
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) }
  catch { return [] }
}

function writeTable(table: string, data: AnyRecord[]): void {
  fs.writeFileSync(path.join(DATA_DIR, `${table}.json`), JSON.stringify(data, null, 2))
}

export const db = {
  findMany(table: string, where?: AnyRecord): AnyRecord[] {
    const all = readTable(table)
    if (!where) return all
    return all.filter(item => Object.entries(where).every(([k, v]) => item[k] === v))
  },

  findOne(table: string, where: AnyRecord): AnyRecord | null {
    return this.findMany(table, where)[0] || null
  },

  findById(table: string, id: string): AnyRecord | null {
    return readTable(table).find(item => item.id === id) || null
  },

  create(table: string, data: AnyRecord): AnyRecord {
    const all = readTable(table)
    const item = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    all.push(item)
    writeTable(table, all)
    return item
  },

  update(table: string, id: string, data: AnyRecord): AnyRecord | null {
    const all = readTable(table)
    const idx = all.findIndex(item => item.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() }
    writeTable(table, all)
    return all[idx]
  },

  delete(table: string, id: string): boolean {
    const all = readTable(table)
    const filtered = all.filter(item => item.id !== id)
    if (filtered.length === all.length) return false
    writeTable(table, filtered)
    return true
  },

  count(table: string, where?: AnyRecord): number {
    return this.findMany(table, where).length
  },
}

function getSeedData(table: string): AnyRecord[] {
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  const now = new Date().toISOString()

  const seeds: Record<string, AnyRecord[]> = {
    users: [
      { id: 'user-client-1', nom: 'Dupont', prenom: 'Marie', email: 'marie@demo.fr', role: 'CLIENT', passwordHash: 'demo', pays: 'FR', langue: 'fr', devise: 'EUR', ville: 'Paris', isActive: true, kycStatus: 'VALIDATED', createdAt: yesterday, updatedAt: yesterday },
      { id: 'user-senior-1', nom: 'Martin', prenom: 'Jean-Claude', email: 'jeanclaude@demo.fr', role: 'SENIOR', passwordHash: 'demo', pays: 'FR', langue: 'fr', devise: 'EUR', ville: 'Paris', isActive: true, kycStatus: 'VALIDATED', createdAt: yesterday, updatedAt: yesterday },
      { id: 'user-senior-2', nom: 'Laurent', prenom: 'Hashley', email: 'hashley@demo.com', role: 'SENIOR', passwordHash: 'demo', pays: 'US', langue: 'en', devise: 'USD', ville: 'Paris', isActive: true, kycStatus: 'VALIDATED', createdAt: yesterday, updatedAt: yesterday },
      { id: 'user-admin-1', nom: 'SVAY', prenom: 'Keo', email: 'admin@greyskill.net', role: 'ADMIN', passwordHash: 'demo', pays: 'FR', langue: 'fr', devise: 'EUR', ville: 'Paris', isActive: true, kycStatus: 'VALIDATED', createdAt: yesterday, updatedAt: yesterday },
    ],
    profils_seniors: [
      { id: 'profil-1', userId: 'user-senior-1', age: 67, bio: "Expert-comptable avec 35 ans d'expérience.", competences: ['Comptabilité', 'Fiscalité', 'Audit'], passions: ['Jardinage', 'Photographie'], categories: ['Comptabilité'], tarifHoraire: 45, experienceAns: 35, certification: 'OR', nbMissions: 14, noteMoyenne: 4.9, latitude: 48.8566, longitude: 2.3522, rayonKm: 20, stripeOnboarded: false, abonnement: 'ELITE', createdAt: yesterday, updatedAt: yesterday },
      { id: 'profil-2', userId: 'user-senior-2', age: 62, bio: "Ancienne directrice commerciale.", competences: ['Stratégie', 'Coaching', 'Management'], passions: ['Cuisine'], categories: ['Stratégie'], tarifHoraire: 60, experienceAns: 22, certification: 'OR', nbMissions: 11, noteMoyenne: 4.8, latitude: 48.8606, longitude: 2.3376, rayonKm: 30, stripeOnboarded: false, abonnement: 'CONFIRME', createdAt: yesterday, updatedAt: yesterday },
    ],
    missions: [
      { id: 'mission-1', titre: 'Audit comptable TPE — 5h', description: "Besoin d'un expert-comptable pour auditer ma comptabilité.", categorie: 'Comptabilité', budget: 250, devise: 'EUR', dureeEstimee: '5 heures', localisation: 'Paris 14e', remote: true, statut: 'EN_COURS', clientId: 'user-client-1', seniorId: 'profil-1', latitude: 48.830, longitude: 2.324, createdAt: yesterday, updatedAt: now },
      { id: 'mission-2', titre: 'Coaching stratégie commerciale', description: 'Startup cherche coach commercial.', categorie: 'Stratégie', budget: 480, devise: 'EUR', dureeEstimee: '8 heures', localisation: 'Visio', remote: true, statut: 'OUVERTE', clientId: 'user-client-1', seniorId: null, latitude: 48.860, longitude: 2.338, createdAt: now, updatedAt: now },
      { id: 'mission-3', titre: 'Cours de jardinage — 3h', description: "Particulier cherche un passionné de jardinage.", categorie: 'Jardinage', budget: 90, devise: 'EUR', dureeEstimee: '3 heures', localisation: 'Boulogne-Billancourt', remote: false, statut: 'OUVERTE', clientId: 'user-client-1', seniorId: null, latitude: 48.835, longitude: 2.240, createdAt: now, updatedAt: now },
    ],
    messages: [
      { id: 'msg-1', missionId: 'mission-1', senderId: 'user-senior-1', contenu: 'Bonjour Marie ! Je suis disponible mardi matin.', bloque: false, typeMedia: 'text', lu: true, createdAt: yesterday },
      { id: 'msg-2', missionId: 'mission-1', senderId: 'user-client-1', contenu: 'Bonjour Jean-Claude ! Parfait, mardi 9h me convient.', bloque: false, typeMedia: 'text', lu: true, createdAt: now },
    ],
    candidatures: [], notes: [], paiements: [], litiges: [],
  }
  return seeds[table] || []
}
