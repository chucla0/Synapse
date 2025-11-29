import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, User, Briefcase, PartyPopper, GraduationCap, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import '../pages/Auth/Auth.css';

const AuthLayout = ({ children, title, subtitle }) => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

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
          onClick={() => i18n.changeLanguage('es')}
        >
          ES
        </button>
        <button 
          className={`lang-btn lang-btn-en ${i18n.language === 'en' ? 'active' : ''}`} 
          onClick={() => i18n.changeLanguage('en')}
        >
          EN
        </button>
        <button 
          className={`lang-btn lang-btn-ca ${i18n.language === 'ca' ? 'active' : ''}`} 
          onClick={() => i18n.changeLanguage('ca')}
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

          {/* Agenda Types Section */}
          <section className="scroll-section agendas-section">
            <h2>{t('auth_agendas_title')}</h2>
            <div className="agenda-showcase">
              
              <div className="showcase-item">
                <div className="icon-box personal"><User size={24} /></div>
                <div className="text-box">
                  <h3>{t('auth_agenda_personal_title')}</h3>
                  <p>
                    {t('auth_agenda_personal_description')}
                  </p>
                </div>
              </div>

              <div className="showcase-item">
                <div className="icon-box work"><Briefcase size={24} /></div>
                <div className="text-box">
                  <h3>{t('auth_agenda_work_title')}</h3>
                  <p>
                    {t('auth_agenda_work_description')}
                  </p>
                </div>
              </div>

              <div className="showcase-item">
                <div className="icon-box social"><PartyPopper size={24} /></div>
                <div className="text-box">
                  <h3>{t('auth_agenda_social_title')}</h3>
                  <p>
                    {t('auth_agenda_social_description')}
                  </p>
                </div>
              </div>

              <div className="showcase-item">
                <div className="icon-box studies"><GraduationCap size={24} /></div>
                <div className="text-box">
                  <h3>{t('auth_agenda_studies_title')}</h3>
                  <p>
                    {t('auth_agenda_studies_description')}
                  </p>
                </div>
              </div>

            </div>
          </section>

          {/* Design & Simplicity */}
          <section className="scroll-section design-section">
            <h2>{t('auth_design_title')}</h2>
            <div className="design-grid">
              <div className="design-card">
                <h3>{t('auth_design_customizable_title')}</h3>
                <p>
                  {t('auth_design_customizable_desc')}
                </p>
              </div>
              <div className="design-card">
                <h3>{t('auth_design_simple_title')}</h3>
                <p>
                  {t('auth_design_simple_desc')}
                </p>
              </div>
            </div>
          </section>

          {/* Coming Soon - Chat */}
          <section className="scroll-section future-section">
            <div className="future-badge">{t('auth_future_badge')}</div>
            <h2>{t('auth_future_title')}</h2>
            <p>
              {t('auth_future_desc')}
            </p>
          </section>

          {/* Security */}
          <section className="scroll-section security-section">
            <h2>{t('auth_security_title')}</h2>
            <p>
              {t('auth_security_desc')}
            </p>
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
