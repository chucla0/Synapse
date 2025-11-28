import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { RRule } from 'rrule';
import AnimatedCheckbox from '../ui/AnimatedCheckbox';
import CustomDatePicker from '../ui/CustomDatePicker';
import './CreateEventModal.css';

const EVENT_STATUS_OPTIONS = [
  { value: 'CONFIRMED', label: 'Confirmado' }
];

const EVENT_COLORS = [
  '#FFADAD', // Light Red
  '#FFD6A5', // Light Orange
  '#FDFFB6', // Light Yellow
  '#CAFFBF', // Light Green
  '#9BF6FF', // Light Cyan
  '#A0C4FF', // Light Blue
  '#BDB2FF', // Light Purple
  '#FFC6FF', // Light Magenta
  '#FFFFFC', // Light White
  '#EAE4E9', // Light Grey
  '#FFF1E6', // Light Brown
  '#F0EFEB', // Light Silver
];

function CreateEventModal({ agenda, onClose, initialDate = null, event = null }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    startTime: event?.startTime ? new Date(event.startTime) : (initialDate ? new Date(initialDate) : new Date()),
    endTime: event?.endTime ? new Date(event.endTime) : (initialDate ? new Date(new Date(initialDate).getTime() + 3600000) : new Date(new Date().getTime() + 3600000)),
    isAllDay: event?.isAllDay || false,
    status: event?.status || 'CONFIRMED',
    color: event?.color || EVENT_COLORS[0],
    isPrivate: event?.isPrivate || false,
    attachments: event?.attachments || [],
    links: event?.links || []
  });
  
  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(event?.isRecurring || false);
  const [recurrenceDays, setRecurrenceDays] = useState(() => {
    if (event?.recurrenceRule) {
      try {
        const rule = RRule.fromString(event.recurrenceRule);
        return rule.options.byweekday.map(d => {
          // RRule weekdays are objects {weekday: 0..6}, map back to 'MO', 'TU', etc.
          const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
          return days[d];
        });
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [recurrenceEnd, setRecurrenceEnd] = useState(() => {
    if (event?.recurrenceRule) {
      try {
        const rule = RRule.fromString(event.recurrenceRule);
        return rule.options.until ? rule.options.until.toISOString().split('T')[0] : '';
      } catch (e) {
        return '';
      }
    }
    return '';
  });

  const [newLink, setNewLink] = useState('');
  const [isLinkLoading, setIsLinkLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/events/${event.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', agenda.id] });
      onClose();
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Error al actualizar el evento';
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

  const handleDateChange = (name, date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, attachments: 'El archivo no puede superar los 5MB' }));
      return;
    }

    setIsUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await api.post('/uploads/file', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, response.data.file]
      }));
      setErrors(prev => ({ ...prev, attachments: null }));
    } catch (error) {
      console.error('Upload error:', error);
      setErrors(prev => ({ ...prev, attachments: 'Error al subir el archivo' }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!newLink) return;
    
    try {
      new URL(newLink); // Validate URL format
    } catch (e) {
      setErrors(prev => ({ ...prev, links: 'URL inválida' }));
      return;
    }

    setIsLinkLoading(true);
    try {
      const response = await api.get('/links/preview', { params: { url: newLink } });
      setFormData(prev => ({
        ...prev,
        links: [...prev.links, response.data]
      }));
      setNewLink('');
      setErrors(prev => ({ ...prev, links: null }));
    } catch (error) {
      console.error('Link preview error:', error);
      // Fallback if preview fails: just add the URL
      setFormData(prev => ({
        ...prev,
        links: [...prev.links, { url: newLink, title: newLink, description: '' }]
      }));
      setNewLink('');
    } finally {
      setIsLinkLoading(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const removeLink = (index) => {
    setFormData(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index)
    }));
  };

  const toggleRecurrenceDay = (day) => {
    setRecurrenceDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
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
    // Convert to ISO format and add agendaId
    let recurrenceRule = null;
    if (isRecurring && recurrenceDays.length > 0) {
      const rule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: recurrenceDays.map(d => RRule[d]),
        until: recurrenceEnd ? new Date(recurrenceEnd) : null
      });
      recurrenceRule = rule.toString();
    }

    const eventData = {
      ...formData,
      agendaId: agenda.id,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      isRecurring,
      recurrenceRule
    };

    if (event) {
      updateMutation.mutate(eventData);
    } else {
      createMutation.mutate(eventData);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{event ? t('editEventTitle', 'Editar Evento') : t('createEventTitle')}</h2>
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
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          {/* Time Range */}
          <div className="form-row">
            <div className="form-group">
              <CustomDatePicker
                label={`${t('startDateTimeLabel')} *`}
                selected={formData.startTime}
                onChange={(date) => handleDateChange('startTime', date)}
                showTimeSelect={!formData.isAllDay}
                timeIntervals={10}
                dateFormat={formData.isAllDay ? "d MMMM, yyyy" : "d MMMM, yyyy h:mm aa"}
                disabled={createMutation.isPending}
              />
              {errors.startTime && <span className="error-message">{errors.startTime}</span>}
            </div>

            <div className="form-group">
              <CustomDatePicker
                label={`${t('endDateTimeLabel')} *`}
                selected={formData.endTime}
                onChange={(date) => handleDateChange('endTime', date)}
                showTimeSelect={!formData.isAllDay}
                timeIntervals={10}
                dateFormat={formData.isAllDay ? "d MMMM, yyyy" : "d MMMM, yyyy h:mm aa"}
                disabled={createMutation.isPending}
              />
              {errors.endTime && <span className="error-message">{errors.endTime}</span>}
            </div>
          </div>

          {/* All Day */}
          <div className="form-group">
            <AnimatedCheckbox
              id="isAllDay"
              name="isAllDay"
              checked={formData.isAllDay}
              onChange={handleChange}
              label={t('allDayEventLabel')}
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </div>

          {/* Recurrence */}
          <div className="form-group">
            <AnimatedCheckbox
              id="isRecurring"
              name="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              label={t('recurringEventLabel')}
              disabled={createMutation.isPending || updateMutation.isPending}
            />
            
            {isRecurring && (
              <div className="recurrence-options">
                <label className="recurrence-label">{t('repeatDaysLabel')}</label>
                <div className="days-selector">
                  {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map(day => (
                    <button
                      key={day}
                      type="button"
                      className={`day-btn ${recurrenceDays.includes(day) ? 'active' : ''}`}
                      onClick={() => toggleRecurrenceDay(day)}
                    >
                      {day === 'MO' ? 'L' : day === 'TU' ? 'M' : day === 'WE' ? 'X' : day === 'TH' ? 'J' : day === 'FR' ? 'V' : day === 'SA' ? 'S' : 'D'}
                    </button>
                  ))}
                </div>
                
                <div className="form-group mt-2">
                  <label htmlFor="recurrenceEnd">{t('repeatUntilLabel')}</label>
                  <input
                    type="date"
                    id="recurrenceEnd"
                    value={recurrenceEnd}
                    onChange={(e) => setRecurrenceEnd(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            )}
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
              disabled={createMutation.isPending || updateMutation.isPending}
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
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </div>

          {/* Attachments */}
          <div className="form-group">
            <label>{t('attachmentsLabel')}</label>
            <div className="file-upload-container">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileUpload}
                className="file-input"
                disabled={isUploading || createMutation.isPending || updateMutation.isPending}
              />
              <label htmlFor="file-upload" className="btn btn-secondary btn-sm">
                {isUploading ? t('uploadingButton') : t('attachFileButton')}
              </label>
              {errors.attachments && <span className="error-message">{errors.attachments}</span>}
            </div>
            
            {formData.attachments.length > 0 && (
              <ul className="attachments-list">
                {formData.attachments.map((file, index) => (
                  <li key={index} className="attachment-item">
                    <span className="attachment-name">📄 {file.filename}</span>
                    <button type="button" onClick={() => removeAttachment(index)} className="btn-icon-sm">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Links */}
          <div className="form-group">
            <label>{t('linksLabel')}</label>
            <div className="link-input-container">
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="https://ejemplo.com"
                className="input"
                disabled={isLinkLoading || createMutation.isPending || updateMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink();
                  }
                }}
              />
              <button 
                type="button" 
                onClick={handleAddLink} 
                className="btn btn-secondary"
                disabled={!newLink || isLinkLoading}
              >
                {isLinkLoading ? '...' : t('addButton')}
              </button>
            </div>
            {errors.links && <span className="error-message">{errors.links}</span>}

            {formData.links.length > 0 && (
              <div className="links-list">
                {formData.links.map((link, index) => (
                  <div key={index} className="link-preview-card">
                    {link.imageUrl && <img src={link.imageUrl} alt="" className="link-image" />}
                    <div className="link-info">
                      <div className="link-title">{link.title || link.url}</div>
                      {link.description && <div className="link-desc">{link.description.substring(0, 50)}...</div>}
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-url">{link.url}</a>
                    </div>
                    <button type="button" onClick={() => removeLink(index)} className="btn-icon-sm remove-link">×</button>
                  </div>
                ))}
              </div>
            )}
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
                disabled={createMutation.isPending || updateMutation.isPending}
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
          <div className="form-group">
            <AnimatedCheckbox
              id="isPrivate"
              name="isPrivate"
              checked={formData.isPrivate}
              onChange={handleChange}
              label={t('privateEventLabel')}
              disabled={createMutation.isPending || updateMutation.isPending}
            />
          </div>

          {/* Color Picker */}
          <div className="form-group">
            <label>{t('colorLabel', 'Color')}</label>
            <div className="color-options-grid">
              {EVENT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch-btn ${formData.color === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  aria-label={color}
                  title={color}
                >
                  {formData.color === color && '✔'}
                </button>
              ))}
            </div>
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
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {t('cancelButton')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? t('saving', 'Guardando...') : (event ? t('saveChanges', 'Guardar Cambios') : t('createEventButton'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function to format date for datetime-local input
// Helper function to format date for datetime-local input
// function formatDateTimeLocal(date) {
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = String(d.getMonth() + 1).padStart(2, '0');
//   const day = String(d.getDate()).padStart(2, '0');
//   const hours = String(d.getHours()).padStart(2, '0');
//   const minutes = String(d.getMinutes()).padStart(2, '0');
//   return `${year}-${month}-${day}T${hours}:${minutes}`;
// }

export default CreateEventModal;
