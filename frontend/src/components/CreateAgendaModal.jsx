import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import './CreateAgendaModal.css';

const AGENDA_TYPES = [
  { value: 'PERSONAL', label: 'Personal', description: 'Agenda personal privada' },
  { value: 'EDUCATIVA', label: 'Educativa', description: 'Para profesores y estudiantes' },
  { value: 'LABORAL', label: 'Laboral', description: 'Para equipos de trabajo' }
];

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

function CreateAgendaModal({ onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'PERSONAL',
    color: PRESET_COLORS[0],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  });
  const [errors, setErrors] = useState({});

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
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleColorSelect = (color) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crear Nueva Agenda</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="agenda-form">
          {/* Name */}
          <div className="form-group">
            <label htmlFor="name">Nombre *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Mi Agenda"
              className={errors.name ? 'error' : ''}
              disabled={createMutation.isPending}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe tu agenda..."
              rows="3"
              disabled={createMutation.isPending}
            />
          </div>

          {/* Type */}
          <div className="form-group">
            <label htmlFor="type">Tipo de Agenda</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={createMutation.isPending}
            >
              {AGENDA_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Color Picker */}
          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  disabled={createMutation.isPending}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

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
              {createMutation.isPending ? 'Creando...' : 'Crear Agenda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateAgendaModal;
