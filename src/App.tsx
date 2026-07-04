import { Routes, Route, Navigate } from 'react-router'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Wallet from './pages/Wallet'
import CreditScore from './pages/CreditScore'
import CashFlow from './pages/CashFlow'
import Advances from './pages/Advances'
import CardManager from './pages/CardManager'
import Analytics from './pages/Analytics'
import Onboarding from './pages/Onboarding'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications' // C5

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/credit-score" element={<CreditScore />} />
                <Route path="/cash-flow" element={<CashFlow />} />
                <Route path="/advances" element={<Advances />} />
                <Route path="/cards" element={<CardManager />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/settings" element={<Settings />} />
                {/* C5: full notification center (no Navbar item by design) */}
                <Route path="/notifications-center" element={<Notifications />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
