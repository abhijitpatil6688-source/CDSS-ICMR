import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RadiologyAdvisor from './pages/RadiologyAdvisor'
import PasswordGate from './components/PasswordGate'

export default function App() {
  return (
    <PasswordGate>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RadiologyAdvisor />} />
          <Route path="/radiology" element={<RadiologyAdvisor />} />
        </Routes>
      </BrowserRouter>
    </PasswordGate>
  )
}
