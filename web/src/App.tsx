import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RadiologyAdvisor from './pages/RadiologyAdvisor'
import PasswordGateway from './components/PasswordGateway'

export default function App() {
  return (
    <PasswordGateway>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RadiologyAdvisor />} />
          <Route path="/radiology" element={<RadiologyAdvisor />} />
        </Routes>
      </BrowserRouter>
    </PasswordGateway>
  )
}
