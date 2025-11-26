import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { setAuthData } from '../utils/auth';
import './Auth.css';

function Login({ onLogin }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', formData);
      const { tokens, user } = response.data;

      // Save auth data
      setAuthData({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      });

      onLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="auth-header">
          <img 
            src="/synapse_logo.jpg" 
            alt="Synapse Logo" 
            className="auth-logo"
          />
          <h1>{t('loginTitle')}</h1>
          <p className="text-muted">Inicia sesión en tu cuenta</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">{t('emailLabel')}</label>
            <input
              id="email"
              type="email"
              name="email"
              className="input"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('passwordLabel')}</label>
            <input
              id="password"
              type="password"
              name="password"
              className="input"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? t('loggingIn') : t('loginButton')}
          </button>
        </form>

        <div className="auth-footer">
          <p className="text-muted text-sm">
            {t('noAccountPrompt')}{' '}
            <Link to="/register" className="link">
              {t('registerLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
