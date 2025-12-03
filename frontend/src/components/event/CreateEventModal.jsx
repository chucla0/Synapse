import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, FileText, Check } from 'lucide-react';
import api from '../../utils/api';
import { RRule } from 'rrule';
import AnimatedCheckbox from '../ui/AnimatedCheckbox';
import CustomDatePicker from '../ui/CustomDatePicker';
import { getUser } from '../../utils/auth';
import './CreateEventModal.css';



const EVENT_COLORS = [
  'var(--event-color-1)',
  'var(--event-color-2)',
  'var(--event-color-3)',
  'var(--event-color-4)',
  'var(--event-color-5)',
  'var(--event-color-6)',
  'var(--event-color-7)',
  'var(--event-color-8)',
  'var(--event-color-9)',
  'var(--event-color-10)',
  'var(--event-color-11)',
  'var(--event-color-12)',
];

const GOOGLE_EVENT_COLORS = [
  '#7986cb', // Lavender
  '#33b679', // Sage
  '#8e24aa', // Grape
  '#e67c73', // Flamingo
  '#f6bf26', // Banana
  '#f4511e', // Tangerine
  '#039be5', // Peacock
  '#616161', // Graphite
  '#3f51b5', // Blueberry
  '#0b8043', // Basil
  '#d50000', // Tomato
];

