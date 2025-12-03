import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import './CreateAgendaModal.css';

const AGENDA_TYPES = [
  { value: 'PERSONAL', label: 'Personal', description: 'Agenda personal privada' },
  { value: 'LABORAL', label: 'Laboral', description: 'Para equipos de trabajo' },
  { value: 'EDUCATIVA', label: 'Educativa', description: 'Para profesores y estudiantes' },
  { value: 'COLABORATIVA', label: 'Colaborativa', description: 'Cualquier miembro puede añadir eventos' }
];

const AGENDA_COLORS = {
  PERSONAL: 'var(--agenda-1)',     // Melocotón Suave / Naranja Fuerte
  LABORAL: 'var(--agenda-2)',      // Azul Cielo Pastel / Azul Fuerte
  EDUCATIVA: 'var(--agenda-3)',    // Amarillo Crema Pastel / Amarillo Fuerte
  COLABORATIVA: 'var(--agenda-4)'  // Rosa Algodón Suave / Rosa Fuerte
};

function CreateAgendaModal({ onClose, existingAgendas = [] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'PERSONAL',
    color: AGENDA_COLORS.PERSONAL,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  });
  const [errors, setErrors] = useState({});
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowTypeDropdown(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Check if user already has a Google Agenda
  const hasGoogleAgenda = existingAgendas.some(a => a.googleCalendarId || a.name === 'Google Calendar');

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/agendas', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate agendas query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
      onClose();
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error al crear la agenda';
      setErrors({ submit: message });
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'type') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        color: AGENDA_COLORS[value] || AGENDA_COLORS.PERSONAL
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = t('nameIsRequired');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('createAgendaTitle')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="agenda-form">
          {/* Name */}
          <div className="form-group">
            <label htmlFor="name">{t('agendaNameLabel')} *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('agendaNamePlaceholder')}
              className={`input ${errors.name ? 'error' : ''}`}
              disabled={createMutation.isPending}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">{t('descriptionLabel')}</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('descriptionPlaceholder')}
              rows="3"
              className="input"
              disabled={createMutation.isPending}
            />
          </div>

          {/* Type */}
          <div className="form-group">
            <label htmlFor="type">{t('agendaTypeLabel')}</label>
            <div className="type-selector-container" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="dropdown-toggle"
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                >
                  {AGENDA_TYPES.find(t => t.value === formData.type)?.label || formData.type}
                  <span className="dropdown-arrow">▼</span>
                </button>
                {showTypeDropdown && (
                  <ul className="dropdown-menu">
                    {AGENDA_TYPES.map(type => (
                      <li
                        key={type.value}
                        className={`dropdown-item ${formData.type === type.value ? 'active' : ''}`}
                        onClick={() => {
                          handleChange({ target: { name: 'type', value: type.value } });
                          setShowTypeDropdown(false);
                        }}
                      >
                        {type.label} - {type.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div
                className="color-preview"
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: formData.color,
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  flexShrink: 0
                }}
                title={`Color asignado: ${formData.color}`}
              />
            </div>
          </div>

          {!hasGoogleAgenda && (
            <div className="google-connect-separator">
              <div className="separator-line"></div>
              <span className="separator-text">{t('orSeparator', 'o')}</span>
              <div className="separator-line"></div>
            </div>
          )}

          {!hasGoogleAgenda && (
            <button
              type="button"
              className="btn-google-connect"
              onClick={() => {
                const user = queryClient.getQueryData(['user']) || JSON.parse(localStorage.getItem('synapse_user'));
                const loginHint = user?.email ? `&login_hint=${encodeURIComponent(user.email)}` : '';
                window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/google/connect?${loginHint}`;
              }}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg"
                alt="Google Calendar"
                width="24"
                height="24"
              />
              <span>{t('connectGoogleCalendar', 'Conectar con Google Calendar')}</span>
            </button>
          )}

          {/* Timezone (hidden, auto-detected) */}
          <input type="hidden" name="timezone" value={formData.timezone} />

          {/* Error message */}
          {errors.submit && (
            <div className="error-banner">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">

            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t('creatingAgendaButton') : t('createAgendaButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateAgendaModal;
