import { Routes, Route, Navigate } from 'react-router'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Wallet from './pages/Wallet'
import CreditScore from './pages/CreditScore'
import CashFlow from './pages/CashFlow'
import Advances from './pages/Advances'
import Marketplace from './pages/Marketplace' // C2: brand deal marketplace
import CardManager from './pages/CardManager'
import Analytics from './pages/Analytics'
import Onboarding from './pages/Onboarding'
import Settings from './pages/Settings'
import Kyc from './pages/Kyc' // D1: KYC/KYB identity verification
import AmlMonitoring from './pages/compliance/AmlMonitoring' // D2: Compliance Console
import TaxCenter from './pages/TaxCenter' // C3: Tax Center
/* C4: platform connect OAuth */
import OAuthAuthorize from './pages/OAuthAuthorize'
import OAuthCallback from './pages/OAuthCallback'
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
                <Route path="/taxes" element={<TaxCenter />} /> {/* C3: Tax Center */}
                <Route path="/advances" element={<Advances />} />
                <Route path="/marketplace" element={<Marketplace />} /> {/* C2 */}
                <Route path="/cards" element={<CardManager />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/settings" element={<Settings />} />
                {/* D1: identity verification wizard — reachable from Onboarding/Settings, not primary nav */}
                <Route path="/kyc" element={<Kyc />} />
                {/* D2/D3: Compliance Console — internal ops view, reachable via the footer link only */}
                <Route path="/compliance/aml" element={<AmlMonitoring />} />
                {/* C4: mock OAuth provider consent screen + redirect_uri */}
                <Route path="/oauth/authorize" element={<OAuthAuthorize />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                {/* C5: full notification center (no Navbar item by design) */}
                <Route path="/notifications-center" element={<Notifications />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
