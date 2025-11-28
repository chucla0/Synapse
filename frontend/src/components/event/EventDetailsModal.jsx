import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useDateFnsLocale } from '../../contexts/LocaleContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import './EventDetailsModal.css';

function EventDetailsModal({ event, agenda, onClose, onEdit, onDelete }) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const queryClient = useQueryClient();

  if (!event) return null;

  const formatDate = (date) => {
    return format(new Date(date), 'PPP p', { locale });
  };

  const approveMutation = useMutation({
    mutationFn: () => {
      console.log('Sending approve request for event:', event.id);
      return api.post(`/events/${event.id}/approve`);
    },
    onSuccess: () => {
      console.log('Approve success');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onClose();
    },
    onError: (error) => {
      console.error('Approve error:', error);
      alert(t('error_approving', 'Error al aprobar: ') + (error.response?.data?.message || error.message));
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (reason) => {
      console.log('Sending reject request for event:', event.id);
      return api.post(`/events/${event.id}/reject`, { reason });
    },
    onSuccess: () => {
      console.log('Reject success');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onClose();
    },
    onError: (error) => {
      console.error('Reject error:', error);
      alert(t('error_rejecting', 'Error al rechazar: ') + (error.response?.data?.message || error.message));
    }
  });

  const handleApprove = () => {
    console.log('Approve button clicked - Direct execution');
    approveMutation.mutate();
  };

  const handleReject = () => {
    console.log('Reject button clicked - Direct execution');
    // For now, hardcode reason to bypass window.prompt issue
    const reason = "Rechazado por el jefe (Razón no especificada)"; 
    rejectMutation.mutate(reason);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-details-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="event-details-header">
          <h2>{event.title}</h2>
          <div className="header-actions">
            {(() => {
              const canEditEvent = () => {
                if (!agenda) return false;
                const { userRole, type } = agenda;
                
                if (userRole === 'OWNER') return true;
                if (type === 'COLABORATIVA' && userRole === 'EDITOR') return true;
                if (type === 'LABORAL' && userRole === 'CHIEF') return true;
                if (type === 'EDUCATIVA' && userRole === 'PROFESSOR') return true;
                
                return false;
              };

              if (canEditEvent() && onEdit) {
                return (
                  <button className="btn-icon-edit" onClick={() => onEdit(event)} title={t('editButton')}>
                    ✏️
                  </button>
                );
              }
              return null;
            })()}
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="event-details-body">
          {event.status === 'PENDING_APPROVAL' && (
            <div className="alert alert-warning">
              {t('pendingApproval', 'Este evento está pendiente de aprobación')}
            </div>
          )}
          
          <div className="detail-row">
            <span className="detail-icon">📅</span>
            <div className="detail-content">
              <p><strong>{t('startDateTimeLabel')}:</strong> {formatDate(event.startTime)}</p>
              <p><strong>{t('endDateTimeLabel')}:</strong> {formatDate(event.endTime)}</p>
            </div>
          </div>

          <div className="detail-row">
            <span className="detail-icon">📍</span>
            <p className={!event.location ? 'text-muted italic' : ''}>
              {event.location || t('noLocation', 'Sin ubicación')}
            </p>
          </div>

          <div className="detail-row">
            <span className="detail-icon">📝</span>
            <p className={`event-description ${!event.description ? 'text-muted italic' : ''}`}>
              {event.description || t('noDescription', 'Sin descripción')}
            </p>
          </div>

          {/* Attachments */}
          <div className="event-section">
            <h3>{t('attachmentsLabel').split(' ')[0]}</h3>
            {event.attachments && event.attachments.length > 0 ? (
              <ul className="attachments-list">
                {event.attachments.map(att => (
                  <li key={att.id}>
                    <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${att.url}`} target="_blank" rel="noopener noreferrer">
                      📎 {att.filename}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted italic text-sm">{t('noAttachments', 'Sin archivos adjuntos')}</p>
            )}
          </div>

          {/* Links */}
          <div className="event-section">
            <h3>{t('linksLabel')}</h3>
            {event.links && event.links.length > 0 ? (
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
            ) : (
              <p className="text-muted italic text-sm">{t('noLinks', 'Sin enlaces')}</p>
            )}
          </div>
        </div>

        <div className="event-details-footer centered">
          {(() => {
            const canEditEvent = () => {
              if (!agenda) return false;
              const { userRole, type } = agenda;
              
              if (userRole === 'OWNER') return true;
              if (type === 'COLABORATIVA' && userRole === 'EDITOR') return true;
              if (type === 'LABORAL' && userRole === 'CHIEF') return true;
              if (type === 'EDUCATIVA' && userRole === 'PROFESSOR') return true;
              
              return false;
            };

            const canApprove = () => {
               if (!agenda || event.status !== 'PENDING_APPROVAL') return false;
               const { userRole, type } = agenda;
               // Only Owner or Chief can approve in Laboral agenda
               if (type === 'LABORAL' && (userRole === 'OWNER' || userRole === 'CHIEF')) return true;
               return false;
            };

            const canRequestChange = () => {
              if (!agenda) return false;
              const { userRole, type } = agenda;
              
              if (type === 'LABORAL' && userRole === 'EMPLOYEE') return true;
              return false;
            };

            if (canApprove()) {
              return (
                <div className="approval-actions">
                  <button 
                    className="btn btn-success" 
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending ? t('approving', 'Aprobando...') : t('approve', 'Aprobar')}
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                  >
                    {rejectMutation.isPending ? t('rejecting', 'Rechazando...') : t('reject', 'Rechazar')}
                  </button>
                </div>
              );
            }

            if (canEditEvent() && onDelete) {
              return (
                <button className="btn btn-danger" onClick={() => onDelete(event)}>
                  {t('deleteButton')}
                </button>
              );
            } else if (canRequestChange()) {
              return (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => alert('Función de solicitar cambios próximamente')}
                >
                  Solicitar Cambio
                </button>
              );
            }
            
            return null;
          })()}
        </div>
      </div>
    </div>
  );
}

export default EventDetailsModal;
