import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import UsersPage from './pages/admin/Users';
import DocumentsPage from './pages/admin/Documents';
import PaymentsPage from './pages/admin/Payments';
import AdminJobsPage from './pages/admin/Jobs';

// Haulier Pages
import HaulierOverview from './pages/haulier/Dashboard';
import FleetPage from './pages/haulier/Fleet';
import HaulierJobsPage from './pages/haulier/Jobs';

// Shared
import SettingsPage from './pages/shared/Settings';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: string }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="h-screen flex items-center justify-center font-bold text-navy">Loading FreightFlex...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;

  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      
      {/* Admin Section */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute role="ADMIN">
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="jobs" element={<AdminJobsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Routes>
          </ProtectedRoute>
        } 
      />

      {/* Haulier Section */}
      <Route 
        path="/haulier/*" 
        element={
          <ProtectedRoute role="SUPPLIER">
            <Routes>
              <Route index element={<HaulierOverview />} />
              <Route path="jobs" element={<HaulierJobsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="fleet" element={<FleetPage />} />
              <Route path="profile" element={<SettingsPage />} />
            </Routes>
          </ProtectedRoute>
        } 
      />

      <Route path="/" element={
        user ? (
          <Navigate to={user.role === 'ADMIN' ? '/admin' : '/haulier'} />
        ) : (
          <Navigate to="/login" />
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
