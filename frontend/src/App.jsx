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

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* Public — landing / login */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LandingPage />}
      />

      {/* Protected — main app */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index             element={<Home />} />
        <Route path="national"   element={<NationalOverview />} />
        <Route path="district"   element={<DistrictPlanner />} />
        <Route path="sector"     element={<SectorPlanner />} />
        <Route path="simulation" element={<Simulation />} />
      </Route>

      {/* Catch-all */}
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
