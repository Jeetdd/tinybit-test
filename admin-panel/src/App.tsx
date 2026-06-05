import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { TwoFactor } from './pages/auth/TwoFactor';
import { ForgotPassword } from './pages/auth/ForgotPassword';

// Main Pages
import { Dashboard } from './pages/Dashboard';
import { Elders } from './pages/users/Elders';
import { ElderProfile } from './pages/users/ElderProfile';
import { Guardians } from './pages/users/Guardians';
import { MedicineManagement } from './pages/health/MedicineManagement';
import { WellnessLogs } from './pages/health/WellnessLogs';
import { SOSAlerts } from './pages/emergency/SOSAlerts';
import { AIManagement } from './pages/ai/AIManagement';
import { JournalManagement } from './pages/journal/JournalManagement';
import { LocationTracking } from './pages/location/LocationTracking';
import { VideoManagement } from './pages/content/VideoManagement';
import { Notifications } from './pages/notifications/Notifications';
import { Reports } from './pages/reports/Reports';
import { AuditLogs } from './pages/settings/AuditLogs';
import { Settings } from './pages/settings/Settings';
import { Placeholder } from './pages/Placeholder';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, requiresTwoFactor } = useAuth();
  const location = useLocation();

  if (!isAuthenticated && !requiresTwoFactor) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  if (requiresTwoFactor && location.pathname !== '/auth/2fa') {
    return <Navigate to="/auth/2fa" replace />;
  }
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/auth/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
      <Route path="/auth/2fa" element={<TwoFactor />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />

      {/* Protected */}
      <Route path="/*" element={
        <AuthGuard>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />

              {/* User Management */}
              <Route path="/users/elders" element={<Elders />} />
              <Route path="/users/elders/:id" element={<ElderProfile />} />
              <Route path="/users/guardians" element={<Guardians />} />
              <Route path="/users/family-circle" element={<Placeholder title="Family Circle" description="View and manage family connections and relationships between elders and guardians." />} />
              <Route path="/users/invitations" element={<Placeholder title="Pending Invitations" description="Manage guardian invitation requests waiting for approval or expiry." />} />

              {/* Health */}
              <Route path="/health/medicines" element={<MedicineManagement />} />
              <Route path="/health/wellness" element={<WellnessLogs />} />
              <Route path="/health/checkins" element={<Placeholder title="Daily Check-ins" description="Monitor daily health check-in submissions from elder users." />} />
              <Route path="/health/vault" element={<Placeholder title="Health Vault" description="Manage medical documents, prescriptions, lab reports and X-rays." />} />
              <Route path="/health/conditions" element={<Placeholder title="Medical Conditions" description="Track and manage diagnosed medical conditions across the elder population." />} />

              {/* Emergency */}
              <Route path="/emergency/sos" element={<SOSAlerts />} />
              <Route path="/emergency/contacts" element={<Placeholder title="Emergency Contacts" description="Manage emergency contact numbers for all registered elders." />} />
              <Route path="/emergency/incidents" element={<Placeholder title="Incident Reports" description="View and manage filed incident reports related to elder safety events." />} />

              {/* AI */}
              <Route path="/ai/usage" element={<AIManagement />} />
              <Route path="/ai/analytics" element={<AIManagement />} />
              <Route path="/ai/conversations" element={<Placeholder title="AI Conversations" description="Browse and review AI chat transcripts with elders." />} />
              <Route path="/ai/prompts" element={<Placeholder title="Prompt Templates" description="Manage and configure AI prompt templates for the Sathi companion." />} />
              <Route path="/ai/costs" element={<Placeholder title="AI Cost Tracking" description="Detailed breakdown of AI token usage and associated costs by user and model." />} />

              {/* Journal */}
              <Route path="/journal/voice" element={<JournalManagement />} />
              <Route path="/journal/text" element={<JournalManagement />} />
              <Route path="/journal/shared" element={<JournalManagement />} />

              {/* Care */}
              <Route path="/care/calendar" element={<Placeholder title="Care Calendar" description="View and manage care schedules, appointments and family events." />} />
              <Route path="/care/appointments" element={<Placeholder title="Appointments" description="Track medical appointments and healthcare visits for elders." />} />
              <Route path="/care/family-events" element={<Placeholder title="Family Events" description="Manage family celebrations, visits and important milestones." />} />
              <Route path="/care/doctors" element={<Placeholder title="Doctor Records" description="Maintain records of doctors, specialists and healthcare providers." />} />

              {/* Location */}
              <Route path="/location/live" element={<LocationTracking />} />
              <Route path="/location/history" element={<LocationTracking />} />
              <Route path="/location/geofencing" element={<LocationTracking />} />

              {/* Content */}
              <Route path="/content/videos" element={<VideoManagement />} />
              <Route path="/content/tutorials" element={<Placeholder title="Tutorials" description="Manage how-to video tutorials and onboarding guides for elder users." />} />
              <Route path="/content/breathing" element={<Placeholder title="Breathing Programs" description="Manage guided breathing and meditation programs for stress relief." />} />

              {/* Reports */}
              <Route path="/reports" element={<Reports />} />

              {/* Notifications */}
              <Route path="/notifications" element={<Notifications />} />

              {/* Rewards */}
              <Route path="/rewards/streaks" element={<Placeholder title="Streaks" description="Track and manage daily streak achievements for elder wellness activities." />} />
              <Route path="/rewards/badges" element={<Placeholder title="Badges" description="Configure and award achievement badges for elder health milestones." />} />
              <Route path="/rewards/achievements" element={<Placeholder title="Achievements" description="Manage the gamification achievement system for elders." />} />

              {/* Settings */}
              <Route path="/settings/general" element={<Settings />} />
              <Route path="/settings/api-keys" element={<Settings />} />
              <Route path="/settings/audit-logs" element={<AuditLogs />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </AuthGuard>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
