import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { hexToRgba } from '../../utils/colors';
import api from '../../utils/api';
import NotificationDetailsModal from '../../components/notification/NotificationDetailsModal';
import './Home.css';

function Home({ notifications, agendas = [], isLoading, refetch }) {
  const { t } = useTranslation();
  const { accentColor } = useTheme();
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Filter states
  const [filterType, setFilterType] = useState('all'); // 'all', 'unread', 'invites'
  const [selectedAgendaId, setSelectedAgendaId] = useState('all');

  const [showAgendaDropdown, setShowAgendaDropdown] = useState(false);

  const queryClient = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      refetch();
    },
  });

  const markAsUnreadMutation = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/unread`),
    onSuccess: () => {
      refetch();
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      refetch();
    },
  });

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleAction = (e, action, notification) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (action === 'read') {
      markAsReadMutation.mutate(notification.id);
    } else if (action === 'unread') {
      markAsUnreadMutation.mutate(notification.id);
    } else if (action === 'delete') {
      deleteNotificationMutation.mutate(notification.id);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeMenuId) setActiveMenuId(null);
      if (showAgendaDropdown) setShowAgendaDropdown(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeMenuId, showAgendaDropdown]);

  // Filter logic
  const filteredNotifications = notifications.filter(n => {
    // Type filter
    if (filterType === 'unread' && n.isRead) return false;
    if (filterType === 'unread' && n.isRead) return false;
    if (filterType === 'invites' && n.type !== 'AGENDA_INVITE') return false;
    if (filterType === 'approvals' && !['EVENT_PENDING_APPROVAL', 'EVENT_APPROVED', 'EVENT_REJECTED'].includes(n.type)) return false;

    // Agenda filter
    if (selectedAgendaId !== 'all' && n.agenda?.id !== selectedAgendaId) return false;

    return true;
  });

  const selectedAgendaName = selectedAgendaId === 'all'
    ? t('filterByAgenda')
    : agendas.find(a => a.id === selectedAgendaId)?.name || t('filterByAgenda');

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>{t('homeTitle')}</h1>
      </header>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="filter-pills">
          <button
            className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            {t('filterAll')}
          </button>
          <button
            className={`filter-pill ${filterType === 'unread' ? 'active' : ''}`}
            onClick={() => setFilterType('unread')}
          >
            {t('filterUnread')}
          </button>
          <button
            className={`filter-pill ${filterType === 'invites' ? 'active' : ''}`}
            onClick={() => setFilterType('invites')}
          >
            {t('filterInvites')}
          </button>
          <button
            className={`filter-pill ${filterType === 'approvals' ? 'active' : ''}`}
            onClick={() => setFilterType('approvals')}
          >
            {t('filterApprovals')}
          </button>
        </div>

        <div className="agenda-filter">
          <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="dropdown-toggle"
              onClick={() => setShowAgendaDropdown(!showAgendaDropdown)}
              style={selectedAgendaId !== 'all' ? {
                backgroundColor: accentColor,
                color: '#333333',
                borderColor: accentColor,
                fontWeight: 600
              } : {}}
            >
              {selectedAgendaName}
              <span
                className="dropdown-arrow"
                style={selectedAgendaId !== 'all' ? { color: '#333333' } : {}}
              >
                ▼
              </span>
            </button>
            {showAgendaDropdown && (
              <ul className="dropdown-menu">
                <li
                  className={`dropdown-item ${selectedAgendaId === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedAgendaId('all');
                    setShowAgendaDropdown(false);
                  }}
                >
                  {t('filterByAgenda')}
                </li>
                {agendas.map(agenda => (
                  <li
                    key={agenda.id}
                    className={`dropdown-item ${selectedAgendaId === agenda.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedAgendaId(agenda.id);
                      setShowAgendaDropdown(false);
                    }}
                    style={selectedAgendaId === agenda.id ? { backgroundColor: accentColor, color: 'white' } : {}}
                  >
                    {agenda.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="notifications-section">
        {isLoading ? (
          <p>{t('loading')}</p>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <p>{notifications.length === 0 ? t('noNotifications') : t('noAgendasFound') /* Reusing string for empty filter result */}</p>
            {(filterType !== 'all' || selectedAgendaId !== 'all') && (
              <button
                className="btn-link"
                onClick={() => { setFilterType('all'); setSelectedAgendaId('all'); }}
              >
                {t('clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-card ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
                style={{ '--hover-color': `${accentColor}15` }}
              >
                <div className="notification-content">
                  <div className="notification-avatar">
                    {notification.sender?.avatar ? (
                      <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${notification.sender.avatar}`} alt={notification.sender.name} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="avatar-initials" style={{ backgroundColor: accentColor }}>
                        {notification.sender?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="notification-text">
                    <p className="notification-message">
                      <strong>{notification.sender?.name}</strong> {t(`notification_type_${notification.type}`)} <strong>{notification.agenda?.name}</strong>
                    </p>
                    <span className="notification-time">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="notification-actions">
                  {!notification.isRead && (
                    <span className="unread-dot" style={{ backgroundColor: accentColor }}></span>
                  )}

                  <div className="menu-container">
                    <button
                      className="menu-trigger"
                      onClick={(e) => toggleMenu(e, notification.id)}
                    >
                      ⋮
                    </button>
                    {activeMenuId === notification.id && (
                      <div className="menu-dropdown">
                        {notification.isRead ? (
                          <button onClick={(e) => handleAction(e, 'unread', notification)}>
                            Marcar como no leído
                          </button>
                        ) : (
                          <button onClick={(e) => handleAction(e, 'read', notification)}>
                            Marcar como leído
                          </button>
                        )}
                        <button onClick={(e) => handleAction(e, 'delete', notification)} className="text-danger">
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedNotification && (
        <NotificationDetailsModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </div>
  );
}

export default Home;

