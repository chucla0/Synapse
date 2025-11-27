import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../utils/api';
import NotificationDetailsModal from './NotificationDetailsModal';
import './Home.css';

function Home({ sessionKey }) {
  const { t } = useTranslation();
  const [selectedNotification, setSelectedNotification] = useState(null);

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', sessionKey],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    },
  });

  const notifications = notificationsData?.notifications || [];

  return (
    <div className="home-view">
      <div className="home-header">
        <h2>{t('homeTitle', 'Inicio')}</h2>
      </div>
      <div className="home-content">
        {isLoading ? (
          <p>{t('loading', 'Cargando...')}</p>
        ) : notifications.length === 0 ? (
          <p className="text-muted">{t('noNotifications', 'No tienes notificaciones nuevas.')}</p>
        ) : (
          <ul className="notification-list">
            {notifications.map((notification) => (
              <li 
                key={notification.id} 
                className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => setSelectedNotification(notification)}
              >
                <div className="notification-icon user-avatar">
                  {notification.sender.avatar ? (
                    <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${notification.sender.avatar}`} alt={notification.sender.name} />
                  ) : (
                    <div className="user-avatar-initials">
                      {notification.sender.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="notification-body">
                  <p className="notification-text">
                    <strong>{notification.sender.name}</strong> {t(`notification_type_${notification.type}`, notification.type)}
                  </p>
                  <p className="notification-date">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
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

