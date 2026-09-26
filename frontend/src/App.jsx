import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/auth/AuthContext';
import ProtectedRoute from './admin/components/ProtectedRoute';
import AdminLayout from './admin/layout/AdminLayout';
import LoginPage from './admin/pages/LoginPage';
import ForgotPasswordPage from './admin/pages/ForgotPasswordPage';
import ResetPasswordPage from './admin/pages/ResetPasswordPage';
import DashboardPage from './admin/pages/DashboardPage';
import ClientsListPage from './admin/pages/ClientsListPage';
import ClientFormPage from './admin/pages/ClientFormPage';
import ClientDetailPage from './admin/pages/ClientDetailPage';
import InvitationsListPage from './admin/pages/InvitationsListPage';
import SettingsPage from './admin/pages/SettingsPage';
import PublicInvitationPage from './public/PublicInvitationPage';

// Pages qui embarquent le moteur de templates complet (registre + sections + éditeur de design)
// ou la librairie de scan QR (jsqr) sont chargées à la demande pour garder le bundle initial léger.
const InvitationEditorPage = lazy(() => import('./admin/pages/InvitationEditorPage'));
const TemplatesLibraryPage = lazy(() => import('./admin/pages/TemplatesLibraryPage'));
const TemplatePreviewPage = lazy(() => import('./admin/pages/TemplatePreviewPage'));
const GuestsPage = lazy(() => import('./admin/pages/GuestsPage'));
const CheckInPage = lazy(() => import('./admin/pages/CheckInPage'));
const GuestbookPage = lazy(() => import('./admin/pages/GuestbookPage'));
const GuestbookQrPrintPage = lazy(() => import('./admin/pages/GuestbookQrPrintPage'));
const GuestbookQrPrintAllPage = lazy(() => import('./admin/pages/GuestbookQrPrintAllPage'));
const ClientAccessPage = lazy(() => import('./public/ClientAccessPage'));
const CheckinAccessPage = lazy(() => import('./public/CheckinAccessPage'));
const GuestbookQrPage = lazy(() => import('./public/GuestbookQrPage'));
const GuestbookDisplayPage = lazy(() => import('./public/GuestbookDisplayPage'));

function PageFallback() {
  return <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Chargement...</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/i/:slug" element={<PublicInvitationPage />} />
            <Route path="/gerer/:token" element={<ClientAccessPage />} />
            <Route path="/checkin/:token" element={<CheckinAccessPage />} />
            <Route path="/guestbook/:slug/display" element={<GuestbookDisplayPage />} />
            <Route path="/guestbook/:token" element={<GuestbookQrPage />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/admin/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/admin/templates/:key/preview"
              element={
                <ProtectedRoute>
                  <TemplatePreviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/invitations/:id/checkin"
              element={
                <ProtectedRoute>
                  <CheckInPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/invitations/:id/guestbook/print/:tokenId"
              element={
                <ProtectedRoute>
                  <GuestbookQrPrintPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/invitations/:id/guestbook/print-all"
              element={
                <ProtectedRoute>
                  <GuestbookQrPrintAllPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="clients" element={<ClientsListPage />} />
              <Route path="clients/new" element={<ClientFormPage />} />
              <Route path="clients/:id" element={<ClientDetailPage />} />
              <Route path="clients/:id/edit" element={<ClientFormPage />} />
              <Route path="invitations" element={<InvitationsListPage />} />
              <Route path="invitations/new" element={<InvitationEditorPage />} />
              <Route path="invitations/:id/edit" element={<InvitationEditorPage />} />
              <Route path="invitations/:id/guests" element={<GuestsPage />} />
              <Route path="invitations/:id/guestbook" element={<GuestbookPage />} />
              <Route path="templates" element={<TemplatesLibraryPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
