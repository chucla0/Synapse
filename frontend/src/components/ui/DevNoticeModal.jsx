import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Clock, CalendarSync, Rocket } from 'lucide-react';
import './DevNoticeModal.css';

const DevNoticeModal = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenNotice = localStorage.getItem('synapse_dev_notice_seen');
    if (!hasSeenNotice) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('synapse_dev_notice_seen', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="dev-modal-overlay">
      <div className="dev-modal-content">
        <button className="dev-modal-close" onClick={handleClose}>
          <X size={20} />
        </button>
        
        <div className="dev-modal-header">
          <div className="dev-icon-wrapper">
            <Rocket className="dev-icon" size={32} />
          </div>
          <h2>{t('dev_notice_title', 'Demo personal')}</h2>
        </div>

        <div className="dev-modal-body">
          <p className="dev-intro">
            {t('dev_notice_intro', 'Synapse es un proyecto personal de portfolio. No es un producto comercial.')}
          </p>

          <div className="dev-info-grid">
            <div className="dev-info-item">
              <Clock className="item-icon" size={20} />
              <div>
                <h4>{t('dev_notice_render_title', 'Arranque en Render')}</h4>
                <p>{t('dev_notice_render_desc', 'Uso la versión gratuita de Render: si el sitio ha estado inactivo, el servidor puede tardar hasta 1 minuto en despertar.')}</p>
              </div>
            </div>

            <div className="dev-info-item">
              <CalendarSync className="item-icon" size={20} />
              <div>
                <h4>{t('dev_notice_google_title', 'Google y Calendar')}</h4>
                <p>{t('dev_notice_google_desc', 'Puedes entrar con Google e importar tu Google Calendar para probar la sincronización. Solo se usa para la demo.')}</p>
              </div>
            </div>

            <div className="dev-info-item">
              <AlertTriangle className="item-icon" size={20} />
              <div>
                <h4>{t('dev_notice_data_title', 'Usa datos de prueba')}</h4>
                <p>{t('dev_notice_data_desc', 'Los datos pueden borrarse en cualquier momento y no hay garantías de disponibilidad ni de privacidad.')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="dev-modal-footer">
          <button className="btn btn-primary btn-block" onClick={handleClose}>
            {t('dev_notice_button', 'Entendido, continuar')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Small persistent pill so it is always clear this is a personal demo
const DemoBadge = () => {
  const { t } = useTranslation();
  return <div className="demo-badge">{t('demo_banner', 'Demo personal · proyecto de prueba')}</div>;
};

const DemoNotice = () => (
  <>
    <DemoBadge />
    <DevNoticeModal />
  </>
);

export default DemoNotice;
