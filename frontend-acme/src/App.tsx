import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import HomePage from '@/pages/HomePage'
import TravelHubPage from '@/pages/TravelHubPage'
import ProfilePage from '@/pages/ProfilePage'
import Navbar from '@/components/Navbar'
import { isAuthenticated } from '@/services/auth'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  ) : (
    <Navigate to="/acme/login" replace />
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/acme/login" element={<LoginPage />} />
      <Route path="/acme" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/acme/travel" element={<PrivateRoute><TravelHubPage /></PrivateRoute>} />
      <Route path="/acme/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/acme" replace />} />
    </Routes>
  )
}
