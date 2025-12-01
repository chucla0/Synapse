import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { X, User, AlignLeft, Users, Clock, MapPin, Calendar, Paperclip, Link as LinkIcon } from 'lucide-react';
import api, { acceptInvitation, declineInvitation } from '../../utils/api';
import './NotificationDetailsModal.css';

function NotificationDetailsModal({ notification, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: details, isLoading } = useQuery({
    queryKey: ['notificationDetails', notification.id],
    queryFn: async () => {
      const response = await api.get(`/notifications/${notification.id}`);
      return response.data.notification;
    },
    enabled: !!notification,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => api.post(`/notifications/${notification.id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvitation(notification.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
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
          <div className="user-avatar-large">
            {sender.avatar ? (
              <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${sender.avatar}`} alt={sender.name} referrerPolicy="no-referrer" />
            ) : (
              <div className="user-avatar-initials">{sender.name?.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="notification-message">
            <p>
              <strong>{sender.name}</strong> {t(`notification_type_${type}`)} {event && <strong>{event.title}</strong>} {t('in_agenda', 'en la agenda')} <strong>{agenda?.name}</strong>.
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
                <div className="detail-value">{agenda.owner.name}</div>
              </div>

              <div className="detail-group">
                <label className="detail-label"><AlignLeft size={14} /> {t('agenda_description_label', 'Descripción')}</label>
                <div className="detail-value description-text">{agenda.description || t('noDescription', 'Sin descripción')}</div>
              </div>

              {type === 'AGENDA_INVITE' && (
                <div className="detail-group">
                  <label className="detail-label"><Users size={14} /> {t('members', 'Miembros')}</label>
                  <ul className="simple-list">
                    <li>{agenda.owner.name} <span className="text-muted">({t('owner', 'Propietario')})</span></li>
                    {agenda.agendaUsers?.map(member => (
                      <li key={member.user.id}>{member.user.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Event Details */}
          {event && (
            <div className="detail-section">
              <h3 className="section-title">{t('event_details', 'Detalles del Evento')}</h3>

              <div className="detail-group">
                <label className="detail-label"><Clock size={14} /> {t('event_time_label', 'Hora')}</label>
                <div className="detail-value">
                  {new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleString()}
                </div>
              </div>

              <div className="detail-group">
                <label className="detail-label"><MapPin size={14} /> {t('event_location_label', 'Ubicación')}</label>
                <div className="detail-value">{event.location || t('noLocation', 'Sin ubicación')}</div>
              </div>

              <div className="detail-group">
                <label className="detail-label"><AlignLeft size={14} /> {t('event_description_label', 'Descripción')}</label>
                <div className="detail-value description-text">{event.description || t('noDescription', 'Sin descripción')}</div>
              </div>

              {event.attachments?.length > 0 && (
                <div className="detail-group">
                  <label className="detail-label"><Paperclip size={14} /> {t('attachments', 'Adjuntos')}</label>
                  <ul className="simple-list">
                    {event.attachments.map(file => <li key={file.id}>{file.filename}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Other Types */}
          {type === 'EVENT_REJECTED' && data && data.reason && (
            <div className="detail-group warning-bg">
              <label className="detail-label">{t('reason', 'Razón')}</label>
              <div className="detail-value">{data.reason}</div>
            </div>
          )}

          {type === 'ROLE_CHANGED' && data && (
            <div className="detail-group">
              <label className="detail-label">{t('new_role', 'Nuevo Rol')}</label>
              <div className="detail-value">
                <strong>{data.newRole}</strong>
                <p className="text-sm text-muted mt-1">
                  {t(`role_${data.newRole}_description`, 'Descripción del rol no disponible.')}
                </p>
              </div>
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
          ) : (
            <button className="btn btn-secondary" onClick={onClose}>
              {t('close', 'Cerrar')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationDetailsModal;
