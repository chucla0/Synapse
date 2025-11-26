import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import './CreateEventModal.css';

const EVENT_STATUS_OPTIONS = [
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'PENDING_APPROVAL', label: 'Pendiente de Aprobación' }
];

function CreateEventModal({ agenda, onClose, initialDate = null }) {
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
      const response = await api.post(`/agendas/${agenda.id}/events`, data);
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
      newErrors.title = 'El título es requerido';
    }
    if (!formData.startTime) {
      newErrors.startTime = 'La fecha de inicio es requerida';
    }
    if (!formData.endTime) {
      newErrors.endTime = 'La fecha de fin es requerida';
    }
    if (formData.startTime && formData.endTime && new Date(formData.startTime) >= new Date(formData.endTime)) {
      newErrors.endTime = 'La fecha de fin debe ser posterior a la de inicio';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Convert to ISO format
    const eventData = {
      ...formData,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString()
    };

    createMutation.mutate(eventData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nuevo Evento</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">Título *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Reunión, Tarea, etc."
              className={errors.title ? 'error' : ''}
              disabled={createMutation.isPending}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          {/* Time Range */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Fecha y Hora de Inicio *</label>
              <input
                type="datetime-local"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className={errors.startTime ? 'error' : ''}
                disabled={createMutation.isPending || formData.isAllDay}
              />
              {errors.startTime && <span className="error-message">{errors.startTime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endTime">Fecha y Hora de Fin *</label>
              <input
                type="datetime-local"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className={errors.endTime ? 'error' : ''}
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
              <span>Evento de todo el día</span>
            </label>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detalles del evento..."
              rows="3"
              disabled={createMutation.isPending}
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label htmlFor="location">Ubicación</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Sala de conferencias, URL, etc."
              disabled={createMutation.isPending}
            />
          </div>

          {/* Status (for LABORAL agendas) */}
          {agenda.type === 'LABORAL' && (
            <div className="form-group">
              <label htmlFor="status">Estado</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
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
              <span>Evento privado</span>
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
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creando...' : 'Crear Evento'}
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
