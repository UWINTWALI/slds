import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Grayscale scale: low CDI = light, high CDI = dark
function cdiColor(cdi) {
  if (cdi == null) return '#e4e4e7'
  const t = Math.max(0, Math.min(100, cdi)) / 100
  const l = Math.round(92 - t * 62)
  return `hsl(220,10%,${l}%)`
}

function povertyColor(val) {
  if (val == null) return '#e4e4e7'
  const t = Math.max(0, Math.min(1, val))
  const l = Math.round(95 - t * 65)
  return `hsl(0,60%,${l}%)`
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
      return `<tr><td style="color:#71717a;padding:2px 8px 2px 0">${label}</td><td style="font-weight:500">${val}</td></tr>`
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

    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }

    layerRef.current = L.geoJSON(geojson, {
      style: feature => {
        const p    = feature.properties ?? {}
        const val  = p[colorBy]
        const fill = colorBy === 'predicted_poverty_rate' ? povertyColor(val) : cdiColor(val)
        return {
          fillColor:   fill,
          fillOpacity: 0.82,
          color:       '#ffffff',
          weight:      0.6,
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
