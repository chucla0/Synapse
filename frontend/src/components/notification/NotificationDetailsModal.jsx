import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { X, User, AlignLeft, Users, Clock, MapPin, Calendar, Paperclip, Link as LinkIcon } from 'lucide-react';
import api, { acceptInvitation, declineInvitation, approveEvent, rejectEvent } from '../../utils/api';
import UserProfileModal from '../user/UserProfileModal';
import './NotificationDetailsModal.css';

function NotificationDetailsModal({ notification, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

  const { data: details, isLoading } = useQuery({
    queryKey: ['notification', notification?.id],
    queryFn: async () => {
      if (!notification?.id) return null;
      const response = await api.get(`/notifications/${notification.id}`);
      return response.data.notification;
    },
    enabled: !!notification?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (notification?.id) {
        await api.post(`/notifications/${notification.id}/read`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvitation(notification.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onClose();
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => declineInvitation(notification.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onClose();
    },
  });

  const approveEventMutation = useMutation({
    mutationFn: () => approveEvent(details?.event?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onClose();
    },
  });

  const rejectEventMutation = useMutation({
    mutationFn: () => rejectEvent(details?.event?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onClose();
    },
  });

  useEffect(() => {
    if (notification && !notification.isRead) {
      markAsReadMutation.mutate();
    }
  }, [notification, markAsReadMutation]);

  const renderContent = () => {
    if (isLoading) return <p className="p-4">{t('loading', 'Cargando...')}</p>;
    if (!details) return <p className="p-4">{t('error_fetching_details', 'Error al cargar los detalles.')}</p>;

    const { sender, agenda, event, type, data } = details;

    if (!sender) return null;

    return (
      <div className="notification-details-body">
        {/* Header Section: Avatar + Message */}
        <div className="notification-header-section">
          <div
            className="user-avatar-large clickable"
            onClick={() => setSelectedUserProfile(sender)}
            style={{ cursor: 'pointer' }}
          >
            {sender.avatar ? (
              <img src={sender.avatar.startsWith('http') ? sender.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${sender.avatar}`} alt={sender.name} referrerPolicy="no-referrer" />
            ) : (
              <div className="user-avatar-initials">{sender.name?.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="notification-message">
            <p>
              <strong
                onClick={() => setSelectedUserProfile(sender)}
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
              >
                {sender.name}
              </strong> {t(`notification_type_${type}`)} {event && <strong>{event.title}</strong>} {t('in_agenda', 'en la agenda')} <strong>{agenda?.name}</strong>.
            </p>
          </div>
        </div>

        <div className="notification-content-section">
          {/* Agenda Details */}
          {agenda && (
            <div className="detail-section">
              <h3 className="section-title">{t('agendaDetails', 'Detalles de la Agenda')}</h3>

              <div className="detail-group">
                <label className="detail-label"><User size={14} /> {t('agenda_owner_label', 'Propietario')}</label>
                <div
                  className="detail-value clickable"
                  onClick={() => setSelectedUserProfile(agenda.owner)}
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {agenda.owner.name}
                </div>
              </div>

              {type === 'AGENDA_INVITE' && (
                <div className="detail-group">
                  <label className="detail-label"><Users size={14} /> {t('members', 'Miembros')}</label>
                  <ul className="simple-list">
                    <li
                      onClick={() => setSelectedUserProfile(agenda.owner)}
                      style={{ cursor: 'pointer' }}
                    >
                      {agenda.owner.name} <span className="text-muted">({t('owner', 'Propietario')})</span>
                    </li>
                    {agenda.agendaUsers?.map(member => (
                      <li
                        key={member.user.id}
                        onClick={() => setSelectedUserProfile(member.user)}
                        style={{ cursor: 'pointer' }}
                      >
                        {member.user.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Event Details */}
          {event && (
            <div className="detail-section">
              <h3 className="section-title">{t('eventDetails', 'Detalles del Evento')}</h3>
              <div className="detail-group">
                <label className="detail-label"><Calendar size={14} /> {t('event_title', 'Título')}</label>
                <div className="detail-value">{event.title}</div>
              </div>
              {event.description && (
                <div className="detail-group">
                  <label className="detail-label"><AlignLeft size={14} /> {t('description', 'Descripción')}</label>
                  <div className="detail-value">{event.description}</div>
                </div>
              )}
              <div className="detail-group">
                <label className="detail-label"><Clock size={14} /> {t('date_time', 'Fecha y Hora')}</label>
                <div className="detail-value">
                  {new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleString()}
                </div>
              </div>
              {event.location && (
                <div className="detail-group">
                  <label className="detail-label"><MapPin size={14} /> {t('location', 'Ubicación')}</label>
                  <div className="detail-value">{event.location}</div>
                </div>
              )}

              {/* Attachments & Links */}
              {(event.attachments?.length > 0 || event.links?.length > 0) && (
                <div className="detail-group">
                  <label className="detail-label"><Paperclip size={14} /> {t('resources', 'Recursos')}</label>
                  <ul className="simple-list">
                    {event.attachments?.map(att => (
                      <li key={att.id}>
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="resource-link">
                          <Paperclip size={12} /> {att.name}
                        </a>
                      </li>
                    ))}
                    {event.links?.map(link => (
                      <li key={link.id}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="resource-link">
                          <LinkIcon size={12} /> {link.title || link.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content notification-details-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('notificationDetailsTitle', 'Detalles de la Notificación')}</h2>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
        </div>

        {renderContent()}

        <div className="modal-actions">
          {details?.type === 'AGENDA_INVITE' ? (
            <>
              <button
                className="btn btn-danger"
                onClick={() => declineMutation.mutate()}
                disabled={acceptMutation.isPending || declineMutation.isPending}
              >
                {declineMutation.isPending ? t('declining', 'Rechazando...') : t('decline', 'Rechazar')}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending || declineMutation.isPending}
              >
                {acceptMutation.isPending ? t('accepting', 'Aceptando...') : t('accept', 'Aceptar')}
              </button>
            </>
          ) : details?.type === 'EVENT_PENDING_APPROVAL' ? (
            <>
              <button
                className="btn btn-danger"
                onClick={() => rejectEventMutation.mutate()}
                disabled={approveEventMutation.isPending || rejectEventMutation.isPending}
              >
                {rejectEventMutation.isPending ? t('rejecting', 'Rechazando...') : t('reject', 'Rechazar')}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => approveEventMutation.mutate()}
                disabled={approveEventMutation.isPending || rejectEventMutation.isPending}
              >
                {approveEventMutation.isPending ? t('approving', 'Aprobando...') : t('approve', 'Aprobar')}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={onClose}>
              {t('close', 'Cerrar')}
            </button>
          )}
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

export default NotificationDetailsModal;
