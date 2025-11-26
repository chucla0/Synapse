import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import './CreateEventModal.css';

const EVENT_STATUS_OPTIONS = [
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'PENDING_APPROVAL', label: 'Pendiente de Aprobación' }
];

function CreateEventModal({ agenda, onClose, initialDate = null }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startTime: initialDate ? formatDateTimeLocal(initialDate) : '',
    endTime: initialDate ? formatDateTimeLocal(new Date(initialDate.getTime() + 3600000)) : '',
    isAllDay: false,
    status: 'CONFIRMED',
    color: agenda.color,
    isPrivate: false
  });
  const [errors, setErrors] = useState({});

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/events', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', agenda.id] });
      onClose();
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error al crear el evento';
      setErrors({ submit: message });
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = t('titleIsRequired');
    }
    if (!formData.startTime) {
      newErrors.startTime = t('startIsRequired');
    }
    if (!formData.endTime) {
      newErrors.endTime = t('endIsRequired');
    }
    if (formData.startTime && formData.endTime && new Date(formData.startTime) >= new Date(formData.endTime)) {
      newErrors.endTime = t('endDateAfterStart');
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Convert to ISO format and add agendaId
    const eventData = {
      ...formData,
      agendaId: agenda.id,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString()
    };

    createMutation.mutate(eventData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('createEventTitle')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">{t('titleLabel')} *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={t('titlePlaceholder')}
              className={`input ${errors.title ? 'error' : ''}`}
              disabled={createMutation.isPending}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          {/* Time Range */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">{t('startDateTimeLabel')} *</label>
              <input
                type="datetime-local"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className={`input ${errors.startTime ? 'error' : ''}`}
                disabled={createMutation.isPending || formData.isAllDay}
              />
              {errors.startTime && <span className="error-message">{errors.startTime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endTime">{t('endDateTimeLabel')} *</label>
              <input
                type="datetime-local"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className={`input ${errors.endTime ? 'error' : ''}`}
                disabled={createMutation.isPending || formData.isAllDay}
              />
              {errors.endTime && <span className="error-message">{errors.endTime}</span>}
            </div>
          </div>

          {/* All Day */}
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isAllDay"
                checked={formData.isAllDay}
                onChange={handleChange}
                disabled={createMutation.isPending}
              />
              <span>{t('allDayEventLabel')}</span>
            </label>
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

          {/* Location */}
          <div className="form-group">
            <label htmlFor="location">{t('locationLabel')}</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={t('locationPlaceholder')}
              className="input"
              disabled={createMutation.isPending}
            />
          </div>

          {/* Status (for LABORAL agendas) */}
          {agenda.type === 'LABORAL' && (
            <div className="form-group">
              <label htmlFor="status">{t('statusLabel')}</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
                disabled={createMutation.isPending}
              >
                {EVENT_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Private */}
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleChange}
                disabled={createMutation.isPending}
              />
              <span>{t('privateEventLabel')}</span>
            </label>
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="error-banner">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              {t('cancelButton')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t('creatingEventButton') : t('createEventButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function to format date for datetime-local input
function formatDateTimeLocal(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default CreateEventModal;
