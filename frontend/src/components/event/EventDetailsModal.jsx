import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, X, Calendar, MapPin, AlignLeft, User, Lock, Paperclip, Link as LinkIcon } from 'lucide-react';
import api from '../../utils/api';
import { getUser } from '../../utils/auth';
import UserProfileModal from '../user/UserProfileModal';
import './EventDetailsModal.css';

function EventDetailsModal({ event, agenda, agendas = [], onClose, onEdit, onDelete }) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const queryClient = useQueryClient();
  const currentUser = getUser();
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  if (!event) return null;

  // If we are in 'all_events' view, find the real agenda for this event to check permissions
  const realAgenda = agenda?.id === 'all_events'
    ? agendas.find(a => a.id === event.agendaId)
    : agenda;

  const formatDate = (date) => {
    return format(new Date(date), 'PPP p', { locale });
  };

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/events/${event.id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onClose();
    },
    onError: (error) => {
      alert(t('error_approving', 'Error al aprobar: ') + (error.response?.data?.message || error.message));
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (reason) => api.post(`/events/${event.id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onClose();
    },
    onError: (error) => {
      alert(t('error_rejecting', 'Error al rechazar: ') + (error.response?.data?.message || error.message));
    }
  });

  const handleApprove = () => approveMutation.mutate();
  const handleReject = () => {
    const reason = "Rechazado por el jefe (Razón no especificada)";
    rejectMutation.mutate(reason);
  };

  const canEditEvent = () => {
    if (!realAgenda) return false;
    const { userRole, type } = realAgenda;
    const isCreator = event.creator?.id === currentUser?.id;

    if (userRole === 'OWNER') return true;

    if (type === 'COLABORATIVA') {
      if (userRole === 'EDITOR' && isCreator) return true;
      return false;
    }

    if (type === 'LABORAL') {
      if (userRole === 'CHIEF') return true;
      if (userRole === 'EMPLOYEE' && isCreator && event.status === 'PENDING_APPROVAL') return true;
      return false;
    }

    if (type === 'EDUCATIVA') {
      if (userRole === 'PROFESSOR' || userRole === 'TEACHER') return true;
      return false;
    }

    return false;
  };

  const canApprove = () => {
    if (!realAgenda || event.status !== 'PENDING_APPROVAL') return false;
    const { userRole, type } = realAgenda;
    if (type === 'LABORAL' && (userRole === 'OWNER' || userRole === 'CHIEF')) return true;
    return false;
  };

  const canDelete = () => {
    if (!onDelete) return false;
    if (!realAgenda) return false;
    const { userRole, type } = realAgenda;
    const isCreator = event.creator?.id === currentUser?.id;

    if (userRole === 'OWNER') return true;

    if (type === 'COLABORATIVA') {
      if (userRole === 'EDITOR' && isCreator) return true;
      return false;
    }

    if (type === 'LABORAL') {
      if (userRole === 'CHIEF') return true;
      if (userRole === 'EMPLOYEE' && isCreator && event.status === 'PENDING_APPROVAL') return true;
      return false;
    }

    if (type === 'EDUCATIVA') {
      if (userRole === 'PROFESSOR' || userRole === 'TEACHER') return true;
      return false;
    }

    return false;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-details-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-container">
            <h1>{event.title}</h1>
            {event.status === 'PENDING_APPROVAL' && (
              <span className="status-badge status-pending_approval">{t('pendingApproval', 'Pendiente')}</span>
            )}
            {event.status === 'CONFIRMED' && realAgenda?.type === 'LABORAL' && (
              <span className="status-badge status-confirmed">{t('confirmed', 'Confirmado')}</span>
            )}
          </div>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="event-details-body">
          {/* Time */}
          <div className="detail-group">
            <label className="detail-label"><Calendar size={14} /> {t('event_time_label', 'Fecha y Hora')}</label>
            <div className="detail-value">
              {formatDate(event.startTime)} - {formatDate(event.endTime)}
            </div>
          </div>

          {/* Location */}
          <div className="detail-group">
            <label className="detail-label"><MapPin size={14} /> {t('event_location_label', 'Ubicación')}</label>
            <div className="detail-value">{event.location || t('noLocation', 'Sin ubicación')}</div>
          </div>

          {/* Description */}
          <div className="detail-group">
            <label className="detail-label"><AlignLeft size={14} /> {t('event_description_label', 'Descripción')}</label>
            <div className="detail-value description-text">{event.description || t('noDescription', 'Sin descripción')}</div>
          </div>

          {/* Creator */}
          <div className="detail-group">
            <label className="detail-label"><User size={14} /> {t('createdBy', 'Creado por')}</label>
            <div
              className="detail-value user-info-clean clickable"
              onClick={() => setSelectedUserProfile(event.creator)}
              style={{ cursor: 'pointer' }}
            >
              {event.creator?.avatar ? (
                <img
                  src={event.creator.avatar.startsWith('http') ? event.creator.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${event.creator.avatar}`}
                  alt={event.creator.name}
                  className="user-avatar-small"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="user-avatar-placeholder-small">
                  {event.creator?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="user-name">{event.creator?.name || t('unknownUser', 'Usuario desconocido')}</span>
            </div>
          </div>

          {/* Visibility */}
          {event.isPrivate && (
            <div className="detail-group">
              <label className="detail-label"><Lock size={14} /> {t('visibility', 'Visibilidad')}</label>
              <div className="detail-value visibility-info">
                {event.visibleToStudents && (
                  <span className="badge badge-info">{t('visibleToStudents', 'Visible para estudiantes')}</span>
                )}
                {event.sharedWithUsers && event.sharedWithUsers.length > 0 && (
                  <div className="shared-users-list">
                    <p className="text-xs text-muted mb-1">{t('sharedWith', 'Compartido con')}:</p>
                    <div className="shared-users-clean-list">
                      {event.sharedWithUsers.map(user => (
                        <div
                          key={user.id}
                          className="user-info-clean clickable"
                          onClick={() => setSelectedUserProfile(user)}
                          style={{ cursor: 'pointer' }}
                        >
                          {user.avatar ? (
                            <img
                              src={user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.avatar}`}
                              alt={user.name}
                              className="user-avatar-small"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="user-avatar-placeholder-small">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="user-name">{user.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!event.visibleToStudents && (!event.sharedWithUsers || event.sharedWithUsers.length === 0) && (
                  <span className="text-sm italic">{t('onlyMe', 'Solo yo')}</span>
                )}
              </div>
            </div>
          )}

          {/* Attachments */}
          {event.attachments && event.attachments.length > 0 && (
            <div className="detail-group">
              <label className="detail-label"><Paperclip size={14} /> {t('attachments', 'Adjuntos')}</label>
              <ul className="attachments-list">
                {event.attachments.map(att => (
                  <li key={att.id}>
                    <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${att.url}`} target="_blank" rel="noopener noreferrer">
                      {att.filename}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Links */}
          {event.links && event.links.length > 0 && (
            <div className="detail-group">
              <label className="detail-label"><LinkIcon size={14} /> {t('links', 'Enlaces')}</label>
              <div className="links-list">
                {event.links.map(link => (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="link-preview">
                    {link.imageUrl && <img src={link.imageUrl} alt="" />}
                    <div className="link-info">
                      <strong>{link.title || link.url}</strong>
                      {link.description && <p>{link.description}</p>}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          {canDelete() && (
            <button className="btn btn-danger btn-left" onClick={() => onDelete(event)}>
              {t('deleteButton')}
            </button>
          )}

          <div className="actions-right">
            {canApprove() ? (
              <>
                <button
                  className="btn btn-danger"
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? t('rejecting', 'Rechazando...') : t('reject', 'Rechazar')}
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? t('approving', 'Aprobando...') : t('approve', 'Aprobar')}
                </button>
              </>
            ) : (
              <>
                {canEditEvent() && onEdit && (
                  <button className="btn btn-primary" onClick={() => onEdit(event)}>
                    {t('editButton')}
                  </button>
                )}
                <button className="btn btn-secondary" onClick={onClose}>
                  {t('close', 'Cerrar')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedUserProfile && (
        <UserProfileModal
          isOpen={!!selectedUserProfile}
          onClose={() => setSelectedUserProfile(null)}
          user={selectedUserProfile}
        />
      )}
    </div>
  );
}

export default EventDetailsModal;
