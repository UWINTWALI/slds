import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout           from './components/Layout'
import ProtectedRoute   from './components/ProtectedRoute'
import LandingPage      from './pages/LandingPage'
import Home             from './pages/Home'
import NationalOverview from './pages/NationalOverview'
import DistrictPlanner  from './pages/DistrictPlanner'
import SectorPlanner    from './pages/SectorPlanner'
import Simulation       from './pages/Simulation'

/**
 * Guards a route by allowed roles.
 * If the logged-in user's role is not allowed → redirect to their home ('/').
 */
function RoleRoute({ allowed, children }) {
  const { user } = useAuth()
  if (user && !allowed.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* ── Public ── */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LandingPage />}
      />

      {/* ── Protected ── */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Role-specific home */}
        <Route index element={<Home />} />

        {/* National overview — national_admin + analyst */}
        <Route
          path="national"
          element={
            <RoleRoute allowed={['national_admin', 'analyst']}>
              <NationalOverview />
            </RoleRoute>
          }
        />

        {/* District planner — national_admin + district_officer + analyst */}
        <Route
          path="district"
          element={
            <RoleRoute allowed={['national_admin', 'district_officer', 'analyst', 'sector_officer']}>
              <DistrictPlanner />
            </RoleRoute>
          }
        />

        {/* Sector planner — all roles */}
        <Route path="sector"     element={<SectorPlanner />} />

        {/* Simulation — all roles */}
        <Route path="simulation" element={<Simulation />} />
      </Route>

      {/* ── Catch-all ── */}
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
