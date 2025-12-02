import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { setAuthData } from '../../utils/auth';
import AuthLayout from '../../layouts/AuthLayout';

function Verify({ onLogin }) {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token no proporcionado');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await api.post('/auth/verify', { token });
                const { tokens } = response.data;

                setAuthData({
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    // We don't have the full user object here unless the backend returns it, 
                    // but setAuthData usually needs it. 
                    // Let's check api.js/auth.js usage. 
                    // Usually we decode the token or fetch profile.
                    // For now, let's assume we can fetch profile or just store tokens.
                    // The backend verify response returns tokens.
                });

                // Fetch full profile to ensure we have user data
                const profileResponse = await api.get('/auth/profile');
                setAuthData({
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    user: profileResponse.data.user
                });

                setStatus('success');
                onLogin();

                // Redirect after a short delay
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);

            } catch (error) {
                console.error('Verification error:', error);
                setStatus('error');
                setMessage(error.response?.data?.message || 'Error al verificar el email');
            }
        };

        verifyEmail();
    }, [token, navigate, onLogin]);

    return (
        <AuthLayout>
            <div className="auth-header">
                <h1>Verificación de Email</h1>
            </div>

            <div className="auth-form" style={{ textAlign: 'center' }}>
                {status === 'verifying' && (
                    <div>
                        <div className="spinner"></div>
                        <p>Verificando tu cuenta...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="alert alert-success">
                        <h3>¡Cuenta verificada!</h3>
                        <p>Redirigiendo al dashboard...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="alert alert-error">
                        <h3>Error de verificación</h3>
                        <p>{message}</p>
                        <Link to="/login" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                            Volver al Login
                        </Link>
                    </div>
                )}
            </div>
        </AuthLayout>
    );
}

export default Verify;
