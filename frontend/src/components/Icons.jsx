/**
 * Lightweight inline-SVG icon set — no external dependencies.
 * All icons share the same interface:
 *   <IconName size={18} color="currentColor" style={...} />
 */

const defaults = { size: 18, color: 'currentColor' }

function Svg({ size, color, children, style }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {children}
    </svg>
  )
}

/* ── Navigation / Layout ─────────────────────────────────────── */

export function IconHome({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </Svg>
  )
}

export function IconGlobe({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </Svg>
  )
}

export function IconMap({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </Svg>
  )
}

export function IconMapPin({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  )
}

export function IconFlask({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M9 3h6M9 3v8l-4 9a1 1 0 0 0 .93 1.37h12.14A1 1 0 0 0 19 20l-4-9V3" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </Svg>
  )
}

export function IconUsers({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  )
}

export function IconLogOut({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  )
}

export function IconSun({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"  y1="12" x2="3"  y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Svg>
  )
}

export function IconMoon({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Svg>
  )
}

/* ── Alerts & Status ─────────────────────────────────────────── */

export function IconAlertTriangle({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
  )
}

export function IconCheckCircle({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  )
}

export function IconInfo({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Svg>
  )
}

/* ── Charts & Data ───────────────────────────────────────────── */

export function IconBarChart({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="16" />
    </Svg>
  )
}

export function IconTrendingDown({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </Svg>
  )
}

export function IconTrendingUp({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </Svg>
  )
}

/* ── Simulation & Tools ──────────────────────────────────────── */

export function IconSliders({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <line x1="4"  y1="21" x2="4"  y2="14" />
      <line x1="4"  y1="10" x2="4"  y2="3"  />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8"  x2="12" y2="3"  />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3"  />
      <line x1="1"  y1="14" x2="7"  y2="14" />
      <line x1="9"  y1="8"  x2="15" y2="8"  />
      <line x1="17" y1="16" x2="23" y2="16" />
    </Svg>
  )
}

export function IconScale({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M3 9h18" />
      <path d="M5 6l7-3 7 3" />
      <path d="M3 15a5 5 0 0 0 10 0" />
      <path d="M11 15a5 5 0 0 0 10 0" />
    </Svg>
  )
}

/* ── Documents & Reports ─────────────────────────────────────── */

export function IconFileText({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </Svg>
  )
}

export function IconSend({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
  )
}

export function IconShare({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <circle cx="18" cy="5"  r="3" />
      <circle cx="6"  cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59"  y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51"  x2="8.59"  y2="10.49" />
    </Svg>
  )
}

/* ── Infrastructure ──────────────────────────────────────────── */

export function IconRoad({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M8 21L12 3l4 18" />
      <line x1="9.5"  y1="9"  x2="14.5" y2="9"  strokeDasharray="2 2" />
      <line x1="9"    y1="14" x2="15"   y2="14" strokeDasharray="2 2" />
    </Svg>
  )
}

export function IconActivity({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Svg>
  )
}

export function IconZap({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  )
}

export function IconBookOpen({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Svg>
  )
}

export function IconBuilding({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </Svg>
  )
}

/* ── Research & Analytics ────────────────────────────────────── */

export function IconCpu({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9"  y1="1"  x2="9"  y2="4"  />
      <line x1="15" y1="1"  x2="15" y2="4"  />
      <line x1="9"  y1="20" x2="9"  y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9"  x2="23" y2="9"  />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1"  y1="9"  x2="4"  y2="9"  />
      <line x1="1"  y1="14" x2="4"  y2="14" />
    </Svg>
  )
}

export function IconFolder({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </Svg>
  )
}

export function IconTarget({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6"  />
      <circle cx="12" cy="12" r="2"  />
    </Svg>
  )
}

export function IconLock({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  )
}

export function IconUserPlus({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </Svg>
  )
}

export function IconShield({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  )
}

export function IconLoader({ size = defaults.size, color = defaults.color, style }) {
  return (
    <Svg size={size} color={color} style={style}>
      <line x1="12" y1="2"  x2="12" y2="6"   strokeOpacity="1"   />
      <line x1="12" y1="18" x2="12" y2="22"  strokeOpacity="0.3" />
      <line x1="4.93"  y1="4.93"  x2="7.76"  y2="7.76"  strokeOpacity="0.9" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" strokeOpacity="0.25"/>
      <line x1="2"  y1="12" x2="6"  y2="12"  strokeOpacity="0.75"/>
      <line x1="18" y1="12" x2="22" y2="12"  strokeOpacity="0.2" />
      <line x1="4.93"  y1="19.07" x2="7.76"  y2="16.24" strokeOpacity="0.6" />
      <line x1="16.24" y1="7.76"  x2="19.07" y2="4.93"  strokeOpacity="0.15"/>
    </Svg>
  )
}
