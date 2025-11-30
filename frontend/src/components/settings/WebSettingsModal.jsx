import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Monitor, 
  Bell, 
  Link as LinkIcon, 
  HelpCircle, 
  ChevronRight, 
  Check,
  Calendar,
  Mail,
  Video
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { getUser } from '../../utils/auth';
import './WebSettingsModal.css';
import CustomSelect from '../ui/CustomSelect';
import { useSettings } from '../../contexts/SettingsContext';

function WebSettingsModal({ onClose }) {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();
  const queryClient = useQueryClient();
  const currentUser = getUser();
  const isGoogleConnected = !!currentUser?.googleId;
  
  const [activeTab, setActiveTab] = useState('display');

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



// ... (imports remain the same)

// ... (inside component)

  const renderDisplaySettings = () => (
    <div className="settings-group">
      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('timezone', 'Zona Horaria')}</label>
          <p className="setting-description">{t('timezoneDesc', 'Tu zona horaria actual')}</p>
        </div>
        <div className="setting-control">
          <CustomSelect
            value={settings.display.timezone}
            onChange={(val) => updateSetting('display', 'timezone', val)}
            options={[{ value: settings.display.timezone, label: settings.display.timezone }]}
            disabled={true}
          />
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('timeFormat', 'Formato de Hora')}</label>
        </div>
        <div className="setting-control">
          <CustomSelect
            value={settings.display.timeFormat}
            onChange={(val) => updateSetting('display', 'timeFormat', val)}
            options={[
              { value: '12h', label: '12h (am/pm)' },
              { value: '24h', label: '24h' }
            ]}
          />
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('weekStart', 'Primer Día de la Semana')}</label>
        </div>
        <div className="setting-control">
          <CustomSelect
            value={settings.display.weekStart}
            onChange={(val) => updateSetting('display', 'weekStart', val)}
            options={[
              { value: 'monday', label: t('monday', 'Lunes') },
              { value: 'sunday', label: t('sunday', 'Domingo') }
            ]}
          />
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('defaultView', 'Vista por Defecto')}</label>
        </div>
        <div className="setting-control">
          <CustomSelect
            value={settings.display.defaultView}
            onChange={(val) => updateSetting('display', 'defaultView', val)}
            options={[
              { value: 'day', label: t('day', 'Día') },
              { value: 'week', label: t('week', 'Semana') },
              { value: 'month', label: t('month', 'Mes') }
            ]}
          />
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('language', 'Idioma')}</label>
        </div>
        <div className="setting-control">
          <CustomSelect
            value={settings.display.language}
            onChange={(val) => updateSetting('display', 'language', val)}
            options={[
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
              { value: 'ca', label: 'Català' }
            ]}
          />
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('density', 'Densidad de la Interfaz')}</label>
        </div>
        <div className="setting-control">
          <CustomSelect
            value={settings.display.density}
            onChange={(val) => updateSetting('display', 'density', val)}
            options={[
              { value: 'standard', label: t('standard', 'Estándar') },
              { value: 'compact', label: t('compact', 'Compacta') }
            ]}
          />
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="settings-group">
      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('defaultAlert', 'Alerta Predeterminada')}</label>
          <p className="setting-description">{t('defaultAlertDesc', 'Tiempo antes del evento')}</p>
        </div>
        <div className="setting-control">
          <CustomSelect
            value={settings.notifications.defaultAlert}
            onChange={(val) => updateSetting('notifications', 'defaultAlert', val)}
            options={[
              { value: 0, label: t('atTime', 'Al momento') },
              { value: 5, label: `5 ${t('minutes', 'minutos')}` },
              { value: 10, label: `10 ${t('minutes', 'minutos')}` },
              { value: 15, label: `15 ${t('minutes', 'minutos')}` },
              { value: 30, label: `30 ${t('minutes', 'minutos')}` },
              { value: 60, label: `1 ${t('hour', 'hora')}` }
            ]}
          />
        </div>
      </div>

      {/* ... toggles remain the same ... */}
      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('browserNotifications', 'Notificaciones de Navegador')}</label>
        </div>
        <div className="setting-control">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={settings.notifications.browserNotifications}
              onChange={(e) => updateSetting('notifications', 'browserNotifications', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('emailNotifications', 'Notificaciones por Email')}</label>
        </div>
        <div className="setting-control">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={settings.notifications.emailNotifications}
              onChange={(e) => updateSetting('notifications', 'emailNotifications', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('soundEnabled', 'Sonidos de Alerta')}</label>
        </div>
        <div className="setting-control">
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={settings.notifications.soundEnabled}
              onChange={(e) => updateSetting('notifications', 'soundEnabled', e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderIntegrationSettings = () => (
    <div className="settings-group">
      {/* ... Google Calendar & Outlook cards remain the same ... */}
      <div className="integration-card">
        <div className="integration-header">
          <div className="integration-icon-box">
            <Calendar size={20} />
          </div>
          <div className="integration-meta">
            <h4>Google Calendar</h4>
            <span className={`integration-status-badge ${isGoogleConnected ? 'connected' : ''}`}>
              {isGoogleConnected ? t('connected', 'Conectado') : t('disconnected', 'Desconectado')}
            </span>
          </div>
        </div>
        <div className="integration-actions">
          {isGoogleConnected ? (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => syncGoogleMutation.mutate()}
              disabled={syncGoogleMutation.isPending}
            >
              {syncGoogleMutation.isPending ? t('syncing', 'Sincronizando...') : t('resync', 'Resincronizar')}
            </button>
          ) : (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => {
                const loginHint = currentUser?.email ? `&login_hint=${encodeURIComponent(currentUser.email)}` : '';
                window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/google/connect?${loginHint}`;
              }}
            >
              {t('connect', 'Conectar')}
            </button>
          )}
        </div>
      </div>

      <div className="integration-card" style={{opacity: 0.7}}>
        <div className="integration-header">
          <div className="integration-icon-box">
            <Mail size={20} />
          </div>
          <div className="integration-meta">
            <h4>Outlook Calendar</h4>
            <span className="integration-status-badge">{t('comingSoon', 'Próximamente')}</span>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" disabled>{t('connect', 'Conectar')}</button>
      </div>

      <div className="setting-row mt-4">
        <div className="setting-info">
          <label className="setting-label">{t('meetingService', 'Servicio de Videoconferencia')}</label>
          <p className="setting-description">{t('meetingServiceDesc', 'Plataforma por defecto para reuniones')}</p>
        </div>
        <div className="setting-control">
          <CustomSelect
            value={settings.integrations.meetingService}
            onChange={(val) => updateSetting('integrations', 'meetingService', val)}
            options={[
              { value: 'google_meet', label: 'Google Meet' },
              { value: 'zoom', label: 'Zoom' },
              { value: 'none', label: t('none', 'Ninguno') }
            ]}
          />
        </div>
      </div>
    </div>
  );

  const renderHelpSettings = () => (
    <div className="settings-group">
      <div className="help-links">
        <a href="#" className="help-link-item" onClick={(e) => e.preventDefault()}>
          <span>{t('userGuide', 'Guía de Usuario')}</span>
          <ChevronRight size={16} />
        </a>
        <a href="#" className="help-link-item" onClick={(e) => e.preventDefault()}>
          <span>{t('contactSupport', 'Contacto y Soporte')}</span>
          <ChevronRight size={16} />
        </a>
        <a href="#" className="help-link-item" onClick={(e) => e.preventDefault()}>
          <span>{t('termsOfService', 'Términos de Servicio')}</span>
          <ChevronRight size={16} />
        </a>
        <a href="#" className="help-link-item" onClick={(e) => e.preventDefault()}>
          <span>{t('privacyPolicy', 'Política de Privacidad')}</span>
          <ChevronRight size={16} />
        </a>
      </div>
      
      <div className="version-info">
        <p>Synapse v1.0.0</p>
        <p>&copy; 2025 Synapse Inc.</p>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content web-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="web-settings-header">
          <h2>{t('webSettingsTitle', 'Configuración Web')}</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="web-settings-body">
          <aside className="settings-sidebar">
            <button 
              className={`settings-nav-item ${activeTab === 'display' ? 'active' : ''}`}
              onClick={() => setActiveTab('display')}
            >
              <Monitor size={18} className="settings-nav-icon" />
              {t('displayPreferences', 'Visualización')}
            </button>
            <button 
              className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={18} className="settings-nav-icon" />
              {t('notifications', 'Notificaciones')}
            </button>
            <button 
              className={`settings-nav-item ${activeTab === 'integrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('integrations')}
            >
              <LinkIcon size={18} className="settings-nav-icon" />
              {t('integrations', 'Integraciones')}
            </button>
            <button 
              className={`settings-nav-item ${activeTab === 'help' ? 'active' : ''}`}
              onClick={() => setActiveTab('help')}
            >
              <HelpCircle size={18} className="settings-nav-icon" />
              {t('helpAndLegal', 'Ayuda y Legal')}
            </button>
          </aside>

          <main className="settings-content">
            <h3 className="settings-section-title">
              {activeTab === 'display' && t('displayPreferences', 'Preferencias de Visualización')}
              {activeTab === 'notifications' && t('notifications', 'Notificaciones y Alertas')}
              {activeTab === 'integrations' && t('integrations', 'Integraciones y Conexiones')}
              {activeTab === 'help' && t('helpAndLegal', 'Ayuda y Legal')}
            </h3>
            
            {activeTab === 'display' && renderDisplaySettings()}
            {activeTab === 'notifications' && renderNotificationSettings()}
            {activeTab === 'integrations' && renderIntegrationSettings()}
            {activeTab === 'help' && renderHelpSettings()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default WebSettingsModal;
