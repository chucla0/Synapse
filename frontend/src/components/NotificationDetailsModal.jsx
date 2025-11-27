import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api, { acceptInvitation, declineInvitation } from '../utils/api';
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
    console.log('Rendering content. isLoading:', isLoading, 'Details:', details);

    if (isLoading) return <p>{t('loading', 'Cargando...')}</p>;
    if (!details) return <p>{t('error_fetching_details', 'Error al cargar los detalles.')}</p>;

    const { sender, agenda, event, type, data } = details;
    console.log('Destructured details:', { sender, agenda, event, type, data });


    if (!sender) return null; // Add this check

    return (
      <div className="notification-details-content">
        <div className="notification-main-info">
          <div className="user-avatar">
            {sender.avatar ? (
              <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${sender.avatar}`} alt={sender.name} />
            ) : (
              <div className="user-avatar-initials">{sender.name?.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <p>
            <strong>{sender.name}</strong> {t(`notification_type_${type}`)} {event && <strong>{event.title}</strong>} {t('in_agenda', 'en la agenda')} <strong>{agenda.name}</strong>.
          </p>
        </div>

        {type === 'AGENDA_INVITE' && agenda && (
          <div className="form-group">
            <h4>{t('agenda_details', 'Detalles de la Agenda')}</h4>
            <p>{agenda.description}</p>
            <h5>{t('members', 'Miembros')}</h5>
            <ul>
              <li>{agenda.owner.name} ({t('owner', 'Propietario')})</li>
              {agenda.agendaUsers.map(member => (
                <li key={member.user.id}>{member.user.name}</li>
              ))}
            </ul>
          </div>
        )}
        
        {(type === 'EVENT_CREATED' || type === 'EVENT_UPDATED' || type === 'EVENT_APPROVED' || type === 'EVENT_REJECTED') && event && (
          <div className="form-group">
            <h4>{t('event_details', 'Detalles del Evento')}</h4>
            <p>{event.description}</p>
            {event.attachments?.length > 0 && (
              <>
                <h5>{t('attachments', 'Adjuntos')}</h5>
                <ul>
                  {event.attachments.map(file => <li key={file.id}>📄 {file.filename}</li>)}
                </ul>
              </>
            )}
            {event.links?.length > 0 && (
              <>
                <h5>{t('links', 'Enlaces')}</h5>
                <ul>
                  {event.links.map(link => <li key={link.id}>🔗 <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title || link.url}</a></li>)}
                </ul>
              </>
            )}
          </div>
        )}

        {(type === 'EVENT_APPROVED' || type === 'EVENT_REJECTED') && data && (
          <div className="form-group">
            <p>{data.message}</p>
            {data.reason && <p><strong>{t('reason', 'Razón')}:</strong> {data.reason}</p>}
          </div>
        )}

        {type === 'EVENT_DELETED' && data && (
          <div className="form-group">
            <p>{t('event_deleted_message', 'El evento "{{title}}" ha sido eliminado de la agenda "{{agenda}}".', { title: data.eventTitle, agenda: data.agendaName })}</p>
          </div>
        )}

        {type === 'AGENDA_DELETED' && data && (
          <div className="form-group">
            <p>{t('agenda_deleted_message', 'La agenda "{{name}}" ha sido eliminada.', { name: data.agendaName })}</p>
          </div>
        )}

        {type === 'ROLE_CHANGED' && data && (
          <div className="form-group">
            <p>{t('your_new_role_is', 'Tu nuevo rol es')} <strong>{data.newRole}</strong>.</p>
          </div>
        )}
        
        {type === 'AGENDA_INVITE' && (
           <div className="modal-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              {acceptMutation.isPending ? t('accepting', 'Aceptando...') : t('accept', 'Aceptar')}
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => declineMutation.mutate()}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              {declineMutation.isPending ? t('declining', 'Rechazando...') : t('decline', 'Rechazar')}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('notificationDetailsTitle', 'Detalles de la Notificación')}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default NotificationDetailsModal;
