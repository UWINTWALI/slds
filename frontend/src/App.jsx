import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout           from './components/Layout'
import Home             from './pages/Home'
import NationalOverview from './pages/NationalOverview'
import DistrictPlanner  from './pages/DistrictPlanner'
import SectorPlanner    from './pages/SectorPlanner'
import Simulation       from './pages/Simulation'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index             element={<Home />} />
          <Route path="national"   element={<NationalOverview />} />
          <Route path="district"   element={<DistrictPlanner />} />
          <Route path="sector"     element={<SectorPlanner />} />
          <Route path="simulation" element={<Simulation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
