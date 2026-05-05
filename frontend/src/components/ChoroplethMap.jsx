import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── Color palettes ────────────────────────────────────────────────────────────

// Interpolates through an array of [r,g,b] stops at t ∈ [0,1]
function multiStop(stops, t) {
  t = Math.max(0, Math.min(1, t))
  const n   = stops.length - 1
  const idx = t * n
  const lo  = Math.floor(idx)
  const hi  = Math.min(lo + 1, n)
  const f   = idx - lo
  const [r1, g1, b1] = stops[lo]
  const [r2, g2, b2] = stops[hi]
  return `rgb(${Math.round(r1+(r2-r1)*f)},${Math.round(g1+(g2-g1)*f)},${Math.round(b1+(b2-b1)*f)})`
}

// Nightlight: pure black → dark orange glow → bright yellow (satellite night-light look)
const NIGHTLIGHT_STOPS = [
  [0,   0,   0  ],   // no light  — black
  [60,  20,  0  ],   // faint glow — very dark orange
  [180, 80,  0  ],   // moderate  — dark amber
  [255, 180, 0  ],   // bright    — golden yellow
  [255, 255, 80 ],   // very high — near white-yellow
]
function nightlightColor(t) { return multiStop(NIGHTLIGHT_STOPS, t) }

// Magma: black → deep purple → red → orange → cream yellow (for CDI and others)
const MAGMA_STOPS = [
  [0,   0,   4  ],
  [28,  16,  68 ],
  [79,  18,  123],
  [159, 42,  99 ],
  [222, 73,  77 ],
  [254, 159, 109],
  [252, 253, 191],
]
function magmaColor(t) { return multiStop(MAGMA_STOPS, t) }

// Poverty is inverse: low poverty = bright, high poverty = dark
function povertyColor(t) { return magmaColor(1 - t) }

// Route colorBy to the right palette
function getColor(colorBy, t) {
  if (colorBy === 'nightlight_mean') return nightlightColor(t)
  if (colorBy === 'predicted_poverty_rate') return povertyColor(t)
  return magmaColor(t)
}

const TOOLTIPS = {
  adm3_en:                 'Sector',
  adm2_en:                 'District',
  cdi:                     'CDI',
  cdi_national_rank:       'Nat. Rank',
  predicted_poverty_rate:  'Poverty',
  road_density_km_per_km2: 'Roads (km/km²)',
  health_facility_count:   'Health Posts',
  school_count:            'Schools',
  tier:                    'Tier',
}

function tooltipHTML(props) {
  const rows = Object.entries(TOOLTIPS)
    .filter(([k]) => props[k] != null)
    .map(([k, label]) => {
      let val = props[k]
      if (k.includes('poverty')) val = `${(val * 100).toFixed(1)}%`
      else if (k === 'cdi')      val = Number(val).toFixed(1)
      else if (k.includes('density')) val = Number(val).toFixed(2)
      return `<tr>
        <td style="color:rgba(255,255,255,0.7);padding:2px 10px 2px 0;font-size:11px">${label}</td>
        <td style="font-weight:600;color:#fff;font-size:12px">${val}</td>
      </tr>`
    })
    .join('')
  return `<table style="font-size:12px;font-family:Inter,sans-serif;border-collapse:collapse">${rows}</table>`
}

export default function ChoroplethMap({ geojson, colorBy = 'cdi', height = 420, onFeatureClick }) {
  const mapRef      = useRef(null)
  const instanceRef = useRef(null)
  const layerRef    = useRef(null)

  // Init map once
  useEffect(() => {
    if (instanceRef.current) return
    instanceRef.current = L.map(mapRef.current, {
      center: [-1.94, 29.87],
      zoom: 8,
      zoomControl: true,
      attributionControl: false,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(instanceRef.current)
  }, [])

  // Render GeoJSON layer when data or colorBy changes
  useEffect(() => {
    const map = instanceRef.current
    if (!map || !geojson?.features?.length) return

    // Compute data range for normalization across all features
    const vals = geojson.features
      .map(f => f.properties?.[colorBy])
      .filter(v => v != null && isFinite(v))
    const lo = vals.length ? Math.min(...vals) : 0
    const hi = vals.length ? Math.max(...vals) : 1
    const normalize = v => (hi === lo ? 0.5 : (v - lo) / (hi - lo))

    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }

    layerRef.current = L.geoJSON(geojson, {
      style: feature => {
        const p   = feature.properties ?? {}
        const val = p[colorBy]
        let fill = '#d1d5db'   // neutral grey for missing data
        if (val != null && isFinite(val)) {
          fill = getColor(colorBy, normalize(val))
        }
        return {
          fillColor:   fill,
          fillOpacity: 0.85,
          color:       '#ffffff',
          weight:      0.7,
        }
      },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(tooltipHTML(feature.properties ?? {}), {
          sticky: true,
          opacity: 1,
          className: 'slds-tooltip',
        })
        layer.on({
          mouseover: e => e.target.setStyle({ weight: 2, color: '#09090b' }),
          mouseout:  e => layerRef.current?.resetStyle(e.target),
          click:     e => onFeatureClick?.(e.target.feature),
        })
      },
    }).addTo(map)

    // Fit bounds
    try { map.fitBounds(layerRef.current.getBounds(), { padding: [16, 16] }) }
    catch (_) {}
  }, [geojson, colorBy, onFeatureClick])

  return (
    <div
      ref={mapRef}
      className="map-container"
      style={{ height }}
    />
  )
}
