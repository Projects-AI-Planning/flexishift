import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import UsersPage from './pages/admin/Users';
import DriversPage from './pages/admin/Drivers';
import HauliersPage from './pages/admin/Hauliers';
import SuspendedUsersPage from './pages/admin/SuspendedUsers';
import DocumentsPage from './pages/admin/Documents';
import PaymentsPage from './pages/admin/Payments';
import LiveTrackingPage from './pages/admin/LiveTracking';
import AdminJobsPage from './pages/admin/Jobs';
import DisputesPage from './pages/admin/Disputes';
import ProcessedVerificationsPage from './pages/admin/ProcessedVerifications';
import ActiveJobsPage from './pages/admin/ActiveJobs';
import CompletedJobsPage from './pages/admin/CompletedJobs';
import CancelledJobsPage from './pages/admin/CancelledJobs';
import TransactionsPage from './pages/admin/Transactions';
import EscrowPage from './pages/admin/Escrow';
import RefundsPage from './pages/admin/Refunds';
import AllInvoicesPage from './pages/admin/AllInvoices';
import InvoiceReportsPage from './pages/admin/InvoiceReports';
import ActiveDisputesPage from './pages/admin/ActiveDisputes';
import ResolvedDisputesPage from './pages/admin/ResolvedDisputes';
import EscalatedDisputesPage from './pages/admin/EscalatedDisputes';
import RatingsPage from './pages/admin/Ratings';
import RevenueAnalyticsPage from './pages/admin/analytics/RevenueAnalytics';
import JobsAnalyticsPage from './pages/admin/analytics/JobsAnalytics';
import UsersAnalyticsPage from './pages/admin/analytics/UsersAnalytics';
import NotificationsPage from './pages/admin/Notifications';
import PlatformConfigPage from './pages/admin/settings/PlatformConfig';
import SystemLogsPage from './pages/admin/settings/SystemLogs';
import ActiveSupportTicketsPage from './pages/admin/ActiveSupportTickets';
import ResolvedSupportTicketsPage from './pages/admin/ResolvedSupportTickets';

// Haulier Pages
import HaulierOverview from './pages/haulier/Dashboard';
import FleetPage from './pages/haulier/Fleet';
import HaulierDriversPage from './pages/haulier/Drivers';
import HaulierLoadsPage from './pages/haulier/Loads';
import HaulierCostsPage from './pages/haulier/Costs';
import HaulierRevenuePage from './pages/haulier/Revenue';
import HaulierPerformancePage from './pages/haulier/Performance';
import HaulierCompliancePage from './pages/haulier/Compliance';
import HaulierInsurancePage from './pages/haulier/Insurance';
import HaulierPaymentsPage from './pages/haulier/Payments';
import HaulierNotificationsPage from './pages/haulier/Notifications';
import HaulierProfilePage from './pages/haulier/Profile';
import HaulierSecurityPage from './pages/haulier/Security';
import HaulierSupportHelpPage from './pages/haulier/SupportHelp';
import HaulierSupportContactPage from './pages/haulier/SupportContact';
import HaulierTrackingPage from './pages/haulier/Tracking';
import PostJobPage from './pages/haulier/PostJob';
import HaulierJobsPage from './pages/haulier/Jobs';
import HaulierShiftsPage from './pages/haulier/Shifts';

// Auth Pages
import RegisterPage from './pages/haulier/Register';
import VerifyEmailPage from './pages/haulier/VerifyEmail';

// Shared
import SettingsPage from './pages/shared/Settings';

const normalizeRole = (role?: string) => (
  role === 'SUPPLIER' || role === 'FIRM' ? 'HAULIER' : role
);

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: string }) => {
  const { user, isLoading } = useAuth();
  const userRole = normalizeRole(user?.role);

  if (isLoading) return <div className="h-screen flex items-center justify-center font-bold text-navy">Loading FreightFlex...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to="/" replace />;

  return <Layout>{children}</Layout>;
};


