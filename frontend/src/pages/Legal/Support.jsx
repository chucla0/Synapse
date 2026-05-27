import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Github, MessageSquare } from 'lucide-react';
import './Legal.css';

const Support = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="legal-container">
      <header className="legal-header">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={20} />
          <span>{t('back', 'Volver')}</span>
        </button>
        <h1>{t('contactSupport', 'Contacto y Soporte')}</h1>
      </header>
      
      <main className="legal-content">
        <section>
          <h2>¿Tienes algún problema?</h2>
          <p>Synapse está en desarrollo activo. Si encuentras un error o tienes alguna sugerencia, no dudes en contactarnos.</p>
        </section>

        <div className="support-grid">
          <div className="support-card">
            <Mail className="support-icon" />
            <h3>Email</h3>
            <p>iizan.cruzz@gmail.com</p>
          </div>

          <div className="support-card">
            <Github className="support-icon" />
            <h3>GitHub</h3>
            <p>Reporta un issue en el repositorio oficial.</p>
          </div>

          <div className="support-card">
            <MessageSquare className="support-icon" />
            <h3>Comunidad</h3>
            <p>Únete a nuestro canal de feedback.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Support;