function CreateEventModal({ agenda, agendas = [], onClose, initialDate = null, event = null }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = getUser();

  // If agenda is 'all_events', default to the first real agenda, or the event's agenda if editing
  const [selectedAgendaId, setSelectedAgendaId] = useState(() => {
    if (event && event.agendaId) return event.agendaId;
    if (agenda.id !== 'all_events') return agenda.id;
    return agendas.length > 0 ? agendas[0].id : '';
  });

  const [formData, setFormData] = useState(() => {
    // Determine effective visibleToStudents default
    let initialVisibleToStudents = event?.visibleToStudents || false;

    // If editing an existing event in an Educativa agenda that is Public, 
    // it effectively IS visible to students, so check the box.
    if (event && !event.isPrivate) {
      const currentAgendaId = event.agendaId;
      const currentAgenda = agendas.find(a => a.id === currentAgendaId);
      if (currentAgenda?.type === 'EDUCATIVA') {
        initialVisibleToStudents = true;
      }
    }

    return {
      title: event?.title || '',
      description: event?.description || '',
      location: event?.location || '',
      startTime: event?.startTime ? new Date(event.startTime) : (initialDate ? new Date(initialDate) : new Date()),
      endTime: event?.endTime ? new Date(event.endTime) : (initialDate ? new Date(new Date(initialDate).getTime() + 3600000) : new Date(new Date().getTime() + 3600000)),
      isAllDay: event?.isAllDay || false,
      status: event?.status || 'CONFIRMED',
      color: event?.color || EVENT_COLORS[0],
      isPrivate: event?.isPrivate || false,
      visibleToStudents: initialVisibleToStudents,
      sharedWithUserIds: event?.sharedWithUsers?.map(u => u.id) || [],
      attachments: event?.attachments || [],
      links: event?.links || []
    };
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
      if (agenda.id === 'all_events') {
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['events', 'all_events'] });
      }
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
      if (agenda.id === 'all_events') {
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['events', 'all_events'] });
      }
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
    setFormData(prev => {
      const newData = { ...prev, [name]: date };

      // Auto-adjust end time if start time is moved after or equal to end time
      if (name === 'startTime' && date && prev.endTime) {
        if (date >= prev.endTime) {
          // Set end time to start time + 1 hour
          newData.endTime = new Date(date.getTime() + 60 * 60 * 1000);
        }
      }
      return newData;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    // Also clear endTime error if we might have fixed it by changing start time
    if (name === 'startTime' && errors.endTime) {
      setErrors(prev => ({ ...prev, endTime: null }));
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
    if (!selectedAgendaId) {
      newErrors.agenda = t('selectAgenda'); // "Seleccionar Agenda"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

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

    const currentAgenda = agendas.find(a => a.id === selectedAgendaId);
    const isEducativa = currentAgenda?.type === 'EDUCATIVA';

    const eventData = {
      ...formData,
      agendaId: selectedAgendaId,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      isRecurring,
      recurrenceRule,
      visibleToStudents: formData.visibleToStudents,
      sharedWithUserIds: formData.sharedWithUserIds,
      isPrivate: isEducativa ? true : formData.isPrivate // Force private for Educativa
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
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-body">
            {/* Agenda Selector (only if in All Events view and creating) */}
            {agenda.id === 'all_events' && !event && (
              <div className="form-group">
                <label htmlFor="agendaId">{t('selectAgenda')} *</label>
                <select
                  id="agendaId"
                  name="agendaId"
                  value={selectedAgendaId}
                  onChange={(e) => setSelectedAgendaId(e.target.value)}
                  className={`input ${errors.agenda ? 'error' : ''}`}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <option value="">{t('selectAgenda')}</option>
                  {agendas.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                {errors.agenda && <span className="error-message">{errors.agenda}</span>}
              </div>
            )}

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
                      <span className="attachment-name"><FileText size={16} /> {file.filename}</span>
                      <button type="button" onClick={() => removeAttachment(index)} className="btn-icon-sm"><X size={16} /></button>
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
                      <button type="button" onClick={() => removeLink(index)} className="btn-icon-sm remove-link"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>



            {/* Agenda Type Logic */}
            {(() => {
              const currentAgenda = agendas.find(a => a.id === selectedAgendaId);
              const isEducativa = currentAgenda?.type === 'EDUCATIVA';
              const isLaboral = currentAgenda?.type === 'LABORAL';
              const isPersonal = currentAgenda?.type === 'PERSONAL';

              if (isEducativa) {
                return (
                  <div className="form-group">
                    <AnimatedCheckbox
                      id="visibleToStudents"
                      name="visibleToStudents"
                      checked={formData.visibleToStudents}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        visibleToStudents: e.target.checked,
                        isPrivate: true // Always private for Educativa in this simplified mode
                      }))}
                      label={t('visibleToStudentsLabel', 'Visible para estudiantes')}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    />
                  </div>
                );
              }

              if (isPersonal) {
                return null;
              }

              const canEditVisibility = !event || (event.creatorId === user?.id) || (currentAgenda?.ownerId === user?.id);

              return (
                <>
                  {/* Private (Standard) */}
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

                  {/* Visibility Options (only if Private) */}
                  {formData.isPrivate && selectedAgendaId && (
                    <div className="visibility-options-container">
                      <div className="visibility-controls">
                        <div className="form-group">
                          <label>
                            {t('shareWithSpecificUsers', 'Compartir con usuarios específicos')}
                            {!canEditVisibility && <span className="text-xs text-muted ml-2">({t('onlyCreatorCanEdit', 'Solo el creador puede editar esto')})</span>}
                          </label>
                          <div className="users-select-list">
                            {currentAgenda?.agendaUsers?.filter(au => {
                              // Always exclude self (creator)
                              if (au.user.id === (event?.creatorId || user?.id)) return false;

                              // Always exclude Owner (they always see everything)
                              if (au.user.id === currentAgenda.ownerId) return false;

                              // Laboral: Exclude CHIEF (they always see everything)
                              if (isLaboral && au.role === 'CHIEF') return false;

                              // Laboral: Only show EMPLOYEE
                              if (isLaboral && au.role !== 'EMPLOYEE') return false;

                              // Colaborativa: Show everyone (except owner/self handled above)

                              return true;
                            }).map(au => {
                              const isSelected = formData.sharedWithUserIds.includes(au.user.id);
                              return (
                                <div
                                  key={au.user.id}
                                  className={`user-select-item ${isSelected ? 'selected' : ''} ${!canEditVisibility ? 'disabled' : ''}`}
                                  onClick={(e) => {
                                    if (!canEditVisibility) return;
                                    // Toggle selection on div click
                                    if (isSelected) {
                                      setFormData(prev => ({ ...prev, sharedWithUserIds: prev.sharedWithUserIds.filter(id => id !== au.user.id) }));
                                    } else {
                                      setFormData(prev => ({ ...prev, sharedWithUserIds: [...prev.sharedWithUserIds, au.user.id] }));
                                    }
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    id={`share-${au.user.id}`}
                                    checked={isSelected}
                                    onChange={() => { }} // Handled by div click
                                    disabled={!canEditVisibility || createMutation.isPending || updateMutation.isPending}
                                    style={{ pointerEvents: 'none' }} // Let click pass to div
                                  />
                                  <div className="user-select-label">
                                    {au.user.avatar ? (
                                      <img src={au.user.avatar} alt="" className="user-avatar-xs" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="user-avatar-placeholder-xs">{au.user.name.charAt(0)}</span>
                                    )}
                                    <div className="user-info-select">
                                      <span className="user-name-select">{au.user.name}</span>
                                      <span className="user-role-select text-xs text-muted">({t(`roles.${au.role}`, au.role)})</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {(!currentAgenda?.agendaUsers || currentAgenda.agendaUsers.filter(au => {
                              if (au.user.id === (event?.creatorId || user?.id)) return false;
                              if (au.user.id === currentAgenda.ownerId) return false;
                              if (isLaboral && au.role === 'CHIEF') return false;
                              if (isLaboral && au.role !== 'EMPLOYEE') return false;
                              return true;
                            }).length === 0) && (
                                <p className="text-sm text-muted italic">{t('noOtherUsers', 'No hay usuarios disponibles para compartir')}</p>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Color Picker */}
            <div className="form-group">
              <label>{t('colorLabel', 'Color')}</label>
              <div className="color-picker">
                {(agenda.googleCalendarId ? GOOGLE_EVENT_COLORS : EVENT_COLORS).map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-option ${formData.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
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
          </div>
          <div className="modal-actions">

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
