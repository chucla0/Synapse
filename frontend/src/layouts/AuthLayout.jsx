import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, User, Briefcase, PartyPopper, GraduationCap, Sun, Moon, Layers, Shield, Zap, Users, MessageCircle, Lock, Bell, Move } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import '../pages/Auth/Auth.css';

const AuthLayout = ({ children, title, subtitle }) => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { updateSetting } = useSettings();

  const handleLanguageChange = (lang) => {
    updateSetting('display', 'language', lang);
  };

  return (
    <div className="auth-layout">
      {/* Floating Language Switcher */}
      <div className="auth-language-switcher">
        <button
          className="theme-toggle-btn"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="divider-vertical"></div>
        <button
          className={`lang-btn lang-btn-es ${i18n.language === 'es' ? 'active' : ''}`}
          onClick={() => handleLanguageChange('es')}
        >
          ES
        </button>
        <button
          className={`lang-btn lang-btn-en ${i18n.language === 'en' ? 'active' : ''}`}
          onClick={() => handleLanguageChange('en')}
        >
          EN
        </button>
        <button
          className={`lang-btn lang-btn-ca ${i18n.language === 'ca' ? 'active' : ''}`}
          onClick={() => handleLanguageChange('ca')}
        >
          CA
        </button>
      </div>

      {/* Left Side - Form */}
      <div className="auth-left">
        <div className="auth-content">
          <div className="auth-brand-left">
            <img src="/synapse_logo.jpg" alt="Synapse Logo" className="auth-logo-brand" />
            <h2 className="brand-name-mobile">Synapse</h2>
          </div>
          {children}
        </div>
      </div>

      {/* Right Side - Presentation */}
      <div className="auth-right">
        <div className="presentation-scroll-container">

          {/* Hero Section */}
          <section className="scroll-section hero-section">
            <h1 className="big-title">{t('auth_hero_title')}</h1>
            <p className="hero-subtitle">{t('auth_hero_subtitle')}</p>
            <div className="scroll-indicator">
              <span>{t('auth_hero_discover_more')}</span>
              <div className="arrow-down"><ArrowDown size={20} /></div>
            </div>
          </section>

          {/* Intro Section */}
          <section className="scroll-section intro-section">
            <h2>{t('auth_intro_title')}</h2>
            <p>
              {t('auth_intro_description')}
            </p>
          </section>

          {/* Bento Grid Features Section */}
          <section className="scroll-section bento-section">
            <div className="bento-grid">

              {/* Main Feature - Large */}
              <div className="bento-item bento-main">
                <div className="bento-icon"><Layers size={40} /></div>
                <h3>{t('auth_bento_main_title')}</h3>
                <p>{t('auth_bento_main_desc')}</p>
              </div>

              {/* Privacy - Tall */}
              <div className="bento-item bento-privacy">
                <div className="bento-icon"><Shield size={32} /></div>
                <h3>{t('auth_bento_privacy_title')}</h3>
                <p>{t('auth_bento_privacy_desc')}</p>
              </div>

              {/* Speed - Small */}
              <div className="bento-item bento-speed">
                <div className="bento-icon"><Zap size={32} /></div>
                <h3>{t('auth_bento_speed_title')}</h3>
                <p>{t('auth_bento_speed_desc')}</p>
              </div>

              {/* Collaboration - Medium */}
              <div className="bento-item bento-collab">
                <div className="bento-icon"><Users size={32} /></div>
                <h3>{t('auth_bento_collab_title')}</h3>
                <p>{t('auth_bento_collab_desc')}</p>
              </div>

            </div>
          </section>

          {/* Detailed Agendas Section - Bento Style */}
          <section className="scroll-section agendas-bento-section">
            <h2>{t('auth_agenda_section_title')}</h2>
            <div className="bento-grid-agendas">

              <div className="bento-card personal">
                <div className="card-icon"><User size={40} /></div>
                <div className="card-content">
                  <h3>{t('auth_agenda_personal_title')}</h3>
                  <h4>{t('auth_agenda_personal_subtitle')}</h4>
                  <p>{t('auth_agenda_personal_desc')}</p>
                </div>
              </div>

              <div className="bento-card work">
                <div className="card-icon"><Briefcase size={40} /></div>
                <div className="card-content">
                  <h3>{t('auth_agenda_work_title')}</h3>
                  <h4>{t('auth_agenda_work_subtitle')}</h4>
                  <p>{t('auth_agenda_work_desc')}</p>
                </div>
              </div>

              <div className="bento-card social">
                <div className="card-icon"><PartyPopper size={40} /></div>
                <div className="card-content">
                  <h3>{t('auth_agenda_social_title')}</h3>
                  <h4>{t('auth_agenda_social_subtitle')}</h4>
                  <p>{t('auth_agenda_social_desc')}</p>
                </div>
              </div>

              <div className="bento-card studies">
                <div className="card-icon"><GraduationCap size={40} /></div>
                <div className="card-content">
                  <h3>{t('auth_agenda_studies_title')}</h3>
                  <h4>{t('auth_agenda_studies_subtitle')}</h4>
                  <p>{t('auth_agenda_studies_desc')}</p>
                </div>
              </div>

            </div>
          </section>

          {/* Features Section - Bento Style */}
          <section className="scroll-section features-bento-section">
            <h2>{t('auth_features_section_title')}</h2>
            <div className="bento-grid-features">

              {/* Chat */}
              <div className="bento-card feature-card">
                <div className="card-icon feature"><MessageCircle size={32} /></div>
                <h3>{t('auth_feature_chat_title')}</h3>
                <p>{t('auth_feature_chat_desc')}</p>
              </div>

              {/* Roles */}
              <div className="bento-card feature-card">
                <div className="card-icon feature"><Lock size={32} /></div>
                <h3>{t('auth_feature_roles_title')}</h3>
                <p>{t('auth_feature_roles_desc')}</p>
              </div>

              {/* Notifications */}
              <div className="bento-card feature-card">
                <div className="card-icon feature"><Bell size={32} /></div>
                <h3>{t('auth_feature_notifications_title')}</h3>
                <p>{t('auth_feature_notifications_desc')}</p>
              </div>

              {/* Drag & Drop */}
              <div className="bento-card feature-card">
                <div className="card-icon feature"><Move size={32} /></div>
                <h3>{t('auth_feature_dnd_title')}</h3>
                <p>{t('auth_feature_dnd_desc')}</p>
              </div>

            </div>
          </section>

          {/* Revolution CTA Section */}
          <section className="scroll-section revolution-section">
            <div className="revolution-content">
              <h2>{t('auth_security_title')}</h2>
              <p>{t('auth_security_desc')}</p>
            </div>
          </section>

          <footer className="presentation-footer-scroll">
            <p>{t('auth_footer')}</p>
          </footer>

        </div>

        {/* Decorative Background Elements */}
        <div className="bg-shape shape-1"></div>
        <div className="bg-shape shape-2"></div>
      </div>
    </div>
  );
};

export default AuthLayout;
