import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Settings, ChevronDown, Palette, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../utils/api';
import { clearAuth, getUser } from '../../utils/auth';
import CalendarView from '../../components/calendar/CalendarView';
import CreateAgendaModal from '../../components/agenda/CreateAgendaModal';
import ProfileSettingsModal from '../../components/settings/ProfileSettingsModal';
import AgendaSettingsModal from '../../components/agenda/AgendaSettingsModal';
import WebSettingsModal from '../../components/settings/WebSettingsModal';
import Home from '../Home/Home';
import './Dashboard.css';

const lngs = {
  en: { nativeName: 'English' },
  es: { nativeName: 'Español' },
  ca: { nativeName: 'Català' }
};

const typeOrder = {
  'PERSONAL': 1,
  'LABORAL': 2,
  'EDUCATIVA': 3,
  'SOCIAL': 4,
  'COLABORATIVA': 5,
};

function Dashboard({ onLogout, sessionKey }) {
  const { t, i18n } = useTranslation();
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [showCreateAgenda, setShowCreateAgenda] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showWebSettings, setShowWebSettings] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('name_asc'); // 'name_asc', 'name_desc', 'date_desc', 'date_asc'
  const [currentView, setCurrentView] = useState('agendas'); // 'home', 'agendas'
  const navigate = useNavigate();
  const user = getUser();
  const { updateSetting } = useSettings();

  const { accentColor } = useTheme();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const isAnyModalOpen = showCreateAgenda || showProfileSettings || showWebSettings || editingAgenda;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showLanguageDropdown) setShowLanguageDropdown(false);
      if (showSortDropdown) setShowSortDropdown(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showLanguageDropdown, showSortDropdown]);

  // Fetch agendas
  const { data: agendasData, isLoading: agendasLoading } = useQuery({
    queryKey: ['agendas', sessionKey],
    queryFn: async () => {
      const response = await api.get('/agendas');
      return response.data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const agendas = (agendasData?.agendas || []).reduce((acc, current) => {
    // Check if we already have a Google Calendar in the accumulator
    if (current.googleCalendarId || current.name === 'Google Calendar') {
      const hasGoogle = acc.find(a => a.googleCalendarId || a.name === 'Google Calendar');
      if (hasGoogle) return acc; // Skip duplicate

      // Force Green Color for Google Calendar
      return [...acc, { ...current, color: '#34A853' }];
    }
    return [...acc, current];
  }, []);

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', sessionKey],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 20000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Notification Delivery Logic
  const { settings } = useSettings();
  const [prevNotificationsCount, setPrevNotificationsCount] = useState(0);

  useEffect(() => {
    if (notificationsLoading) return;

    // Check if we have new notifications
    if (notifications.length > prevNotificationsCount) {
      // Get the latest notification (assuming sorted by date desc, or just take the first one if unread)
      // Since we don't have guaranteed sort here, let's assume the API returns sorted or we just check the difference.
      // For simplicity in polling, if count increases, we assume new notifications arrived.
      // We only alert if the NEWEST notification is unread and recent.

      // Ideally we would compare IDs, but for MVP polling:
      if (prevNotificationsCount > 0) { // Don't alert on initial load
        const latestNotification = notifications[0]; // Assuming API returns newest first

        if (latestNotification && !latestNotification.isRead) {
          const userStatus = user?.status || 'AVAILABLE';
          const browserNotifications = settings?.notifications?.browserNotifications ?? true;
          const soundEnabled = settings?.notifications?.soundEnabled ?? true;

          // Logic Table Implementation
          let shouldDeliver = false;

          if (userStatus === 'AVAILABLE') {
            if (browserNotifications) {
              shouldDeliver = true;
            }
          } else if (userStatus === 'BUSY' || userStatus === 'AWAY') {
            // Suppress
            shouldDeliver = false;
          }

          if (shouldDeliver) {
            // 1. Push Notification
            if (Notification.permission === 'granted') {
              new Notification('Synapse', {
                body: `${latestNotification.sender?.name || 'Synapse'}: ${t(`notification_type_${latestNotification.type}`)}`,
                icon: '/synapse_logo.jpg'
              });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission();
            }

            // 2. Sound
            if (soundEnabled) {
              const audio = new Audio('/sounds/notification.mp3'); // Ensure this file exists or use a default
              audio.play().catch(e => console.log('Audio play failed', e));
            }
          }
        }
      }
    }

    setPrevNotificationsCount(notifications.length);
  }, [notifications, notificationsLoading, prevNotificationsCount, user?.status, settings, t]);

  // Socket.io Notification Listener
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      console.log('New notification received:', notification);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleAgendaUpdate = (data) => {
      console.log('Agenda update received:', data);
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
    };

    const handleRoleUpdate = (data) => {
      console.log('Role update received:', data);
      const { agendaId, newRole } = data;

      // Optimistically update the cache
      queryClient.setQueryData(['agendas', sessionKey], (oldData) => {
        if (!oldData || !oldData.agendas) return oldData;
        return {
          ...oldData,
          agendas: oldData.agendas.map(a =>
            a.id === agendaId ? { ...a, userRole: newRole } : a
          )
        };
      });

      // Also invalidate to be safe
      queryClient.invalidateQueries({ queryKey: ['agendas'] });
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('agenda:updated', handleAgendaUpdate);
    socket.on('agenda:deleted', handleAgendaUpdate);
    socket.on('agenda:left', handleAgendaUpdate);
    socket.on('agenda:joined', handleAgendaUpdate);
    socket.on('agenda:user_removed', handleAgendaUpdate);
    socket.on('agenda:role_updated', handleRoleUpdate);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('agenda:updated', handleAgendaUpdate);
      socket.off('agenda:deleted', handleAgendaUpdate);
      socket.off('agenda:left', handleAgendaUpdate);
      socket.off('agenda:joined', handleAgendaUpdate);
      socket.off('agenda:user_removed', handleAgendaUpdate);
      socket.off('agenda:role_updated', handleRoleUpdate);
    };
  }, [socket, queryClient]);

  const ALL_EVENTS_AGENDA_ID = 'all_events';

  const allEventsAgenda = {
    id: ALL_EVENTS_AGENDA_ID,
    name: t('allEvents'),
    color: '#666666',
    type: 'VIRTUAL',
    ownerId: user?.id
  };

  // Select 'all_events' by default ONLY if there are agendas
  if (!selectedAgenda && agendas.length > 0) {
    setSelectedAgenda(ALL_EVENTS_AGENDA_ID);
  }

  const handleLogout = () => {
    clearAuth();
    onLogout();
    navigate('/login');
  };

  const filteredAgendas = agendas.filter(agenda =>
    agenda.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    switch (sortOrder) {
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'date_desc':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'date_asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'type':
        const typeA = typeOrder[a.type] || 99;
        const typeB = typeOrder[b.type] || 99;
        const typeCompare = typeA - typeB;
        return typeCompare !== 0 ? typeCompare : a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Group agendas by type if sortOrder is 'type'
  const groupedAgendas = sortOrder === 'type'
    ? filteredAgendas.reduce((acc, agenda) => {
      const type = agenda.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(agenda);
      return acc;
    }, {})
    : null;

  const currentAgenda = (agendas.length > 0 && selectedAgenda === ALL_EVENTS_AGENDA_ID)
    ? allEventsAgenda
    : agendas.find(a => a.id === selectedAgenda);

  return (
    <div className={`dashboard ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <img
            src="/synapse_logo.jpg"
            alt="Synapse"
            className="sidebar-logo"
          />
          <h2>Synapse</h2>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.avatar ? (
              <img
                src={user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.avatar}`}
                alt={user.name}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="user-avatar-initials">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-info">
            <p className="user-name">{user?.name}</p>
            <p className="user-email text-sm text-muted">{user?.email}</p>
          </div>
          <button
            className="btn-settings"
            onClick={() => setShowProfileSettings(true)}
            title={t('profileSettings')}
          >
            <Settings size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="main-nav-links">
            <button className={`nav-link ${currentView === 'home' ? 'active' : ''}`} onClick={() => setCurrentView('home')}>
              {t('homeTitle', 'Inicio')}
              {unreadCount > 0 && <span className="notification-badge-sidebar" style={{ backgroundColor: accentColor }}></span>}
            </button>
            <button className={`nav-link ${currentView === 'agendas' ? 'active' : ''}`} onClick={() => setCurrentView('agendas')}>
              {t('myAgendas')}
            </button>
          </div>

          {currentView === 'agendas' && (
            <div className="agenda-search-container">
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <div className="sort-dropdown-container">
                <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="dropdown-toggle"
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    style={{ borderColor: accentColor }}
                  >
                    {sortOrder === 'name_asc' && t('sortBy_name_asc')}
                    {sortOrder === 'name_desc' && t('sortBy_name_desc')}
                    {sortOrder === 'date_desc' && t('sortBy_date_desc')}
                    {sortOrder === 'date_asc' && t('sortBy_date_asc')}
                    {sortOrder === 'type' && t('sortBy_type')}
                    <span className="dropdown-arrow"><ChevronDown size={16} /></span>
                  </button>
                  {showSortDropdown && (
                    <ul className="dropdown-menu">
                      <li
                        className={`dropdown-item ${sortOrder === 'name_asc' ? 'active' : ''}`}
                        onClick={() => {
                          setSortOrder('name_asc');
                          setShowSortDropdown(false);
                        }}
                        style={sortOrder === 'name_asc' ? { backgroundColor: accentColor, color: 'white' } : {}}
                      >
                        {t('sortBy_name_asc')}
                      </li>
                      <li
                        className={`dropdown-item ${sortOrder === 'name_desc' ? 'active' : ''}`}
                        onClick={() => {
                          setSortOrder('name_desc');
                          setShowSortDropdown(false);
                        }}
                        style={sortOrder === 'name_desc' ? { backgroundColor: accentColor, color: 'white' } : {}}
                      >
                        {t('sortBy_name_desc')}
                      </li>
                      <li
                        className={`dropdown-item ${sortOrder === 'date_desc' ? 'active' : ''}`}
                        onClick={() => {
                          setSortOrder('date_desc');
                          setShowSortDropdown(false);
                        }}
                        style={sortOrder === 'date_desc' ? { backgroundColor: accentColor, color: 'white' } : {}}
                      >
                        {t('sortBy_date_desc')}
                      </li>
                      <li
                        className={`dropdown-item ${sortOrder === 'date_asc' ? 'active' : ''}`}
                        onClick={() => {
                          setSortOrder('date_asc');
                          setShowSortDropdown(false);
                        }}
                        style={sortOrder === 'date_asc' ? { backgroundColor: accentColor, color: 'white' } : {}}
                      >
                        {t('sortBy_date_asc')}
                      </li>
                      <li
                        className={`dropdown-item ${sortOrder === 'type' ? 'active' : ''}`}
                        onClick={() => {
                          setSortOrder('type');
                          setShowSortDropdown(false);
                        }}
                        style={sortOrder === 'type' ? { backgroundColor: accentColor, color: 'white' } : {}}
                      >
                        {t('sortBy_type')}
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </nav>

        {currentView === 'agendas' && (
          <div className="sidebar-scrollable-content">
            <ul className="agenda-list">
              {/* All Events Option */}
              {agendas.length > 0 && (
                <li className={`agenda-item ${selectedAgenda === ALL_EVENTS_AGENDA_ID ? 'active' : ''}`}>
                  <div className="agenda-item-main" onClick={() => setSelectedAgenda(ALL_EVENTS_AGENDA_ID)}>
                    <span
                      className="agenda-color"
                      style={{ backgroundColor: allEventsAgenda.color }}
                    />
                    <span className="agenda-name">{allEventsAgenda.name}</span>
                  </div>
                </li>
              )}

              {/* Pinned Google Calendar */}
              {agendas.find(a => a.googleCalendarId || a.name === 'Google Calendar') && (() => {
                const googleAgenda = agendas.find(a => a.googleCalendarId || a.name === 'Google Calendar');
                return (
                  <li className={`agenda-item ${selectedAgenda === googleAgenda.id ? 'active' : ''}`}>
                    <div className="agenda-item-main" onClick={() => setSelectedAgenda(googleAgenda.id)}>
                      <span
                        className="agenda-color"
                        style={{ backgroundColor: googleAgenda.color }}
                      />
                      <span className="agenda-name">{googleAgenda.name}</span>
                    </div>
                    <button
                      className="btn-agenda-settings"
                      onClick={() => setEditingAgenda(googleAgenda)}
                      title={t('agendaSettings')}
                    >
                      <Settings size={16} />
                    </button>
                  </li>
                );
              })()}
            </ul>

            {agendasLoading ? (
              <div className="loading-agendas">{t('loading')}</div>
            ) : filteredAgendas.filter(a => !a.googleCalendarId && a.name !== 'Google Calendar').length === 0 ? (
              <p className="text-sm text-muted">{t('noAgendasFound')}</p>
            ) : sortOrder === 'type' ? (
              Object.entries(
                filteredAgendas
                  .filter(a => !a.googleCalendarId && a.name !== 'Google Calendar')
                  .reduce((acc, agenda) => {
                    const type = agenda.type;
                    if (!acc[type]) acc[type] = [];
                    acc[type].push(agenda);
                    return acc;
                  }, {})
              ).map(([type, typeAgendas]) => (
                <div key={type} className="agenda-group">
                  <h4 className="agenda-group-title">{t(`agendaType_${type}`, type)}</h4>
                  <ul className="agenda-list">
                    {typeAgendas.map(agenda => (
                      <li key={agenda.id} className={`agenda-item ${selectedAgenda === agenda.id ? 'active' : ''}`}>
                        <div className="agenda-item-main" onClick={() => setSelectedAgenda(agenda.id)}>
                          <span
                            className="agenda-color"
                            style={{ backgroundColor: agenda.color }}
                          />
                          <span className="agenda-name">{agenda.name}</span>
                        </div>
                        <button
                          className="btn-agenda-settings"
                          onClick={() => setEditingAgenda(agenda)}
                          title={t('agendaSettings')}
                        >
                          <Settings size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <ul className="agenda-list">
                {filteredAgendas
                  .filter(a => !a.googleCalendarId && a.name !== 'Google Calendar')
                  .map(agenda => (
                    <li key={agenda.id} className={`agenda-item ${selectedAgenda === agenda.id ? 'active' : ''}`}>
                      <div className="agenda-item-main" onClick={() => setSelectedAgenda(agenda.id)}>
                        <span
                          className="agenda-color"
                          style={{ backgroundColor: agenda.color }}
                        />
                        <span className="agenda-name">{agenda.name}</span>
                      </div>
                      <button
                        className="btn-agenda-settings"
                        onClick={() => setEditingAgenda(agenda)}
                        title={t('agendaSettings')}
                      >
                        <Settings size={16} />
                      </button>
                    </li>
                  ))}
              </ul>
            )}

            <button
              className="btn btn-primary btn-block mt-2"
              onClick={() => setShowCreateAgenda(true)}
            >
              {t('newAgenda')}
            </button>
          </div>
        )}

        <div className="sidebar-footer">
          <div className="language-switcher">
            <div className="custom-dropdown" onClick={(e) => e.stopPropagation()}>
              <button
                className="dropdown-toggle"
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              >
                {lngs[i18n.resolvedLanguage]?.nativeName}
                <span className="dropdown-arrow"><ChevronDown size={16} /></span>
              </button>
              {showLanguageDropdown && (
                <ul className="dropdown-menu">
                  {Object.keys(lngs).map((lng) => (
                    <li
                      key={lng}
                      className={`dropdown-item dropdown-item-${lng} ${i18n.resolvedLanguage === lng ? 'active' : ''}`}
                      onClick={() => {
                        updateSetting('display', 'language', lng);
                        setShowLanguageDropdown(false);
                      }}
                    >
                      {lngs[lng].nativeName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-block"
            onClick={() => setShowWebSettings(true)}
            title={t('webSettingsTitle')}
          >
            <Settings size={18} style={{ marginRight: '8px' }} /> {t('webSettingsButton')}
          </button>
          <button
            className="btn btn-logout btn-block"
            onClick={handleLogout}
          >
            <LogOut size={18} style={{ marginRight: '8px' }} />
            {t('logout')}
          </button>
        </div>
      </aside>

      <button
        className="btn-sidebar-toggle"
        onClick={toggleSidebar}
        title={isSidebarOpen ? t('closeSidebar') : t('openSidebar')}
        disabled={isAnyModalOpen}
      >
        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Main Content */}
      <main className="main-content">
        {currentView === 'home' ? (
          <Home
            sessionKey={sessionKey}
            notifications={notifications}
            agendas={agendas}
            isLoading={notificationsLoading}
            refetch={refetchNotifications}
          />
        ) : currentAgenda ? (
          <CalendarView agenda={currentAgenda} agendas={agendas} />
        ) : (
          <div className="empty-state">
            <h2>{t('welcomeTitle')}</h2>
            <p className="text-muted">
              {t('welcomeSubtitle')}
            </p>
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreateAgenda && (
        <CreateAgendaModal
          onClose={() => setShowCreateAgenda(false)}
          existingAgendas={agendas}
        />
      )}
      {showProfileSettings && (
        <WebSettingsModal
          onClose={() => setShowProfileSettings(false)}
          initialTab="profile"
        />
      )}
      {showWebSettings && (
        <WebSettingsModal
          onClose={() => setShowWebSettings(false)}
          initialTab="display"
        />
      )}
      {editingAgenda && (
        <AgendaSettingsModal
          agenda={agendas.find(a => a.id === editingAgenda.id) || editingAgenda}
          onClose={() => setEditingAgenda(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
