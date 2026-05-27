import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Clock, MailWarning, Rocket } from 'lucide-react';
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
          <h2>{t('dev_notice_title', 'Proyecto en Desarrollo')}</h2>
        </div>

        <div className="dev-modal-body">
          <p className="dev-intro">
            {t('dev_notice_intro', 'Bienvenido a Synapse. Este proyecto se encuentra actualmente en fase Beta/Desarrollo.')}
          </p>

          <div className="dev-info-grid">
            <div className="dev-info-item">
              <Clock className="item-icon" size={20} />
              <div>
                <h4>{t('dev_notice_render_title', 'Arranque en Render')}</h4>
                <p>{t('dev_notice_render_desc', 'Usamos la versión gratuita de Render. Si el sitio ha estado inactivo, el backend puede tardar hasta 1 minuto en "despertar". Gracias por tu paciencia.')}</p>
              </div>
            </div>

            <div className="dev-info-item">
              <MailWarning className="item-icon" size={20} />
              <div>
                <h4>{t('dev_notice_email_title', 'Correos Electrónicos')}</h4>
                <p>{t('dev_notice_email_desc', 'El sistema de envío de emails (verificación, recordatorios) está desactivado temporalmente. Puedes usar la app sin verificar el correo.')}</p>
              </div>
            </div>

            <div className="dev-info-item">
              <AlertTriangle className="item-icon" size={20} />
              <div>
                <h4>{t('dev_notice_beta_title', 'Funcionalidades Beta')}</h4>
                <p>{t('dev_notice_beta_desc', 'Algunas secciones pueden estar incompletas o presentar errores visuales menores mientras seguimos puliendo la experiencia.')}</p>
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

export default DevNoticeModal;
