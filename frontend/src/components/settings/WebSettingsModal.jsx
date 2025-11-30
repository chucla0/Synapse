import { useState, useCallback } from 'react';
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
  Video,
  User,
  Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Cropper from 'react-easy-crop';
import api from '../../utils/api';
import { getUser, setUser, clearAuth } from '../../utils/auth';
import './WebSettingsModal.css';
import CustomSelect from '../ui/CustomSelect';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import ConfirmDeleteModal from '../ui/ConfirmDeleteModal';

// ... (inside component)
// Helper to create the cropped image
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve(file);
      } else {
        reject(new Error('Canvas is empty'));
      }
    }, 'image/jpeg', 0.95);
  });
}

function WebSettingsModal({ onClose, initialTab = 'display' }) {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();
  const { theme, setTheme, accentId, setAccentId, availableColors } = useTheme();
  const queryClient = useQueryClient();
  const currentUser = getUser();

  // Fetch fresh user profile to get hasPassword flag
  const { data: profileData } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => (await api.get('/auth/profile')).data,
    staleTime: 0, // Always fetch fresh
  });

  const userProfile = profileData?.user || currentUser;
  const isGoogleConnected = !!userProfile?.googleId;

  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile State
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    avatar: currentUser?.avatar || '',
    bio: currentUser?.bio || '',
    links: currentUser?.links || [],
    status: currentUser?.status || 'AVAILABLE',
    workingHours: currentUser?.workingHours || { start: '09:00', end: '17:00' },
    currentPassword: '',
    newPassword: '',
  });
  const [errors, setErrors] = useState({});

  // Cropper state
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleAvatarChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setIsCropping(true);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const uploadAvatarMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return api.post('/uploads/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => api.put('/auth/profile', data),
    onSuccess: (data) => {
      setUser(data.data.user);
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      alert(t('profileUpdated'));
    },
    onError: (error) => {
      const message = error.response?.data?.message || t('profileUpdateError');
      setErrors({ submit: message });
    }
  });

  const handleCropSave = async () => {
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([croppedImageBlob], "avatar.jpg", { type: "image/jpeg" });

      const uploadResponse = await uploadAvatarMutation.mutateAsync(file);
      const newAvatarUrl = uploadResponse.data.filePath;

      setFormData(prev => ({ ...prev, avatar: newAvatarUrl }));
      setIsCropping(false);
      setImageSrc(null);
    } catch (e) {
      console.error(e);
      setErrors({ submit: t('imageProcessError') });
    }
  };

  const handleCancelCrop = () => {
    setIsCropping(false);
    setImageSrc(null);
  };

  const handleDeleteAvatar = () => {
    if (window.confirm(t('confirmDeleteAvatar'))) {
      setFormData(prev => ({ ...prev, avatar: null }));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const payload = {};
    if (formData.name !== currentUser.name) payload.name = formData.name;
    if (formData.avatar !== currentUser.avatar) payload.avatar = formData.avatar;
    if (formData.bio !== currentUser.bio) payload.bio = formData.bio;
    if (JSON.stringify(formData.links) !== JSON.stringify(currentUser.links)) payload.links = formData.links;
    if (formData.status !== currentUser.status) payload.status = formData.status;
    if (JSON.stringify(formData.workingHours) !== JSON.stringify(currentUser.workingHours)) payload.workingHours = formData.workingHours;

    if (formData.newPassword) {
      payload.newPassword = formData.newPassword;
      payload.currentPassword = formData.currentPassword;
    }

    if (Object.keys(payload).length === 0) return;

    updateProfileMutation.mutate(payload);
  };

  const syncGoogleMutation = useMutation({
    mutationFn: () => api.post('/integrations/google/import'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      alert(t('googleCalendarSuccess'));
    },
    onError: (error) => {
      console.error(error);
      alert(t('syncError'));
    }
  });

  // Delete Account Logic
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const deleteAccountMutation = useMutation({
    mutationFn: (data) => api.delete('/auth/profile', { data }),
    onSuccess: () => {
      clearAuth();
      window.location.href = '/login';
    },
    onError: (error) => {
      setErrors(prev => ({ ...prev, delete: error.response?.data?.message || 'Error al eliminar la cuenta' }));
    }
  });

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate({ password: deletePassword });
  };

  const renderDisplaySettings = () => (
    <div className="settings-group">
      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('theme', 'Tema')}</label>
        </div>
        <div className="setting-control">
          <CustomSelect
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: t('light', 'Claro') },
              { value: 'dark', label: t('dark', 'Oscuro') }
            ]}
          />
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-info">
          <label className="setting-label">{t('accentColor', 'Color de Acento')}</label>
        </div>
        <div className="setting-control">
          <div className="accent-color-selector">
            {availableColors.map(color => (
              <button
                key={color.id}
                className={`color-swatch-btn ${accentId === color.id ? 'active' : ''}`}
                style={{ backgroundColor: theme === 'dark' ? color.dark : color.light }}
                onClick={() => setAccentId(color.id)}
                title={color.label}
              >
                {accentId === color.id && <Check size={14} color={theme === 'dark' ? '#fff' : '#000'} />}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      <div className="integration-card" style={{ opacity: 0.7 }}>
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

  const renderProfileSettings = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    if (isCropping) {
      return (
        <div className="cropper-container">
          <div className="cropper-wrapper">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              cropShape="round"
              showGrid={false}
            />
          </div>
          <div className="cropper-controls">
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(e.target.value)}
              className="zoom-range"
            />
            <div className="cropper-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancelCrop}>
                {t('cancelButton', 'Cancelar')}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleCropSave}>
                {t('saveImageButton', 'Guardar Imagen')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const handleAddLink = () => {
      if ((formData.links || []).length < 5) {
        setFormData({
          ...formData,
          links: [...(formData.links || []), { url: '', title: '' }]
        });
      }
    };

    const handleRemoveLink = (index) => {
      const newLinks = [...(formData.links || [])];
      newLinks.splice(index, 1);
      setFormData({ ...formData, links: newLinks });
    };

    const handleLinkChange = (index, field, value) => {
      const newLinks = [...(formData.links || [])];
      newLinks[index][field] = value;
      setFormData({ ...formData, links: newLinks });
    };

    return (
      <>
        <form onSubmit={handleProfileSubmit} className="profile-form">
          {/* Identity Section */}
          <div className="form-section">
            <h4 className="form-section-subtitle">{t('identity', 'Identidad Básica')}</h4>

            <div className="form-group">
              <label>{t('avatarUrlLabel', 'Foto de Perfil')}</label>
              <div className="avatar-upload-area">
                {formData.avatar ? (
                  <img
                    src={formData.avatar.startsWith('http') ? formData.avatar : `${API_URL}${formData.avatar}`}
                    alt="Avatar Preview"
                    className="avatar-preview"
                  />
                ) : (
                  <div className="avatar-preview avatar-preview-default">
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="avatar-actions">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="avatar-upload" className="btn btn-secondary btn-sm">
                    {t('changeImageButton', 'Cambiar')}
                  </label>
                  {formData.avatar && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={handleDeleteAvatar}
                      title={t('deleteImageButton', 'Eliminar')}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="name">{t('nameLabel', 'Nombre Visible')}</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                disabled={updateProfileMutation.isPending}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bio">{t('bioLabel', 'Biografía')}</label>
              <textarea
                id="bio"
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 200) })}
                className="input textarea"
                placeholder={t('bioPlaceholder', 'Cuéntanos un poco sobre ti...')}
                rows={3}
                maxLength={200}
                disabled={updateProfileMutation.isPending}
              />
              <span className="char-count">{(formData.bio || '').length}/200</span>
            </div>
          </div>

          {/* Contact & Connections */}
          <div className="form-section">
            <h4 className="form-section-subtitle">{t('contactAndConnections', 'Contacto y Conexiones')}</h4>

            <div className="form-group">
              <label htmlFor="email">{t('emailLabel', 'Email Principal')}</label>
              <input
                type="email"
                id="email"
                value={currentUser?.email || ''}
                className="input"
                disabled
                readOnly
              />
            </div>

            <div className="form-group">
              <label>{t('linksLabel', 'Enlaces Personalizados')}</label>
              {(formData.links || []).map((link, index) => (
                <div key={index} className="link-row">
                  <input
                    type="text"
                    placeholder={t('linkTitlePlaceholder', 'Título')}
                    value={link.title}
                    onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                    className="input link-title-input"
                  />
                  <input
                    type="url"
                    placeholder={t('linkUrlPlaceholder', 'URL')}
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                    className="input link-url-input"
                  />
                  <button
                    type="button"
                    className="btn btn-icon btn-danger"
                    onClick={() => handleRemoveLink(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {(formData.links || []).length < 5 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mt-2"
                  onClick={handleAddLink}
                >
                  + {t('addLinkButton', 'Añadir Enlace')}
                </button>
              )}
              {(formData.links || []).length >= 5 && (
                <p className="text-sm text-muted mt-1">{t('maxLinksReached', 'Máximo 5 enlaces')}</p>
              )}
            </div>
          </div>

          {/* Availability */}
          <div className="form-section">
            <h4 className="form-section-subtitle">{t('availability', 'Disponibilidad')}</h4>

            <div className="form-group">
              <label>{t('statusLabel', 'Estado de Disponibilidad')}</label>
              <div className="status-selector">
                {['AVAILABLE', 'AWAY', 'BUSY'].map(status => (
                  <label key={status} className={`status-option ${formData.status === status ? 'active' : ''} status-${status.toLowerCase()}`}>
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={formData.status === status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    />
                    <span className="status-dot"></span>
                    {t(`status_${status}`, status)}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>{t('workingHoursLabel', 'Horario de Trabajo')}</label>
              <div className="working-hours-inputs">
                <div className="time-input-group">
                  <label className="text-xs text-muted">{t('startTime', 'Inicio')}</label>
                  <input
                    type="time"
                    value={formData.workingHours?.start || '09:00'}
                    onChange={(e) => setFormData({
                      ...formData,
                      workingHours: { ...formData.workingHours, start: e.target.value }
                    })}
                    className="input"
                  />
                </div>
                <span className="time-separator">-</span>
                <div className="time-input-group">
                  <label className="text-xs text-muted">{t('endTime', 'Fin')}</label>
                  <input
                    type="time"
                    value={formData.workingHours?.end || '17:00'}
                    onChange={(e) => setFormData({
                      ...formData,
                      workingHours: { ...formData.workingHours, end: e.target.value }
                    })}
                    className="input"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="divider" />

          <h3 className="form-section-title">{t('changePasswordTitle', 'Cambiar Contraseña')}</h3>
          <div className="form-group">
            <label htmlFor="currentPassword">{t('currentPasswordLabel', 'Contraseña Actual')}</label>
            <input
              type="password"
              id="currentPassword"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className="input"
              placeholder="********"
              disabled={updateProfileMutation.isPending}
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">{t('newPasswordLabel', 'Nueva Contraseña')}</label>
            <input
              type="password"
              id="newPassword"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="input"
              placeholder="********"
              disabled={updateProfileMutation.isPending}
            />
          </div>

          {errors.submit && (
            <div className="error-banner">
              {errors.submit}
            </div>
          )}

          <div className="modal-actions" style={{ justifyContent: 'flex-start', padding: 0, border: 'none', background: 'transparent' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? t('savingButton', 'Guardando...') : t('saveChangesButton', 'Guardar Cambios')}
            </button>
          </div>
        </form>

        {
          !isCropping && (
            <div className="danger-zone">
              <h4>{t('dangerZoneTitle', 'Zona de Peligro')}</h4>
              <div className="danger-item">
                <div>
                  <strong>{t('deleteAccountButton', 'Eliminar Cuenta')}</strong>
                  <p>{t('deleteAccountWarning', 'Eliminar tu cuenta es irreversible. Se eliminarán todas tus agendas personales.')}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {t('deleteButton', 'Eliminar')}
                </button>
              </div>
            </div>
          )}

        {showDeleteConfirm && (
          <ConfirmDeleteModal
            message={t('confirmDeleteAccountMessage', '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')}
            onConfirm={handleDeleteAccount}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setDeletePassword('');
              setErrors(prev => ({ ...prev, delete: null }));
            }}
            isDeleting={deleteAccountMutation.isPending}
            confirmText={t('confirmDeleteButton', 'Sí, eliminar')}
            deletingText={t('deleting', 'Eliminando...')}
          >
            <div className="mt-4">
              {userProfile?.hasPassword ? (
                <input
                  type="password"
                  placeholder={t('passwordPlaceholder', 'Contraseña')}
                  className="input mb-2"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              ) : (
                <p className="text-sm text-muted mb-2">
                  {t('socialLoginDeleteMessage', 'Has iniciado sesión con Google. No se requiere contraseña para eliminar la cuenta.')}
                </p>
              )}
              {errors.delete && <p className="text-danger text-xs mb-2">{errors.delete}</p>}
            </div>
          </ConfirmDeleteModal>
        )}
      </>
    );
  };

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
              className={`settings-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={18} className="settings-nav-icon" />
              {t('profile', 'Perfil')}
            </button>
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
              {activeTab === 'profile' && t('profileSettings', 'Configuración de Perfil')}
              {activeTab === 'display' && t('displayPreferences', 'Preferencias de Visualización')}
              {activeTab === 'notifications' && t('notifications', 'Notificaciones y Alertas')}
              {activeTab === 'integrations' && t('integrations', 'Integraciones y Conexiones')}
              {activeTab === 'help' && t('helpAndLegal', 'Ayuda y Legal')}
            </h3>



            {activeTab === 'profile' && renderProfileSettings()}
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
