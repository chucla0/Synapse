import { useTranslation } from 'react-i18next';
import { X, Calendar, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { getUser } from '../../utils/auth';
import './ProfileSettingsModal.css'; // Reuse styles for now

function WebSettingsModal({ onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = getUser();
  const isGoogleConnected = !!currentUser?.googleId;

  const syncGoogleMutation = useMutation({
    mutationFn: () => api.post('/integrations/google/import'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      alert(t('googleCalendarSuccess'));
    },
    onError: (error) => {
      console.error(error);
      alert('Error al sincronizar');
    }
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h1>{t('webSettingsTitle', 'Configuración')}</h1>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="settings-section">
          <h3>{t('integrationsTitle', 'Integraciones')}</h3>
          <div className="integration-item">
            <div className="integration-info">
              <span className="integration-icon google-icon">
                <Calendar size={20} />
              </span>
              <div className="integration-details">
                <span className="integration-name">Google Calendar</span>
                <span className={`integration-status ${isGoogleConnected ? 'connected' : 'disconnected'}`}>
                  {isGoogleConnected ? (
                    <><CheckCircle size={12} /> {t('connectedStatus', 'Conectado')}</>
                  ) : (
                    <><AlertCircle size={12} /> {t('disconnectedStatus', 'Desconectado')}</>
                  )}
                </span>
              </div>
            </div>
            {isGoogleConnected && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => syncGoogleMutation.mutate()}
                disabled={syncGoogleMutation.isPending}
              >
                {syncGoogleMutation.isPending ? t('syncingButton') : t('resyncButton')}
              </button>
            )}
          </div>
        </div>

        <div className="settings-section">
          <h3>{t('userGuideTitle', 'Guía de Usuario')}</h3>
          <div className="guide-placeholder">
            <BookOpen size={48} className="text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm text-center">
              {t('guideComingSoon', 'El manual de usuario estará disponible próximamente.')}
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>
            {t('closeButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WebSettingsModal;
