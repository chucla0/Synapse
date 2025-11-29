import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { clearAuth, setAuthData } from '../utils/auth';
import AuthLayout from '../layouts/AuthLayout';
import './Auth/Auth.css';

export default function SetPassword({ onLogin }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [tempToken, setTempToken] = useState(null);

  useEffect(() => {
    if (location.state?.tempToken) {
      setTempToken(location.state.tempToken);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {
      if (tempToken) {
        // New user flow: Complete registration
        const response = await api.post('/auth/google/complete', { 
          tempToken, 
          password 
        });
        
        const { tokens, user } = response.data;
        setAuthData({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
        });
      } else {
        // Existing user flow (legacy or linking)
        await api.post('/auth/set-password', { password });
      }
      
      if (onLogin) onLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al establecer la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <AuthLayout 
      title="Establece tu contraseña"
      subtitle="Para completar tu registro con Google, necesitamos que definas una contraseña."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="password">Nueva contraseña</label>
          <input
            type="password"
            id="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar contraseña</label>
          <input
            type="password"
            id="confirmPassword"
            className="input"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary btn-block btn-lg"
          disabled={isLoading}
        >
          {isLoading ? 'Guardando...' : 'Establecer contraseña y continuar'}
        </button>

        <button 
          type="button" 
          className="btn btn-secondary btn-block btn-lg"
          onClick={handleBack}
          disabled={isLoading}
        >
          Volver atrás
        </button>
      </form>
    </AuthLayout>
  );
}
