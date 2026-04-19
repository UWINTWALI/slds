import { useAuth, ROLE_META } from '../context/AuthContext'

/**
 * Convenience hook — exposes role flags, scoped district/sector,
 * and visual metadata (colors, labels) for the current user.
 */
export function useRole() {
  const { user } = useAuth()
  const role = user?.role ?? 'analyst'
  const meta = ROLE_META[role] ?? ROLE_META.analyst

  return {
    role,
    meta,
    isNational:  role === 'national_admin',
    isDistrict:  role === 'district_officer',
    isSector:    role === 'sector_officer',
    isAnalyst:   role === 'analyst',
    /** Can see all districts/sectors without restriction */
    canSeeAll:   ['national_admin', 'analyst'].includes(role),
    /** Assigned district (district_officer / sector_officer only) */
    district:    user?.district ?? null,
    /** Assigned sector (sector_officer only) */
    sector:      user?.sector   ?? null,
  }
}
