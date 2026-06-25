// components/map/LeafletMap.tsx — Carte 100% gratuite avec Leaflet + OpenStreetMap

import { useEffect, useRef, useState } from 'react'

interface Senior {
  id: string
  prenom: string
  certification: string
  tarifHoraire: number
  noteMoyenne: number
  competences: string[]
  latitude: number
  longitude: number
  distance?: number
}

interface LeafletMapProps {
  seniors: Senior[]
  userLat?: number
  userLng?: number
  rayon?: number
  onSelectSenior?: (senior: Senior) => void
}

const CERT_EMOJI: Record<string, string> = {
  OR: '🥇', ARGENT: '🥈', BRONZE: '🥉', CONFIRME: '✓', NOUVEAU: '⭐'
}

const CERT_COLOR: Record<string, string> = {
  OR: '#f59e0b', ARGENT: '#6b7280', BRONZE: '#b45309', CONFIRME: '#1d4ed8', NOUVEAU: '#6b7280'
}

export default function LeafletMap({ seniors, userLat = 48.8566, userLng = 2.3522, rayon = 10, onSelectSenior }: LeafletMapProps) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const circleRef = useRef<any>(null)
  const [selected, setSelected] = useState<Senior | null>(null)

  useEffect(() => {
    // Import dynamique de Leaflet (SSR safe)
    import('leaflet').then(L => {
      // Fix icônes Leaflet avec Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      if (!mapInstanceRef.current) {
        // Initialiser la carte sur OpenStreetMap (GRATUIT)
        const map = L.map(mapRef.current!, { zoomControl: true }).setView([userLat, userLng], 13)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map)

        mapInstanceRef.current = map
      }

      const map = mapInstanceRef.current

      // Marker "Vous"
      const youIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 6px rgba(37,99,235,0.2)"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      L.marker([userLat, userLng], { icon: youIcon }).addTo(map).bindPopup('📍 Vous êtes ici')

      // Cercle de rayon
      if (circleRef.current) circleRef.current.remove()
      circleRef.current = L.circle([userLat, userLng], {
        radius: rayon * 1000,
        color: '#c8a96e', fillColor: '#c8a96e', fillOpacity: 0.06, weight: 1.5
      }).addTo(map)

      // Supprimer anciens markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      // Markers seniors
      seniors.forEach(senior => {
        const color = CERT_COLOR[senior.certification] || '#6b7280'
        const emoji = CERT_EMOJI[senior.certification] || '⭐'

        const icon = L.divIcon({
          html: `
            <div style="
              background:${senior.certification === 'OR' || senior.certification === 'ARGENT' ? '#1a1a2e' : '#1a1a2e'};
              color:white; border-radius:20px; padding:4px 10px;
              font-size:11px; font-weight:700; white-space:nowrap;
              border:2px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.3);
              display:flex; align-items:center; gap:4px; cursor:pointer;
            ">
              <span>${emoji}</span>
              <span>${senior.tarifHoraire}€/h</span>
            </div>
            <div style="
              width:0;height:0;border-left:6px solid transparent;
              border-right:6px solid transparent;border-top:8px solid #1a1a2e;
              margin:0 auto;
            "></div>
          `,
          className: '',
          iconAnchor: [40, 36],
        })

        const marker = L.marker([senior.latitude, senior.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:180px">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px">
                ${senior.prenom} ${emoji}
              </div>
              <div style="font-size:12px;color:#666;margin-bottom:6px">
                ⭐ ${senior.noteMoyenne.toFixed(1)} · ${senior.competences.slice(0,2).join(', ')}
              </div>
              <div style="font-size:16px;font-weight:900;color:#1a1a2e;margin-bottom:8px">
                ${senior.tarifHoraire}€/h
              </div>
              <button onclick="window.selectSenior('${senior.id}')" style="
                width:100%;padding:6px;background:#c8a96e;color:#1a1a2e;
                border:none;border-radius:6px;font-weight:700;cursor:pointer;
              ">Contacter</button>
            </div>
          `)
          .on('click', () => {
            setSelected(senior)
            onSelectSenior?.(senior)
          })

        markersRef.current.push(marker)
      })

      // Callback global pour le bouton dans le popup
      ;(window as any).selectSenior = (seniorId: string) => {
        const s = seniors.find(s => s.id === seniorId)
        if (s) { setSelected(s); onSelectSenior?.(s) }
      }
    })
  }, [seniors, userLat, userLng, rayon])

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Carte Leaflet */}
      <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 0 }} />

      {/* Panneau senior sélectionné */}
      {selected && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'white', borderRadius: '16px 16px 0 0',
          padding: '16px', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          zIndex: 1000, borderTop: '1px solid #e8e4dc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: '#1d4ed8',
            }}>
              {selected.prenom[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e' }}>
                {selected.prenom} {CERT_EMOJI[selected.certification]}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                ⭐ {selected.noteMoyenne.toFixed(1)} · {selected.distance ? `${selected.distance.toFixed(1)} km` : 'Proche'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {selected.competences.slice(0, 3).join(' · ')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e' }}>{selected.tarifHoraire}€</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>/heure</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setSelected(null)}
              style={{
                flex: 1, padding: '10px', borderRadius: 8,
                border: '1px solid #e8e4dc', background: 'white',
                fontWeight: 600, cursor: 'pointer', color: '#1a1a2e',
              }}
            >Fermer</button>
            <button
              onClick={() => window.location.href = `/chat/${selected.id}`}
              style={{
                flex: 2, padding: '10px', borderRadius: 8,
                border: 'none', background: '#c8a96e',
                fontWeight: 700, cursor: 'pointer', color: '#1a1a2e',
              }}
            >💬 Contacter</button>
          </div>
        </div>
      )}

      {/* Badge OpenStreetMap */}
      <div style={{
        position: 'absolute', top: 8, right: 8, zIndex: 1000,
        background: 'white', borderRadius: 6, padding: '3px 8px',
        fontSize: 11, color: '#6b7280', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}>
        🗺 OpenStreetMap · Gratuit
      </div>
    </div>
  )
}
