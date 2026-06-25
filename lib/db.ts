// lib/db.ts — Base de données JSON locale pour le MVP
// Zéro PostgreSQL, zéro configuration, données persistées en fichiers JSON

import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const DATA_DIR = path.join(process.cwd(), 'data')

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

// ========================
// HELPERS LECTURE / ÉCRITURE
// ========================
function readTable<T>(table: string): T[] {
  const file = path.join(DATA_DIR, `${table}.json`)
  if (!fs.existsSync(file)) {
    // Initialiser avec des données de démo
    const seed = getSeedData(table)
    fs.writeFileSync(file, JSON.stringify(seed, null, 2))
    return seed as T[]
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

function writeTable<T>(table: string, data: T[]): void {
  const file = path.join(DATA_DIR, `${table}.json`)
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

// ========================
// CRUD GÉNÉRIQUE
// ========================
export const db = {
  // Trouver tous
  findMany<T extends { id: string }>(table: string, where?: Partial<T>): T[] {
    const all = readTable<T>(table)
    if (!where) return all
    return all.filter(item =>
      Object.entries(where).every(([k, v]) => (item as any)[k] === v)
    )
  },

  // Trouver un seul
  findOne<T extends { id: string }>(table: string, where: Partial<T>): T | null {
    const results = this.findMany<T>(table, where)
    return results[0] || null
  },

  // Trouver par ID
  findById<T extends { id: string }>(table: string, id: string): T | null {
    const all = readTable<T>(table)
    return all.find(item => item.id === id) || null
  },

  // Créer
  create<T extends { id?: string; createdAt?: string; updatedAt?: string }>(
    table: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): T {
    const all = readTable<T>(table)
    const item = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as T
    all.push(item)
    writeTable(table, all)
    return item
  },

  // Mettre à jour
  update<T extends { id: string; updatedAt?: string }>(
    table: string, id: string, data: Partial<T>
  ): T | null {
    const all = readTable<T>(table)
    const idx = all.findIndex(item => item.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() }
    writeTable(table, all)
    return all[idx]
  },

  // Supprimer
  delete(table: string, id: string): boolean {
    const all = readTable<{ id: string }>(table)
    const filtered = all.filter(item => item.id !== id)
    if (filtered.length === all.length) return false
    writeTable(table, filtered)
    return true
  },

  // Compter
  count(table: string, where?: Record<string, any>): number {
    return this.findMany(table, where).length
  },
}

// ========================
// DONNÉES DE DÉMO (seed)
// ========================
function getSeedData(table: string): any[] {
  const now = new Date().toISOString()
  const yesterday = new Date(Date.now() - 86400000).toISOString()

  const seeds: Record<string, any[]> = {
    users: [
      {
        id: 'user-client-1', nom: 'Dupont', prenom: 'Marie',
        email: 'marie@demo.fr', role: 'CLIENT',
        passwordHash: '$2a$10$demo', // mot de passe: demo123
        pays: 'FR', langue: 'fr', devise: 'EUR',
        ville: 'Paris', isActive: true, kycStatus: 'VALIDATED',
        createdAt: yesterday, updatedAt: yesterday,
      },
      {
        id: 'user-senior-1', nom: 'Martin', prenom: 'Jean-Claude',
        email: 'jeanclaude@demo.fr', role: 'SENIOR',
        passwordHash: '$2a$10$demo',
        pays: 'FR', langue: 'fr', devise: 'EUR',
        ville: 'Paris', isActive: true, kycStatus: 'VALIDATED',
        createdAt: yesterday, updatedAt: yesterday,
      },
      {
        id: 'user-senior-2', nom: 'Laurent', prenom: 'Hashley',
        email: 'hashley@demo.com', role: 'SENIOR',
        passwordHash: '$2a$10$demo',
        pays: 'US', langue: 'en', devise: 'USD',
        ville: 'Paris', isActive: true, kycStatus: 'VALIDATED',
        createdAt: yesterday, updatedAt: yesterday,
      },
      {
        id: 'user-admin-1', nom: 'SVAY', prenom: 'Keo',
        email: 'admin@greyskill.net', role: 'ADMIN',
        passwordHash: '$2a$10$demo',
        pays: 'FR', langue: 'fr', devise: 'EUR',
        ville: 'Paris', isActive: true, kycStatus: 'VALIDATED',
        createdAt: yesterday, updatedAt: yesterday,
      },
    ],

    profils_seniors: [
      {
        id: 'profil-1', userId: 'user-senior-1',
        age: 67, bio: 'Expert-comptable avec 35 ans d\'expérience. Spécialiste TPE/PME et optimisation fiscale.',
        competences: ['Comptabilité', 'Fiscalité', 'Audit', 'Gestion financière'],
        passions: ['Jardinage', 'Photographie'],
        categories: ['Comptabilité & financier'],
        tarifHoraire: 45, tarifDevis: false,
        experienceAns: 35, certification: 'OR', nbMissions: 14, noteMoyenne: 4.9,
        latitude: 48.8566, longitude: 2.3522, rayonKm: 20,
        stripeOnboarded: false, abonnement: 'ELITE',
        createdAt: yesterday, updatedAt: yesterday,
      },
      {
        id: 'profil-2', userId: 'user-senior-2',
        age: 62, bio: 'Ancienne directrice commerciale. J\'aide les startups à développer leur stratégie de vente.',
        competences: ['Stratégie commerciale', 'Management', 'Coaching', 'Négociation'],
        passions: ['Cuisine', 'Pâtisserie'],
        categories: ['Conseil entrepreneuriat & stratégie'],
        tarifHoraire: 60, tarifDevis: false,
        experienceAns: 22, certification: 'OR', nbMissions: 11, noteMoyenne: 4.8,
        latitude: 48.8606, longitude: 2.3376, rayonKm: 30,
        stripeOnboarded: false, abonnement: 'CONFIRME',
        createdAt: yesterday, updatedAt: yesterday,
      },
    ],

    missions: [
      {
        id: 'mission-1', titre: 'Audit comptable TPE — 5h',
        description: 'Besoin d\'un expert-comptable pour auditer ma comptabilité annuelle et conseiller sur l\'optimisation fiscale.',
        categorie: 'Comptabilité', budget: 250, devise: 'EUR',
        dureeEstimee: '5 heures', localisation: 'Paris 14e', remote: true,
        statut: 'EN_COURS', clientId: 'user-client-1', seniorId: 'profil-1',
        latitude: 48.830, longitude: 2.324,
        createdAt: yesterday, updatedAt: now,
      },
      {
        id: 'mission-2', titre: 'Coaching stratégie commerciale',
        description: 'Startup de 6 mois cherche coach commercial pour structurer son équipe de vente et son pipeline.',
        categorie: 'Stratégie', budget: 480, devise: 'EUR',
        dureeEstimee: '8 heures', localisation: 'Paris ou Visio', remote: true,
        statut: 'OUVERTE', clientId: 'user-client-1', seniorId: null,
        latitude: 48.860, longitude: 2.338,
        createdAt: now, updatedAt: now,
      },
      {
        id: 'mission-3', titre: 'Cours de jardinage — 3h',
        description: 'Particulier cherche un passionné de jardinage pour aménager un petit jardin de 30m².',
        categorie: 'Jardinage', budget: 90, devise: 'EUR',
        dureeEstimee: '3 heures', localisation: 'Boulogne-Billancourt', remote: false,
        statut: 'OUVERTE', clientId: 'user-client-1', seniorId: null,
        latitude: 48.835, longitude: 2.240,
        createdAt: now, updatedAt: now,
      },
    ],

    messages: [
      {
        id: 'msg-1', missionId: 'mission-1', senderId: 'user-senior-1',
        contenu: 'Bonjour Marie ! J\'ai bien reçu votre demande. Je suis disponible mardi matin.',
        bloque: false, typeMedia: 'text', lu: true,
        createdAt: yesterday,
      },
      {
        id: 'msg-2', missionId: 'mission-1', senderId: 'user-client-1',
        contenu: 'Bonjour Jean-Claude ! Parfait, mardi 9h me convient très bien.',
        bloque: false, typeMedia: 'text', lu: true,
        createdAt: now,
      },
    ],

    candidatures: [],
    notes: [],
    paiements: [],
    litiges: [],
    abonnements: [],
  }

  return seeds[table] || []
}
