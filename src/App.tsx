import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import BrandLoadingScreen from './components/BrandLoadingScreen'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

/* D5: everything but the entry point (Login) and the default post-login
 * landing page (Dashboard) is lazy-loaded — each route becomes its own
 * chunk, fetched on first navigation instead of bundled into the
 * initial load. */
const Wallet = lazy(() => import('./pages/Wallet'))
const CreditScore = lazy(() => import('./pages/CreditScore'))
const CashFlow = lazy(() => import('./pages/CashFlow'))
const Advances = lazy(() => import('./pages/Advances'))
const Marketplace = lazy(() => import('./pages/Marketplace')) // C2: brand deal marketplace
const CardManager = lazy(() => import('./pages/CardManager'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Settings = lazy(() => import('./pages/Settings'))
const Kyc = lazy(() => import('./pages/Kyc')) // D1: KYC/KYB identity verification
const AmlMonitoring = lazy(() => import('./pages/compliance/AmlMonitoring')) // D2: Compliance Console
const AuditLog = lazy(() => import('./pages/compliance/AuditLog')) // D3: Compliance Console
const TaxCenter = lazy(() => import('./pages/TaxCenter')) // C3: Tax Center
/* C4: platform connect OAuth */
const OAuthAuthorize = lazy(() => import('./pages/OAuthAuthorize'))
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'))
const Notifications = lazy(() => import('./pages/Notifications')) // C5

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<BrandLoadingScreen label="Loading…" />}>
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
                  <Route path="/compliance/audit-log" element={<AuditLog />} />
                  {/* C4: mock OAuth provider consent screen + redirect_uri */}
                  <Route path="/oauth/authorize" element={<OAuthAuthorize />} />
                  <Route path="/oauth/callback" element={<OAuthCallback />} />
                  {/* C5: full notification center (no Navbar item by design) */}
                  <Route path="/notifications-center" element={<Notifications />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
