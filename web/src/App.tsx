import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RadiologyAdvisor from './pages/RadiologyAdvisor'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RadiologyAdvisor />} />
        <Route path="/radiology" element={<RadiologyAdvisor />} />
      </Routes>
    </BrowserRouter>
  )
}