function AppRoutes() {
  const { user } = useAuth();
  const userRole = normalizeRole(user?.role);

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
      <Route path="/verify-email" element={user ? <Navigate to="/" replace /> : <VerifyEmailPage />} />

      {/* Admin Section */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute role="ADMIN">
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="users/all" element={<UsersPage />} />
              <Route path="users/drivers" element={<DriversPage />} />
              <Route path="users/hauliers" element={<HauliersPage />} />
              <Route path="users/suspended" element={<SuspendedUsersPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/*" element={<UsersPage />} />
              <Route path="verifications/pending" element={<DocumentsPage />} />
              <Route path="verifications/processed" element={<ProcessedVerificationsPage />} />
              <Route path="verifications/*" element={<DocumentsPage />} />
              <Route path="documents/*" element={<DocumentsPage />} />
              <Route path="payments/transactions" element={<TransactionsPage />} />
              <Route path="payments/escrow" element={<EscrowPage />} />
              <Route path="payments/refunds" element={<RefundsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="payments/*" element={<PaymentsPage />} />
              <Route path="tracking" element={<LiveTrackingPage />} />
              <Route path="tracking/*" element={<LiveTrackingPage />} />
              <Route path="invoices/all" element={<AllInvoicesPage />} />
              <Route path="invoices/reports" element={<InvoiceReportsPage />} />
              <Route path="invoices/*" element={<AllInvoicesPage />} />
              <Route path="jobs/all" element={<AdminJobsPage />} />
              <Route path="jobs/active" element={<ActiveJobsPage />} />
              <Route path="jobs/completed" element={<CompletedJobsPage />} />
              <Route path="jobs/cancelled" element={<CancelledJobsPage />} />
              <Route path="jobs" element={<AdminJobsPage />} />
              <Route path="jobs/*" element={<AdminJobsPage />} />
              <Route path="analytics" element={<Navigate to="/admin/analytics/revenue" replace />} />
              <Route path="analytics/revenue" element={<RevenueAnalyticsPage />} />
              <Route path="analytics/jobs" element={<JobsAnalyticsPage />} />
              <Route path="analytics/users" element={<UsersAnalyticsPage />} />
              <Route path="analytics/*" element={<Navigate to="/admin/analytics/revenue" replace />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="notifications/*" element={<NotificationsPage />} />
              <Route path="disputes/active" element={<ActiveDisputesPage />} />
              <Route path="disputes/resolved" element={<ResolvedDisputesPage />} />
              <Route path="disputes/escalated" element={<EscalatedDisputesPage />} />
              <Route path="disputes/*" element={<DisputesPage />} />
              <Route path="ratings/all" element={<RatingsPage />} />
              <Route path="ratings/reported" element={<RatingsPage />} />
              <Route path="ratings/*" element={<Navigate to="/admin/ratings/all" replace />} />
              <Route path="settings" element={<Navigate to="/admin/settings/config" replace />} />
              <Route path="settings/config" element={<PlatformConfigPage />} />
              <Route path="settings/logs" element={<SystemLogsPage />} />
              <Route path="settings/*" element={<Navigate to="/admin/settings/config" replace />} />
              <Route path="support" element={<Navigate to="/admin/support/active" replace />} />
              <Route path="support/active" element={<ActiveSupportTicketsPage />} />
              <Route path="support/resolved" element={<ResolvedSupportTicketsPage />} />
              <Route path="support/*" element={<Navigate to="/admin/support/active" replace />} />
              <Route path="*" element={<AdminDashboard />} />
            </Routes>
          </ProtectedRoute>
        } 
      />

      {/* Haulier Section */}
      <Route
        path="/haulier/*"
        element={
          <ProtectedRoute role="HAULIER">
            <Routes>
              <Route index element={<HaulierOverview />} />
              <Route path="post-job" element={<PostJobPage />} />
              <Route path="shifts" element={<HaulierShiftsPage />} />
              <Route path="shifts/*" element={<HaulierShiftsPage />} />
              <Route path="jobs" element={<HaulierJobsPage />} />
              <Route path="jobs/*" element={<HaulierJobsPage />} />
              <Route path="payments/*" element={<HaulierPaymentsPage />} />
              <Route path="fleet/*" element={<FleetPage />} />
              <Route path="drivers/*" element={<HaulierDriversPage />} />
              <Route path="loads/*" element={<HaulierLoadsPage />} />
              <Route path="analytics/revenue" element={<HaulierRevenuePage />} />
              <Route path="analytics/performance" element={<HaulierPerformancePage />} />
              <Route path="analytics/costs" element={<HaulierCostsPage />} />
              <Route path="analytics/*" element={<HaulierOverview />} />
              <Route path="documents/compliance" element={<HaulierCompliancePage />} />
              <Route path="documents/insurance" element={<HaulierInsurancePage />} />
              <Route path="documents/*" element={<SettingsPage />} />
              <Route path="settings/profile" element={<HaulierProfilePage />} />
              <Route path="notifications" element={<HaulierNotificationsPage />} />
              <Route path="settings/notifications" element={<HaulierNotificationsPage />} />
              <Route path="settings/security" element={<HaulierSecurityPage />} />
              <Route path="settings/*" element={<SettingsPage />} />
              <Route path="profile" element={<SettingsPage />} />
              <Route path="support/help" element={<HaulierSupportHelpPage />} />
              <Route path="support/contact" element={<HaulierSupportContactPage />} />
              <Route path="support/*" element={<HaulierSupportHelpPage />} />
              <Route path="tracking" element={<HaulierTrackingPage />} />
              <Route path="tracking/*" element={<HaulierTrackingPage />} />
              <Route path="*" element={<HaulierOverview />} />
            </Routes>
          </ProtectedRoute>
        } 
      />

      <Route path="/" element={
        user ? (
          <Navigate to={userRole === 'ADMIN' ? '/admin' : '/haulier'} replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
