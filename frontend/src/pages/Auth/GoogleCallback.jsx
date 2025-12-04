import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAuthData } from '../../utils/auth';
import api from '../../utils/api';

export default function GoogleCallback({ onLogin, isAuthenticated }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const needsPassword = searchParams.get('needsPassword');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login?error=auth_failed');
      return;
    }

    const processLogin = async () => {
      // Handle new user registration flow
      const tempToken = searchParams.get('tempToken');
      const isNewUser = searchParams.get('isNewUser');

      if (tempToken && isNewUser === 'true') {
        navigate('/set-password', { state: { tempToken } });
        return;
      }

      if (accessToken && refreshToken) {
        try {
          // Store tokens first to allow api calls to work
          setAuthData({ accessToken, refreshToken });

          // Fetch user profile
          const response = await api.get('/auth/profile');
          const user = response.data.user;

          // Update auth data with user
          setAuthData({ accessToken, refreshToken, user });

          if (needsPassword === 'true') {
            navigate('/set-password');
          } else {
            // Only trigger login state update if not already authenticated
            // This prevents unnecessary re-renders/remounts of Dashboard
            if (onLogin && !isAuthenticated) {
              onLogin();
            }

            const action = searchParams.get('action');
            if (action === 'import_google') {
              localStorage.setItem('synapse_pending_import', 'true');
            }

            navigate('/dashboard');
          }
        } catch (err) {
          navigate('/login?error=profile_fetch_failed');
        }
      } else {
        navigate('/login');
      }
    };

    processLogin();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Procesando inicio de sesión...</p>
      </div>
    </div>
  );
}
