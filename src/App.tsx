import { Routes, Route, Navigate } from 'react-router'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './lib/auth-context'
import Dashboard from './pages/Dashboard'
import Wallet from './pages/Wallet'
import CreditScore from './pages/CreditScore'
import CashFlow from './pages/CashFlow'
import Advances from './pages/Advances'
import CardManager from './pages/CardManager'
import Analytics from './pages/Analytics'
import Onboarding from './pages/Onboarding'
import Settings from './pages/Settings'
import Login from './pages/Login'

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/credit-score" element={<ProtectedRoute><CreditScore /></ProtectedRoute>} />
          <Route path="/cash-flow" element={<ProtectedRoute><CashFlow /></ProtectedRoute>} />
          <Route path="/advances" element={<ProtectedRoute><Advances /></ProtectedRoute>} />
          <Route path="/cards" element={<ProtectedRoute><CardManager /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}
