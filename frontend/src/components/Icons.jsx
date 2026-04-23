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
