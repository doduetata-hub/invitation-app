import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem' }}>Chargement...</div>;
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
