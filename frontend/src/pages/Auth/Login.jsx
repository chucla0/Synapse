import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { setAuthData } from '../../utils/auth';
import AuthLayout from '../../layouts/AuthLayout';
import './Auth.css';

function Login({ onLogin }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState(null);

  const loginMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      const { tokens, user } = data;
      setAuthData({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      });
      onLogin();
      navigate('/dashboard');
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    },
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate(formData);
  };

  return (
    <AuthLayout 
      title={t('loginTitle')}
      subtitle={t('welcomeSubtitle')}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="email">{t('emailLabel')}</label>
          <input
            type="email"
            id="email"
            name="email"
            className="input"
            placeholder="tu@email.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">{t('passwordLabel')}</label>
          <input
            type="password"
            id="password"
            name="password"
            className="input"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary btn-block btn-lg"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? t('loading') : t('loginButton')}
        </button>

        <div className="auth-footer-link">
          {t('noAccountPrompt')} <Link to="/register">{t('registerLink')}</Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Login;
