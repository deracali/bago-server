import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/react-app/hooks/useAuth";
import Login from "@/react-app/pages/Login";
import DashboardPage from "@/react-app/pages/Dashboard";
import UsersPage from "@/react-app/pages/Users";
import TrackingPage from "@/react-app/pages/Tracking";
import SupportPage from "@/react-app/pages/Support";
import WithdrawalsPage from "@/react-app/pages/Withdrawals";
import SettingsPage from "@/react-app/pages/Settings";
import AnalyticsPage from "@/react-app/pages/Analytics";
import StaffPage from "@/react-app/pages/Staff";
import NotificationsPage from "@/react-app/pages/Notifications";
import EmailCampaignsPage from "@/react-app/pages/EmailCampaigns";
import DashboardLayout from "@/react-app/components/DashboardLayout";
import ProtectedRoute from "@/react-app/components/ProtectedRoute";
import PricePerKgPage from "@/react-app/pages/priceperkg";
import KYCVerificationManager from "@/react-app/pages/kyc.tsx"
import PushNotificationPage from "@/react-app/pages/push-notification"
import DisputesPage from "@/react-app/pages/disputes"
import RefundsPage from "@/react-app/pages/Refund"



export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <UsersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TrackingPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SupportPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/disputes"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DisputesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/refund"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <RefundsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/kyc"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <KYCVerificationManager />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/priceperkg"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PricePerKgPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/push-notification"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PushNotificationPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/withdrawals"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <WithdrawalsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AnalyticsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <StaffPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NotificationsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/emails"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EmailCampaignsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
